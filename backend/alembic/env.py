"""
Alembic environment: sync engine (mysql+pymysql) so migrations run without the async stack.
Loads DATABASE_URL from backend/.env via config.settings.
"""
from __future__ import annotations

import ssl as ssl_lib
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import create_engine, pool

# Project root (directory containing main.py)
_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from config import settings  # noqa: E402
from database import Base  # noqa: E402

# Import ORM modules so every table is registered on Base.metadata (for autogenerate).
import models.tables  # noqa: F401, E402

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_sync_database_url() -> str:
    u = (settings.DATABASE_URL or "").strip()
    if not u:
        raise RuntimeError("DATABASE_URL is not set (check backend/.env)")
    if u.startswith("mysql+aiomysql"):
        return u.replace("mysql+aiomysql://", "mysql+pymysql://", 1)
    return u


def _connect_args() -> dict:
    args: dict = {"connect_timeout": 15}
    if settings.MYSQL_SSL_ENABLED and settings.DATABASE_URL:
        ctx = ssl_lib.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl_lib.CERT_NONE
        args["ssl"] = ctx
    return args


def run_migrations_offline() -> None:
    url = get_sync_database_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = create_engine(
        get_sync_database_url(),
        poolclass=pool.NullPool,
        connect_args=_connect_args(),
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
