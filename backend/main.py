import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from config import settings
from database import AsyncSessionLocal, Base, engine
from routers import auth, trainers, bookings, reviews, admin, misc
from services.admin_seed_service import ensure_default_admin

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Creating database tables…")

    async def _create_tables():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    try:
        await asyncio.wait_for(_create_tables(), timeout=45.0)
    except asyncio.TimeoutError:
        logger.error(
            "Database init timed out after 45s. Check DATABASE_URL, VPN, and MySQL "
            "firewall (DigitalOcean: Trusted Sources must include your current IP)."
        )
        raise RuntimeError("Database connection timed out") from None

    logger.info("Database ready.")
    async with AsyncSessionLocal() as session:
        try:
            await ensure_default_admin(session)
            await session.commit()
        except Exception:
            await session.rollback()
            logger.exception("Failed to ensure default admin user")

    yield
    await engine.dispose()
    logger.info("Database connection closed.")


limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

app = FastAPI(title="HourlyGym API", version="2.0.0", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(trainers.router)
app.include_router(bookings.router)
app.include_router(reviews.router)
app.include_router(admin.router)
app.include_router(misc.router)
