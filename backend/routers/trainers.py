from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import get_current_user
from models.tables import User
from schemas.trainer import TrainerIn, TrainerOut
from services import trainer_service

router = APIRouter(prefix="/api/trainers", tags=["trainers"])


@router.get("", response_model=List[TrainerOut])
async def list_trainers(
    city: Optional[str] = None,
    area: Optional[str] = None,
    specialty: Optional[str] = None,
    max_rate: Optional[float] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius_km: float = 20.0,
    db: AsyncSession = Depends(get_db),
):
    trainers = await trainer_service.list_trainers(
        db,
        city=city,
        area=area,
        specialty=specialty,
        max_rate=max_rate,
        lat=lat,
        lng=lng,
        radius_km=radius_km,
    )
    return [TrainerOut.model_validate(t) for t in trainers]


@router.get("/me", response_model=TrainerOut)
async def my_profile(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    t = await trainer_service.get_trainer_by_user(db, user.user_id)
    return TrainerOut.model_validate(t)


@router.post("", response_model=TrainerOut, status_code=201)
async def create_profile(
    body: TrainerIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    t = await trainer_service.create_trainer_profile(db, user.user_id, body)
    return TrainerOut.model_validate(t)


@router.get("/{trainer_id}/availability")
async def get_availability(trainer_id: str, date: str, db: AsyncSession = Depends(get_db)):
    return await trainer_service.get_trainer_availability(db, trainer_id, date)


@router.get("/{trainer_id}", response_model=TrainerOut)
async def get_trainer(trainer_id: str, db: AsyncSession = Depends(get_db)):
    t = await trainer_service.get_trainer_by_id(db, trainer_id)
    return TrainerOut.model_validate(t)
