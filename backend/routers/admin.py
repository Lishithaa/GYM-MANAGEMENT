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
    Complaint,
    PartnerRequest,
    PromoCode,
    Trainer,
    TrainerOnboarding,
    TrainerOnboardingStatusEnum,
    User,
)
from schemas.auth import AdminUserCreateIn
from schemas.common import PromoCodeIn, PromoCodeOut, PromoCodePatch
from schemas.platform import ComplaintStatusPatch, PartnerStatusPatch
from schemas.trainer import TrainerOut
from schemas.trainer_onboarding import AdminDecisionIn, TrainerOnboardingOut
from services import auth_service, trainer_onboarding_service, trainer_service, audit_service
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
                TrainerOnboarding.status.in_(
                    (
                        TrainerOnboardingStatusEnum.UNDER_REVIEW,
                        TrainerOnboardingStatusEnum.SUBMITTED,
                    )
                )
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
        await trainer_onboarding_service.approve_onboarding_for_trainer_if_pending(db, item_id)
        return {"message": "Approved successfully"}
    raise HTTPException(400, "Invalid item type")


@router.get("/trainers/pending", response_model=List[TrainerOut])
async def pending_trainers(db: AsyncSession = Depends(get_db), _: User = Depends(_admin)):
    result = await db.execute(select(Trainer).where(Trainer.approved == False, Trainer.rejected == False))
    trainers = list(result.scalars().all())
    names = await trainer_service.user_names_by_user_ids(db, [t.user_id for t in trainers])
    return [trainer_service.to_trainer_out(t, names.get(t.user_id)) for t in trainers]


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
            "is_banned": u.is_banned,
            "referral_code": u.referral_code,
            "created_at": u.created_at,
        }
        for u in users
    ]


@router.post("/users", status_code=201)
async def admin_create_user_route(
    body: AdminUserCreateIn,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_admin),
):
    user = await auth_service.admin_create_user(
        db, body.email, body.password, body.name, body.role, body.phone
    )
    await audit_service.record(db, "admin.user.created", admin.user_id, "user", user.user_id)
    return {"user_id": user.user_id, "email": user.email, "role": user.role.value}


@router.patch("/users/{user_id}/ban")
async def ban_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_admin),
):
    if user_id == admin.user_id:
        raise HTTPException(400, "Cannot ban yourself")
    res = await db.execute(select(User).where(User.user_id == user_id))
    u = res.scalar_one_or_none()
    if not u:
        raise HTTPException(404, "User not found")
    if u.role.value == "admin":
        raise HTTPException(400, "Cannot ban an admin account")
    u.is_banned = True
    await db.flush()
    await audit_service.record(db, "admin.user.banned", admin.user_id, "user", user_id)
    return {"message": "User banned", "user_id": user_id}


@router.patch("/users/{user_id}/unban")
async def unban_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_admin),
):
    res = await db.execute(select(User).where(User.user_id == user_id))
    u = res.scalar_one_or_none()
    if not u:
        raise HTTPException(404, "User not found")
    u.is_banned = False
    await db.flush()
    await audit_service.record(db, "admin.user.unbanned", admin.user_id, "user", user_id)
    return {"message": "User unbanned", "user_id": user_id}


@router.get("/trainers/manage")
async def list_trainers_for_admin(db: AsyncSession = Depends(get_db), _: User = Depends(_admin)):
    result = await db.execute(select(Trainer))
    rows = []
    for t in result.scalars().all():
        ures = await db.execute(select(User).where(User.user_id == t.user_id))
        u = ures.scalar_one_or_none()
        rows.append(
            {
                "trainer_id": t.trainer_id,
                "user_id": t.user_id,
                "email": u.email if u else "",
                "name": u.name if u else "",
                "approved": t.approved,
                "rejected": t.rejected,
                "is_banned": u.is_banned if u else False,
                "city": t.city,
                "specialty": t.specialty,
            }
        )
    return rows


@router.get("/partner-requests")
async def list_partner_requests(db: AsyncSession = Depends(get_db), _: User = Depends(_admin)):
    result = await db.execute(select(PartnerRequest).order_by(PartnerRequest.created_at.desc()).limit(200))
    prs = result.scalars().all()
    return [
        {
            "request_id": p.request_id,
            "organization_name": p.organization_name,
            "contact_name": p.contact_name,
            "email": p.email,
            "phone": p.phone,
            "message": p.message,
            "status": p.status,
            "admin_note": p.admin_note,
            "created_at": p.created_at,
        }
        for p in prs
    ]


@router.patch("/partner-requests/{request_id}")
async def update_partner_request(
    request_id: str,
    body: PartnerStatusPatch,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_admin),
):
    if body.status not in ("pending", "reviewed", "approved", "rejected"):
        raise HTTPException(422, "Invalid status")
    res = await db.execute(select(PartnerRequest).where(PartnerRequest.request_id == request_id))
    row = res.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Request not found")
    row.status = body.status
    if body.admin_note is not None:
        row.admin_note = body.admin_note
    await db.flush()
    await audit_service.record(db, "admin.partner_request.updated", admin.user_id, "partner_request", request_id)
    return {"message": "Updated", "request_id": request_id}


async def _complaint_names(db: AsyncSession, c: Complaint) -> dict:
    fu = (await db.execute(select(User).where(User.user_id == c.from_user_id))).scalar_one_or_none()
    au = (await db.execute(select(User).where(User.user_id == c.about_user_id))).scalar_one_or_none()
    return {
        "complaint_id": c.complaint_id,
        "from_user_id": c.from_user_id,
        "from_name": fu.name if fu else "",
        "from_email": fu.email if fu else "",
        "about_user_id": c.about_user_id,
        "about_name": au.name if au else "",
        "about_email": au.email if au else "",
        "subject": c.subject,
        "body": c.body,
        "status": c.status,
        "admin_resolution_note": c.admin_resolution_note,
        "created_at": c.created_at,
    }


@router.get("/complaints")
async def list_complaints(db: AsyncSession = Depends(get_db), _: User = Depends(_admin)):
    result = await db.execute(select(Complaint).order_by(Complaint.created_at.desc()).limit(300))
    complaints = list(result.scalars().all())
    out = []
    for c in complaints:
        out.append(await _complaint_names(db, c))
    return out


@router.patch("/complaints/{complaint_id}")
async def update_complaint(
    complaint_id: str,
    body: ComplaintStatusPatch,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_admin),
):
    if body.status not in ("open", "resolved", "dismissed"):
        raise HTTPException(422, "Invalid status")
    res = await db.execute(select(Complaint).where(Complaint.complaint_id == complaint_id))
    row = res.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Complaint not found")
    row.status = body.status
    if body.admin_resolution_note is not None:
        row.admin_resolution_note = body.admin_resolution_note
    await db.flush()
    await audit_service.record(db, "admin.complaint.updated", admin.user_id, "complaint", complaint_id)
    return {"message": "Updated", "complaint_id": complaint_id}


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
