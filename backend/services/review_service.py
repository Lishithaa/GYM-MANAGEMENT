from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.tables import Review, Trainer
from schemas.booking import ReviewIn


def _norm_target_type(s: str) -> str:
    return (s or "").strip().lower()


def _norm_target_id(s: str) -> str:
    return (s or "").strip()


async def sync_trainer_review_stats(db: AsyncSession, trainer_id: str) -> None:
    """Recompute trainers.rating and reviews_count from reviews (fixes stale denormalized columns)."""
    tid = _norm_target_id(trainer_id)
    if not tid:
        return
    stats = await db.execute(
        select(func.avg(Review.rating), func.count(Review.review_id)).where(
            Review.target_id == tid,
            func.lower(Review.target_type) == "trainer",
        )
    )
    avg_rating, count = stats.one()
    t_res = await db.execute(select(Trainer).where(Trainer.trainer_id == tid))
    trainer = t_res.scalar_one_or_none()
    if trainer:
        trainer.rating = round(float(avg_rating or 0), 2)
        trainer.reviews_count = int(count or 0)


async def create_review(db: AsyncSession, user_id: str, user_name: str, data: ReviewIn) -> Review:
    if not (1 <= data.rating <= 5):
        raise HTTPException(422, "Rating must be between 1 and 5")

    tt = _norm_target_type(data.target_type)
    tid = _norm_target_id(data.target_id)

    review = Review(
        user_id=user_id,
        user_name=user_name,
        target_id=tid,
        target_type=tt,
        rating=data.rating,
        comment=data.comment,
    )
    db.add(review)
    await db.flush()

    if tt == "trainer":
        await sync_trainer_review_stats(db, tid)

    return review


async def list_reviews(db: AsyncSession, target_type: str, target_id: str) -> list[Review]:
    tt = _norm_target_type(target_type)
    tid = _norm_target_id(target_id)
    result = await db.execute(
        select(Review)
        .where(func.lower(Review.target_type) == tt, Review.target_id == tid)
        .order_by(Review.created_at.desc())
    )
    return list(result.scalars().all())
