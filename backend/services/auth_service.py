from datetime import datetime, timezone, timedelta

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.tables import User, RefreshToken, UserRoleEnum
from utils.security import hash_password, verify_password
from utils.jwt_utils import create_access_token, create_refresh_token, create_verify_token


async def register_user(
    db: AsyncSession,
    email: str,
    password: str,
    name: str,
    role: str,
    phone: str | None = None,
) -> tuple[User, str]:
    if len(password) < 8:
        raise HTTPException(422, "Password must be at least 8 characters")
    if role not in ("user", "trainer"):
        raise HTTPException(403, "Only user and trainer can self-register; admin is provisioned by the system")

    existing = await db.execute(select(User).where(User.email == email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Email already registered")

    try:
        role_enum = UserRoleEnum(role)
    except ValueError:
        raise HTTPException(422, "Invalid role")

    user = User(
        email=email.lower(),
        password_hash=hash_password(password),
        name=name,
        phone=phone,
        role=role_enum,
        is_verified=False,
    )
    db.add(user)
    await db.flush()

    token = create_verify_token(user.user_id, email.lower())
    return user, token


async def verify_email(db: AsyncSession, user_id: str) -> None:
    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    user.is_verified = True


async def login_user(db: AsyncSession, email: str, password: str) -> tuple[User, str, str]:
    result = await db.execute(select(User).where(User.email == email.lower()))
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")
    if not user.is_verified:
        raise HTTPException(403, "Please verify your email before logging in")

    access = create_access_token(user.user_id, user.role.value)
    refresh = create_refresh_token(user.user_id)

    db.add(
        RefreshToken(
            token=refresh,
            user_id=user.user_id,
            expires_at=datetime.now(timezone.utc)
            + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
    )
    return user, access, refresh


async def rotate_access_token(db: AsyncSession, refresh_token: str, user_id: str) -> str:
    rt = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token == refresh_token,
            RefreshToken.user_id == user_id,
        )
    )
    if not rt.scalar_one_or_none():
        raise HTTPException(401, "Refresh token revoked or not found")

    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")

    return create_access_token(user_id, user.role.value)


async def revoke_refresh_token(db: AsyncSession, refresh_token: str) -> None:
    result = await db.execute(select(RefreshToken).where(RefreshToken.token == refresh_token))
    rt = result.scalar_one_or_none()
    if rt:
        await db.delete(rt)
