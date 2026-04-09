from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from config import settings
from db_url import normalize_async_database_url


def _build_engine():
    url, connect_args = normalize_async_database_url(settings.DATABASE_URL)
    kwargs: dict = {
        "pool_pre_ping": True,
        "pool_size": 10,
        "max_overflow": 20,
        "echo": False,
        "pool_timeout": 30,
        "connect_args": connect_args,
    }
    return create_async_engine(url, **kwargs)


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
