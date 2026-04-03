from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.tables import Review, Trainer
from schemas.booking import ReviewIn


async def create_review(db: AsyncSession, user_id: str, user_name: str, data: ReviewIn) -> Review:
    if not (1 <= data.rating <= 5):
        raise HTTPException(422, "Rating must be between 1 and 5")

    review = Review(
        user_id=user_id,
        user_name=user_name,
        target_id=data.target_id,
        target_type=data.target_type,
        rating=data.rating,
        comment=data.comment,
    )
    db.add(review)
    await db.flush()

    if data.target_type == "trainer":
        stats = await db.execute(
            select(func.avg(Review.rating), func.count(Review.review_id)).where(
                Review.target_id == data.target_id
            )
        )
        avg_rating, count = stats.one()
        t_res = await db.execute(select(Trainer).where(Trainer.trainer_id == data.target_id))
        trainer = t_res.scalar_one_or_none()
        if trainer:
            trainer.rating = round(float(avg_rating or 0), 2)
            trainer.reviews_count = count

    return review


async def list_reviews(db: AsyncSession, target_type: str, target_id: str) -> list[Review]:
    result = await db.execute(
        select(Review)
        .where(Review.target_type == target_type, Review.target_id == target_id)
        .order_by(Review.created_at.desc())
    )
    return list(result.scalars().all())
