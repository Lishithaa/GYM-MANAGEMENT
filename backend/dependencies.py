from typing import Optional
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models.tables import User
from utils.jwt_utils import decode_token

_security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_security),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials if credentials else None
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Please verify your email first")
    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_security),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    try:
        return await get_current_user(credentials, db)
    except Exception:
        return None


def require_roles(*roles: str):
    async def _check(user: User = Depends(get_current_user)) -> User:
        if user.role.value not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user

    return _check
