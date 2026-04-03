from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import require_roles
from models.tables import AuditLog, Booking, BookingStatusEnum, Trainer, User
from schemas.trainer import TrainerOut
from schemas.trainer_onboarding import AdminDecisionIn, TrainerOnboardingOut
from services import trainer_onboarding_service, trainer_service, audit_service
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


@router.get("/trainers/onboarding/pending", response_model=List[TrainerOnboardingOut])
async def pending_onboarding_reviews(db: AsyncSession = Depends(get_db), _: User = Depends(_admin)):
    onboardings = await trainer_onboarding_service.list_pending_onboardings(db)
    return [
        TrainerOnboardingOut.model_validate(trainer_onboarding_service.mask_onboarding_sensitive(o))
        for o in onboardings
    ]


@router.post("/trainers/onboarding/{onboarding_id}/approve", response_model=TrainerOnboardingOut)
async def approve_onboarding(
    onboarding_id: str,
    body: AdminDecisionIn,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_admin),
):
    o = await trainer_onboarding_service.admin_decide(
        db, onboarding_id, admin.user_id, action="approve", reason=body.reason
    )
    await audit_service.record(
        db,
        "trainer.onboarding.approved",
        admin.user_id,
        "trainer_onboarding",
        onboarding_id,
        meta={"reason": body.reason},
    )
    return TrainerOnboardingOut.model_validate(trainer_onboarding_service.mask_onboarding_sensitive(o))


@router.post("/trainers/onboarding/{onboarding_id}/reject", response_model=TrainerOnboardingOut)
async def reject_onboarding(
    onboarding_id: str,
    body: AdminDecisionIn,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_admin),
):
    o = await trainer_onboarding_service.admin_decide(
        db, onboarding_id, admin.user_id, action="reject", reason=body.reason
    )
    await audit_service.record(
        db,
        "trainer.onboarding.rejected",
        admin.user_id,
        "trainer_onboarding",
        onboarding_id,
        meta={"reason": body.reason},
    )
    return TrainerOnboardingOut.model_validate(trainer_onboarding_service.mask_onboarding_sensitive(o))


@router.post("/trainers/onboarding/{onboarding_id}/rework", response_model=TrainerOnboardingOut)
async def request_rework_onboarding(
    onboarding_id: str,
    body: AdminDecisionIn,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_admin),
):
    o = await trainer_onboarding_service.admin_decide(
        db, onboarding_id, admin.user_id, action="rework", reason=body.reason
    )
    await audit_service.record(
        db,
        "trainer.onboarding.rework_required",
        admin.user_id,
        "trainer_onboarding",
        onboarding_id,
        meta={"reason": body.reason},
    )
    return TrainerOnboardingOut.model_validate(trainer_onboarding_service.mask_onboarding_sensitive(o))


@router.post("/trainers/{trainer_id}/approve")
async def approve_trainer(
    trainer_id: str,
    body: Optional[AdminDecisionIn] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_admin),
):
    onboarding = await trainer_onboarding_service.get_latest_onboarding_for_trainer(db, trainer_id)
    await trainer_onboarding_service.admin_decide(
        db,
        onboarding.onboarding_id,
        admin.user_id,
        action="approve",
        reason=(body.reason if body else "Approved by admin"),
    )
    return {"message": "Trainer approved", "trainer_id": trainer_id}


@router.post("/trainers/{trainer_id}/reject")
async def reject_trainer(
    trainer_id: str,
    body: Optional[AdminDecisionIn] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_admin),
):
    onboarding = await trainer_onboarding_service.get_latest_onboarding_for_trainer(db, trainer_id)
    await trainer_onboarding_service.admin_decide(
        db,
        onboarding.onboarding_id,
        admin.user_id,
        action="reject",
        reason=(body.reason if body else "Rejected by admin"),
    )
    return {"message": "Trainer rejected", "trainer_id": trainer_id}


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
