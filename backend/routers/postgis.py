from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from schemas.locality import ApartmentOut
from services.locality_service import get_opted_trainers_for_apartment, list_apartments
from services import trainer_service

router = APIRouter(prefix="/api/postgis", tags=["postgis"])


@router.get("/apartments", response_model=List[ApartmentOut])
async def postgis_apartments(limit: int = Query(default=50, ge=1, le=200), db: AsyncSession = Depends(get_db)):
    rows = await list_apartments(db, limit=limit)
    return [ApartmentOut.model_validate(r) for r in rows]


@router.get("/apartments/{apartment_id}/trainers")
async def postgis_trainers(apartment_id: str, db: AsyncSession = Depends(get_db)):
    trainers = await get_opted_trainers_for_apartment(db, apartment_id)
    names = await trainer_service.user_names_by_user_ids(db, [t.user_id for t in trainers])
    return [trainer_service.to_trainer_out(t, names.get(t.user_id)).model_dump() for t in trainers]
