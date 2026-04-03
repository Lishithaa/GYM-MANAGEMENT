"""
Ensures the default HourlyGym admin account exists (dev / first-run convenience).

Security: rotate credentials in production; do not expose this account publicly.
"""
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.tables import User, UserRoleEnum
from utils.security import hash_password

logger = logging.getLogger(__name__)

DEFAULT_ADMIN_EMAIL = "hourly@admin.com"
DEFAULT_ADMIN_PASSWORD = "Admin@123"
DEFAULT_ADMIN_NAME = "Hourly Admin"


async def ensure_default_admin(db: AsyncSession) -> None:
    email = DEFAULT_ADMIN_EMAIL.lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    pw_hash = hash_password(DEFAULT_ADMIN_PASSWORD)

    if not user:
        db.add(
            User(
                email=email,
                password_hash=pw_hash,
                name=DEFAULT_ADMIN_NAME,
                role=UserRoleEnum.ADMIN,
                is_verified=True,
            )
        )
        logger.info("Created default admin user %s", email)
        return

    user.role = UserRoleEnum.ADMIN
    user.is_verified = True
    user.password_hash = pw_hash
    user.name = DEFAULT_ADMIN_NAME
    logger.info("Synced default admin user %s (role, verified, password)", email)
