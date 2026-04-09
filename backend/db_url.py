"""
Normalize DATABASE_URL for SQLAlchemy 2 async engines (DigitalOcean, etc.).
"""
from __future__ import annotations

import ssl as ssl_lib
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from config import settings


def normalize_async_database_url(raw: str) -> tuple[str, dict]:
    """
    Returns (sqlalchemy_url, connect_args) for create_async_engine.

    Supports:
    - PostgreSQL: postgresql://, postgres:// → postgresql+asyncpg://
    - MySQL: mysql://, mysql+aiomysql://
    """
    url = (raw or "").strip()
    if not url:
        raise RuntimeError(
            "DATABASE_URL is empty or not set. "
            "In DigitalOcean App Platform: Settings → your Web Service → Environment Variables → "
            "add DATABASE_URL (Runtime). Use your Managed Database connection string; "
            "postgresql:// and mysql+aiomysql:// are both accepted."
        )

    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]

    # --- PostgreSQL (DigitalOcean Managed Postgres uses postgresql://...?sslmode=require)
    if url.startswith("postgresql+asyncpg://"):
        pg_url, connect_args = _prepare_postgres_url(url)
        return pg_url, connect_args

    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        pg_url, connect_args = _prepare_postgres_url(url)
        return pg_url, connect_args

    # --- MySQL (existing app default)
    if url.startswith("mysql+aiomysql://"):
        return _mysql_url(url)

    if url.startswith("mysql://"):
        url = url.replace("mysql://", "mysql+aiomysql://", 1)
        return _mysql_url(url)

    raise RuntimeError(
        "Unsupported DATABASE_URL. Use a postgresql:// or postgres:// URL (Managed Postgres), "
        "or mysql+aiomysql:// / mysql:// (Managed MySQL). "
        f"Got scheme: {url.split(':', 1)[0]}"
    )


def _prepare_postgres_url(url: str) -> tuple[str, dict]:
    parsed = urlparse(url)
    pairs = parse_qsl(parsed.query, keep_blank_values=True)
    sslmode_val: str | None = None
    keep: list[tuple[str, str]] = []
    for k, v in pairs:
        if k.lower() == "sslmode":
            sslmode_val = (v or "").lower() or None
        else:
            keep.append((k, v))

    connect_args: dict = {"timeout": 60}

    if sslmode_val in ("require", "verify-ca", "verify-full", "allow"):
        connect_args["ssl"] = ssl_lib.create_default_context()
    elif sslmode_val == "disable":
        connect_args["ssl"] = False
    elif _truthy_env("DATABASE_SSL"):
        connect_args["ssl"] = ssl_lib.create_default_context()

    new_query = urlencode(keep) if keep else ""
    clean = urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, new_query, parsed.fragment))
    return clean, connect_args


def _mysql_url(url: str) -> tuple[str, dict]:
    connect_args: dict = {"connect_timeout": 15}
    if settings.MYSQL_SSL_ENABLED:
        ctx = ssl_lib.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl_lib.CERT_NONE
        connect_args["ssl"] = ctx
    return url, connect_args


def _truthy_env(name: str) -> bool:
    return __import__("os").environ.get(name, "").strip().lower() in ("1", "true", "yes", "on")
