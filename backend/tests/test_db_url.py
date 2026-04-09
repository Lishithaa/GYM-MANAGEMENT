import pytest

from db_url import normalize_async_database_url


def test_empty_database_url_raises_clear_error():
    with pytest.raises(RuntimeError, match="DATABASE_URL"):
        normalize_async_database_url("")


def test_postgres_to_asyncpg_strips_sslmode():
    url, connect_args = normalize_async_database_url(
        "postgresql://user:pass@db.example.com:25060/defaultdb?sslmode=require"
    )
    assert url.startswith("postgresql+asyncpg://")
    assert "sslmode" not in url
    assert "ssl" in connect_args


def test_postgres_url_already_asyncpg():
    url, _ = normalize_async_database_url("postgresql+asyncpg://user:pass@h:5432/db")
    assert url.startswith("postgresql+asyncpg://")


def test_postgres_accepts_postgres_scheme():
    url, _ = normalize_async_database_url("postgres://user:pass@h:5432/db")
    assert url.startswith("postgresql+asyncpg://")


def test_mysql_adds_aiomysql_driver(monkeypatch):
    monkeypatch.setattr("db_url.settings.MYSQL_SSL_ENABLED", False)
    url, args = normalize_async_database_url("mysql://user:pass@h:3306/db")
    assert url.startswith("mysql+aiomysql://")
    assert args.get("connect_timeout") == 15
