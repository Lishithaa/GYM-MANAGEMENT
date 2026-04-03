from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import require_roles
from models.tables import AuditLog, Booking, BookingStatusEnum, Trainer, User
from schemas.trainer import TrainerOut
from services import trainer_service
from routers.misc import CITIES_AREAS

router = APIRouter(prefix="/api/admin", tags=["admin"])

_admin = require_roles("admin")


@router.get("/pending-approvals")
async def pending_approvals_legacy(db: AsyncSession = Depends(get_db), _: User = Depends(_admin)):
    """Shape expected by older AdminDashboard (`gyms` + `trainers`)."""
    result = await db.execute(select(Trainer).where(Trainer.approved == False, Trainer.rejected == False))
    trainers = []
    for t in result.scalars().all():
        trainers.append(
            {
                "trainer_id": t.trainer_id,
                "user_id": t.user_id,
                "specialty": t.specialty,
                "hourly_rate": float(t.hourly_rate),
                "bio": t.bio or "",
                "city": t.city,
                "area": t.area,
            }
        )
    return {"gyms": [], "trainers": trainers}


@router.post("/approve/{item_type}/{item_id}")
async def approve_legacy(item_type: str, item_id: str, db: AsyncSession = Depends(get_db), _: User = Depends(_admin)):
    if item_type == "gym":
        return {"message": "Gym approvals are not used in the MySQL app (no gyms table)."}
    if item_type == "trainer":
        await trainer_service.approve_trainer(db, item_id)
        return {"message": "Approved successfully"}
    raise HTTPException(400, "Invalid item type")


@router.get("/trainers/pending", response_model=List[TrainerOut])
async def pending_trainers(db: AsyncSession = Depends(get_db), _: User = Depends(_admin)):
    result = await db.execute(select(Trainer).where(Trainer.approved == False, Trainer.rejected == False))
    return [TrainerOut.model_validate(t) for t in result.scalars().all()]


@router.post("/trainers/{trainer_id}/approve")
async def approve_trainer(trainer_id: str, db: AsyncSession = Depends(get_db), _: User = Depends(_admin)):
    t = await trainer_service.approve_trainer(db, trainer_id)
    return {"message": "Trainer approved", "trainer_id": t.trainer_id}


@router.post("/trainers/{trainer_id}/reject")
async def reject_trainer(trainer_id: str, db: AsyncSession = Depends(get_db), _: User = Depends(_admin)):
    t = await trainer_service.reject_trainer(db, trainer_id)
    return {"message": "Trainer rejected", "trainer_id": t.trainer_id}


@router.get("/stats")
async def platform_stats(db: AsyncSession = Depends(get_db), _: User = Depends(_admin)):
    total_users = (await db.execute(select(func.count(User.id)))).scalar()
    total_trainers_all = (await db.execute(select(func.count(Trainer.id)))).scalar()
    approved_trainers = (
        await db.execute(select(func.count(Trainer.id)).where(Trainer.approved == True))
    ).scalar()
    total_bookings = (await db.execute(select(func.count(Booking.id)))).scalar()
    completed_b = (
        await db.execute(select(func.count(Booking.id)).where(Booking.status == BookingStatusEnum.COMPLETED))
    ).scalar()

    city_stats = []
    for city in CITIES_AREAS.keys():
        gyms = (
            await db.execute(
                select(func.count(Trainer.id)).where(Trainer.city == city, Trainer.approved == True)
            )
        ).scalar()
        city_stats.append({"city": city, "gyms": gyms or 0, "bookings": total_bookings or 0})

    return {
        "total_users": total_users,
        "total_trainers": total_trainers_all,
        "total_bookings": total_bookings,
        "completed": completed_b,
        "total_gyms": 0,
        "city_stats": city_stats,
        "approved_trainers": approved_trainers,
    }


@router.get("/users")
async def list_users(db: AsyncSession = Depends(get_db), _: User = Depends(_admin)):
    result = await db.execute(select(User).order_by(User.created_at.desc()).limit(200))
    users = result.scalars().all()
    return [
        {
            "user_id": u.user_id,
            "email": u.email,
            "name": u.name,
            "role": u.role.value,
            "is_verified": u.is_verified,
            "created_at": u.created_at,
        }
        for u in users
    ]


@router.get("/audit-logs")
async def audit_logs(limit: int = 100, db: AsyncSession = Depends(get_db), _: User = Depends(_admin)):
    result = await db.execute(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit))
    logs = result.scalars().all()
    return [
        {
            "log_id": l.log_id,
            "action": l.action,
            "user_id": l.user_id,
            "resource_type": l.resource_type,
            "resource_id": l.resource_id,
            "meta": l.meta,
            "created_at": l.created_at,
        }
        for l in logs
    ]
