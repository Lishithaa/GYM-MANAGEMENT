from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import require_roles
from models.tables import (
    AuditLog,
    Booking,
    BookingStatusEnum,
    PromoCode,
    Trainer,
    TrainerOnboarding,
    TrainerOnboardingStatusEnum,
    User,
)
from schemas.common import PromoCodeIn, PromoCodeOut, PromoCodePatch
from schemas.trainer import TrainerOut
from schemas.trainer_onboarding import AdminDecisionIn, TrainerOnboardingOut
from services import trainer_onboarding_service, trainer_service, audit_service
from routers.misc import CITIES_AREAS

router = APIRouter(prefix="/api/admin", tags=["admin"])

_admin = require_roles("admin")


def _utc_day_start() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


@router.get("/dashboard")
async def admin_dashboard(db: AsyncSession = Depends(get_db), _: User = Depends(_admin)):
    start = _utc_day_start()
    sessions_completed_today = (
        await db.execute(
            select(func.count(Booking.id)).where(
                Booking.status == BookingStatusEnum.COMPLETED,
                Booking.completed_at.isnot(None),
                Booking.completed_at >= start,
            )
        )
    ).scalar() or 0

    pending_onboarding = (
        await db.execute(
            select(func.count(TrainerOnboarding.id)).where(
                TrainerOnboarding.status == TrainerOnboardingStatusEnum.UNDER_REVIEW
            )
        )
    ).scalar() or 0

    approved_trainers = (
        await db.execute(select(func.count(Trainer.id)).where(Trainer.approved == True))
    ).scalar() or 0

    trainers_created_today = (
        await db.execute(
            select(func.count(Trainer.id)).where(Trainer.created_at >= start)
        )
    ).scalar() or 0

    onboarding_approved_today = (
        await db.execute(
            select(func.count(TrainerOnboarding.id)).where(
                TrainerOnboarding.status == TrainerOnboardingStatusEnum.APPROVED,
                TrainerOnboarding.reviewed_at.isnot(None),
                TrainerOnboarding.reviewed_at >= start,
            )
        )
    ).scalar() or 0

    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    total_bookings = (await db.execute(select(func.count(Booking.id)))).scalar() or 0
    completed_all = (
        await db.execute(
            select(func.count(Booking.id)).where(Booking.status == BookingStatusEnum.COMPLETED)
        )
    ).scalar() or 0

    return {
        "sessions_completed_today": sessions_completed_today,
        "pending_onboarding_reviews": pending_onboarding,
        "active_approved_trainers": approved_trainers,
        "trainers_profile_created_today": trainers_created_today,
        "onboarding_approved_today": onboarding_approved_today,
        "total_users": total_users,
        "total_bookings": total_bookings,
        "bookings_completed_all_time": completed_all,
    }


@router.get("/stats/by-city")
async def stats_by_city(db: AsyncSession = Depends(get_db), _: User = Depends(_admin)):
    start = _utc_day_start()
    db_cities = (await db.execute(select(Trainer.city).distinct())).scalars().all()
    cities = sorted(set(CITIES_AREAS.keys()) | {c for c in db_cities if c})
    rows = []
    for city in cities:
        total_trainers = (
            await db.execute(select(func.count(Trainer.id)).where(Trainer.city == city))
        ).scalar() or 0
        approved_trainers = (
            await db.execute(
                select(func.count(Trainer.id)).where(Trainer.city == city, Trainer.approved == True)
            )
        ).scalar() or 0
        tid_sub = select(Trainer.trainer_id).where(Trainer.city == city)
        bookings = (
            await db.execute(
                select(func.count(Booking.id)).where(
                    Booking.target_type == "trainer",
                    Booking.target_id.in_(tid_sub),
                )
            )
        ).scalar() or 0
        sessions_today = (
            await db.execute(
                select(func.count(Booking.id)).where(
                    Booking.status == BookingStatusEnum.COMPLETED,
                    Booking.completed_at.isnot(None),
                    Booking.completed_at >= start,
                    Booking.target_type == "trainer",
                    Booking.target_id.in_(tid_sub),
                )
            )
        ).scalar() or 0
        rows.append(
            {
                "city": city,
                "total_trainers": total_trainers,
                "approved_trainers": approved_trainers,
                "bookings": bookings,
                "sessions_completed_today": sessions_today,
            }
        )
    return rows


@router.get("/promos", response_model=List[PromoCodeOut])
async def list_promos(db: AsyncSession = Depends(get_db), _: User = Depends(_admin)):
    result = await db.execute(select(PromoCode).order_by(PromoCode.created_at.desc()))
    return [PromoCodeOut.model_validate(p) for p in result.scalars().all()]


@router.post("/promos", response_model=PromoCodeOut)
async def create_promo(
    body: PromoCodeIn,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_admin),
):
    code = body.code.strip().upper()
    existing = await db.execute(select(PromoCode).where(PromoCode.code == code))
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Promo code already exists")
    row = PromoCode(
        code=code,
        discount_percent=body.discount_percent,
        max_uses=body.max_uses,
        uses=0,
        valid_until=body.valid_until.strip(),
    )
    db.add(row)
    await db.flush()
    return PromoCodeOut.model_validate(row)


@router.patch("/promos/{code}", response_model=PromoCodeOut)
async def update_promo(
    code: str,
    body: PromoCodePatch,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_admin),
):
    key = code.strip().upper()
    result = await db.execute(select(PromoCode).where(PromoCode.code == key))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Promo not found")
    if body.discount_percent is not None:
        row.discount_percent = body.discount_percent
    if body.max_uses is not None:
        row.max_uses = body.max_uses
    if body.valid_until is not None:
        row.valid_until = body.valid_until.strip()
    await db.flush()
    return PromoCodeOut.model_validate(row)


@router.delete("/promos/{code}")
async def delete_promo(code: str, db: AsyncSession = Depends(get_db), _: User = Depends(_admin)):
    key = code.strip().upper()
    result = await db.execute(select(PromoCode).where(PromoCode.code == key))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Promo not found")
    await db.delete(row)
    return {"message": "Deleted", "code": key}


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
        approved_in_city = (
            await db.execute(
                select(func.count(Trainer.id)).where(Trainer.city == city, Trainer.approved == True)
            )
        ).scalar() or 0
        tid_sub = select(Trainer.trainer_id).where(Trainer.city == city)
        bookings_in_city = (
            await db.execute(
                select(func.count(Booking.id)).where(
                    Booking.target_type == "trainer",
                    Booking.target_id.in_(tid_sub),
                )
            )
        ).scalar() or 0
        city_stats.append(
            {"city": city, "gyms": approved_in_city, "bookings": bookings_in_city, "trainers": approved_in_city}
        )

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
