import secrets
from datetime import datetime, timezone, timedelta

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.tables import User, RefreshToken, UserRoleEnum
from utils.security import hash_password, verify_password
from utils.jwt_utils import create_access_token, create_refresh_token, create_verify_token


async def _unique_referral_code(db: AsyncSession) -> str:
    for _ in range(40):
        code = "HG" + secrets.token_hex(3).upper()
        existing = await db.execute(select(User).where(User.referral_code == code))
        if not existing.scalar_one_or_none():
            return code
    raise HTTPException(500, "Could not generate referral code")


async def ensure_referral_code(db: AsyncSession, user: User) -> None:
    if user.referral_code:
        return
    user.referral_code = await _unique_referral_code(db)
    await db.flush()


async def count_referrals(db: AsyncSession, user_id: str) -> int:
    result = await db.execute(select(func.count(User.id)).where(User.referred_by_user_id == user_id))
    return int(result.scalar() or 0)


async def register_user(
    db: AsyncSession,
    email: str,
    password: str,
    name: str,
    role: str,
    phone: str | None = None,
    referral_code: str | None = None,
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

    referred_by_user_id = None
    if referral_code:
        rc = referral_code.strip().upper()
        ref_res = await db.execute(select(User).where(User.referral_code == rc))
        ref_user = ref_res.scalar_one_or_none()
        if ref_user:
            referred_by_user_id = ref_user.user_id

    user = User(
        email=email.lower(),
        password_hash=hash_password(password),
        name=name,
        phone=phone,
        role=role_enum,
        is_verified=False,
        referred_by_user_id=referred_by_user_id,
    )
    db.add(user)
    await db.flush()
    await ensure_referral_code(db, user)

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
    if user.is_banned:
        raise HTTPException(403, "Your account has been suspended")
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
    if user.is_banned:
        raise HTTPException(403, "Account suspended")

    return create_access_token(user_id, user.role.value)


async def revoke_refresh_token(db: AsyncSession, refresh_token: str) -> None:
    result = await db.execute(select(RefreshToken).where(RefreshToken.token == refresh_token))
    rt = result.scalar_one_or_none()
    if rt:
        await db.delete(rt)


async def admin_create_user(
    db: AsyncSession,
    email: str,
    password: str,
    name: str,
    role: str,
    phone: str | None = None,
) -> User:
    if len(password) < 8:
        raise HTTPException(422, "Password must be at least 8 characters")
    try:
        role_enum = UserRoleEnum(role)
    except ValueError:
        raise HTTPException(422, "Invalid role")

    existing = await db.execute(select(User).where(User.email == email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Email already registered")

    user = User(
        email=email.lower(),
        password_hash=hash_password(password),
        name=name,
        phone=phone,
        role=role_enum,
        is_verified=True,
    )
    db.add(user)
    await db.flush()
    await ensure_referral_code(db, user)
    return user
