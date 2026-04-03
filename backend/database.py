import ssl as ssl_lib
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from config import settings


def _build_engine():
    kwargs: dict = {
        "pool_pre_ping": True,
        "pool_size": 10,
        "max_overflow": 20,
        "echo": False,
    }
    if settings.MYSQL_SSL_ENABLED and settings.DATABASE_URL:
        ctx = ssl_lib.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl_lib.CERT_NONE
        kwargs["connect_args"] = {"ssl": ctx}
    return create_async_engine(settings.DATABASE_URL, **kwargs)


engine = _build_engine()

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
