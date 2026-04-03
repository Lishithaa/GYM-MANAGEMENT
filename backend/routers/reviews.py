from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import get_current_user
from models.tables import User
from schemas.booking import ReviewIn, ReviewOut
from services import review_service

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


@router.post("", response_model=ReviewOut, status_code=201)
async def create_review(
    body: ReviewIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    review = await review_service.create_review(db, user.user_id, user.name, body)
    return ReviewOut.model_validate(review)


@router.get("")
async def list_reviews_query(target_type: str, target_id: str, db: AsyncSession = Depends(get_db)):
    reviews = await review_service.list_reviews(db, target_type, target_id)
    return [ReviewOut.model_validate(r) for r in reviews]


@router.get("/{target_type}/{target_id}", response_model=List[ReviewOut])
async def list_reviews_path(target_type: str, target_id: str, db: AsyncSession = Depends(get_db)):
    reviews = await review_service.list_reviews(db, target_type, target_id)
    return [ReviewOut.model_validate(r) for r in reviews]
