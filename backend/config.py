import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")


class Settings:
    DATABASE_URL: str       = os.environ.get("DATABASE_URL", "")
    MYSQL_SSL_ENABLED: bool = os.environ.get("MYSQL_SSL_ENABLED", "true").lower() == "true"

    JWT_SECRET: str         = os.environ.get("JWT_SECRET", "change_me_in_production")
    JWT_ALGORITHM: str      = os.environ.get("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
    REFRESH_TOKEN_EXPIRE_DAYS: int   = int(os.environ.get("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

    SENDGRID_API_KEY: str   = os.environ.get("SENDGRID_API_KEY", "")
    SENDGRID_FROM_EMAIL: str = os.environ.get("SENDGRID_FROM_EMAIL", "noreply@hourlygym.com")

    RAZORPAY_KEY_ID: str    = os.environ.get("RAZORPAY_KEY_ID", "")
    RAZORPAY_KEY_SECRET: str = os.environ.get("RAZORPAY_KEY_SECRET", "")

    FRONTEND_URL: str       = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    PUBLIC_BACKEND_URL: str = os.environ.get("PUBLIC_BACKEND_URL", "http://127.0.0.1:8000").rstrip("/")
    CORS_ORIGINS: list      = [o.strip() for o in os.environ.get(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:3001,http://localhost:3002,"
        "http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:3002",
    ).split(",") if o.strip()]


settings = Settings()
