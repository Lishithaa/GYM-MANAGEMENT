from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import case, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.tables import (
    Trainer,
    TrainerDocument,
    TrainerOnboarding,
    TrainerOnboardingStatusEnum,
    TrainerVerificationEvent,
    User,
    UserRoleEnum,
)
from schemas.trainer import TrainerIn
from schemas.trainer_onboarding import OnboardingStepPatchIn
from services import trainer_service


def _mask_number(value: str, unmasked_suffix: int = 4) -> str:
    if not value:
        return value
    if len(value) <= unmasked_suffix:
        return "*" * len(value)
    return "*" * (len(value) - unmasked_suffix) + value[-unmasked_suffix:]


def _masked_section_copy(section: dict | None) -> dict:
    section = dict(section or {})
    if section.get("aadhar_number"):
        section["aadhar_number"] = _mask_number(section["aadhar_number"])
    if section.get("pan_number"):
        section["pan_number"] = _mask_number(section["pan_number"])
    if section.get("bank_account_number"):
        section["bank_account_number"] = _mask_number(section["bank_account_number"])
    return section


async def _record_event(
    db: AsyncSession,
    onboarding_id: str,
    actor_user_id: str,
    action: str,
    note: str | None = None,
    meta: dict | None = None,
) -> None:
    db.add(
        TrainerVerificationEvent(
            onboarding_id=onboarding_id,
            actor_user_id=actor_user_id,
            action=action,
            note=note,
            meta=meta or {},
        )
    )


async def _upsert_documents(
    db: AsyncSession,
    onboarding: TrainerOnboarding,
    user_id: str,
    step_payload: OnboardingStepPatchIn,
) -> None:
    uploads: list[tuple[str, str]] = []
    if step_payload.kyc and step_payload.kyc.pan_upload_url:
        uploads.append(("pan", step_payload.kyc.pan_upload_url))
    if step_payload.kyc and step_payload.kyc.video_verification_url:
        uploads.append(("video_verification", step_payload.kyc.video_verification_url))
    if step_payload.certificates:
        for url in step_payload.certificates.certification_upload_urls:
            uploads.append(("certificate", url))
    if step_payload.basic_profile and step_payload.basic_profile.photo:
        uploads.append(("photo", step_payload.basic_profile.photo))

    for doc_type, doc_url in uploads:
        existing = await db.execute(
            select(TrainerDocument).where(
                TrainerDocument.onboarding_id == onboarding.onboarding_id,
                TrainerDocument.document_type == doc_type,
                TrainerDocument.document_url == doc_url,
            )
        )
        if existing.scalar_one_or_none():
            continue
        db.add(
            TrainerDocument(
                onboarding_id=onboarding.onboarding_id,
                user_id=user_id,
                document_type=doc_type,
                document_url=doc_url,
            )
        )


async def _get_onboarding_owned(db: AsyncSession, onboarding_id: str, user_id: str) -> TrainerOnboarding:
    result = await db.execute(
        select(TrainerOnboarding).where(
            TrainerOnboarding.onboarding_id == onboarding_id,
            TrainerOnboarding.user_id == user_id,
        )
    )
    onboarding = result.scalar_one_or_none()
    if not onboarding:
        raise HTTPException(404, "Onboarding record not found")
    return onboarding


async def start_or_get_onboarding(db: AsyncSession, user_id: str) -> TrainerOnboarding:
    result = await db.execute(
        select(TrainerOnboarding)
        .where(TrainerOnboarding.user_id == user_id)
        .order_by(TrainerOnboarding.created_at.desc())
        .limit(1)
    )
    existing = result.scalar_one_or_none()
    if existing and existing.status in {
        TrainerOnboardingStatusEnum.DRAFT,
        TrainerOnboardingStatusEnum.SUBMITTED,
        TrainerOnboardingStatusEnum.UNDER_REVIEW,
        TrainerOnboardingStatusEnum.REWORK_REQUIRED,
    }:
        return existing

    onboarding = TrainerOnboarding(user_id=user_id, status=TrainerOnboardingStatusEnum.DRAFT, last_step="started")
    db.add(onboarding)
    await db.flush()
    await _record_event(db, onboarding.onboarding_id, user_id, "onboarding.started")
    return onboarding


async def update_onboarding_step(
    db: AsyncSession,
    user_id: str,
    onboarding_id: str,
    payload: OnboardingStepPatchIn,
) -> TrainerOnboarding:
    onboarding = await _get_onboarding_owned(db, onboarding_id, user_id)
    if onboarding.status in {TrainerOnboardingStatusEnum.APPROVED, TrainerOnboardingStatusEnum.REJECTED}:
        raise HTTPException(400, "Onboarding cannot be updated in current status")

    if payload.step == "basic_profile":
        if not payload.basic_profile:
            raise HTTPException(400, "basic_profile payload is required")
        onboarding.basic_profile = payload.basic_profile.model_dump()
    elif payload.step == "kyc":
        if not payload.kyc:
            raise HTTPException(400, "kyc payload is required")
        onboarding.kyc = payload.kyc.model_dump()
    elif payload.step == "bank":
        if not payload.bank:
            raise HTTPException(400, "bank payload is required")
        onboarding.bank = payload.bank.model_dump()
    elif payload.step == "availability":
        if not payload.availability:
            raise HTTPException(400, "availability payload is required")
        onboarding.availability = payload.availability.model_dump()
    elif payload.step == "certificates":
        if not payload.certificates:
            raise HTTPException(400, "certificates payload is required")
        c = payload.certificates.model_dump()
        onboarding.declaration_accepted = c.get("declaration_accepted", False)
        onboarding.certificates = c

    onboarding.last_step = payload.step
    if onboarding.status == TrainerOnboardingStatusEnum.REWORK_REQUIRED:
        onboarding.status = TrainerOnboardingStatusEnum.DRAFT
        onboarding.admin_reason = None

    await _upsert_documents(db, onboarding, user_id, payload)
    await _record_event(
        db,
        onboarding.onboarding_id,
        user_id,
        "onboarding.step_updated",
        meta={"step": payload.step},
    )
    return onboarding


def _require_submit_readiness(onboarding: TrainerOnboarding) -> None:
    if not onboarding.basic_profile:
        raise HTTPException(400, "Basic profile is incomplete")
    if not onboarding.kyc:
        raise HTTPException(400, "KYC details are incomplete")
    if not onboarding.bank:
        raise HTTPException(400, "Bank details are incomplete")
    if not onboarding.availability:
        raise HTTPException(400, "Availability details are incomplete")
    if not onboarding.certificates:
        raise HTTPException(400, "Certificates details are incomplete")
    if not onboarding.declaration_accepted:
        raise HTTPException(400, "Declaration must be accepted before submit")


def _trainer_payload_from_onboarding(onboarding: TrainerOnboarding) -> TrainerIn:
    bp = onboarding.basic_profile or {}
    kyc = onboarding.kyc or {}
    bank = onboarding.bank or {}
    av = onboarding.availability or {}
    cert = onboarding.certificates or {}

    return TrainerIn(
        bio=bp["bio"],
        photo=bp["photo"],
        specialty=bp["specialty"],
        hourly_rate=bp["hourly_rate"],
        city=bp["city"],
        area=bp["area"],
        gender=bp["gender"],
        languages=bp.get("languages", []),
        certifications=cert.get("certifications"),
        video_intro=cert.get("video_intro"),
        travel_radius=av.get("travel_radius", 5),
        available_days=av.get("available_days", []),
        video_verification_url=kyc.get("video_verification_url"),
        aadhar_number=kyc.get("aadhar_number"),
        digilocker_kyc=kyc.get("digilocker_kyc", False),
        pan_number=kyc.get("pan_number"),
        pan_upload_url=kyc.get("pan_upload_url"),
        certification_upload_urls=cert.get("certification_upload_urls", []),
        experience_brief=bp.get("experience_brief"),
        bank_account_name=bank.get("bank_account_name"),
        bank_account_number=bank.get("bank_account_number"),
        bank_ifsc=bank.get("bank_ifsc"),
        service_areas=av.get("service_areas", []),
        availability_slots=av.get("availability_slots", []),
        photo_branding_enabled=cert.get("photo_branding_enabled", True),
        lat=bp.get("lat"),
        lng=bp.get("lng"),
    )


async def submit_onboarding(db: AsyncSession, user_id: str, onboarding_id: str) -> TrainerOnboarding:
    onboarding = await _get_onboarding_owned(db, onboarding_id, user_id)
    if onboarding.status in {TrainerOnboardingStatusEnum.APPROVED, TrainerOnboardingStatusEnum.UNDER_REVIEW}:
        raise HTTPException(400, "Onboarding already submitted")

    _require_submit_readiness(onboarding)
    payload = _trainer_payload_from_onboarding(onboarding)

    t_res = await db.execute(select(Trainer).where(Trainer.user_id == user_id))
    trainer = t_res.scalar_one_or_none()
    if trainer:
        trainer.bio = payload.bio
        trainer.photo = payload.photo
        trainer.specialty = payload.specialty
        trainer.hourly_rate = payload.hourly_rate
        trainer.city = payload.city
        trainer.area = payload.area
        trainer.gender = payload.gender
        trainer.languages = payload.languages
        trainer.certifications = payload.certifications
        trainer.video_intro = payload.video_intro
        trainer.travel_radius = payload.travel_radius
        trainer.available_days = payload.available_days
        trainer.video_verification_url = payload.video_verification_url
        trainer.aadhar_number = payload.aadhar_number
        trainer.digilocker_kyc = payload.digilocker_kyc
        trainer.pan_number = payload.pan_number
        trainer.pan_upload_url = payload.pan_upload_url
        trainer.certification_upload_urls = payload.certification_upload_urls
        trainer.experience_brief = payload.experience_brief
        trainer.bank_account_name = payload.bank_account_name
        trainer.bank_account_number = payload.bank_account_number
        trainer.bank_ifsc = payload.bank_ifsc
        trainer.service_areas = payload.service_areas
        trainer.availability_slots = payload.availability_slots
        trainer.photo_branding_enabled = payload.photo_branding_enabled
        trainer.lat = payload.lat
        trainer.lng = payload.lng
        trainer.approved = False
        trainer.rejected = False
    else:
        trainer = await trainer_service.create_trainer_profile(db, user_id, payload)

    onboarding.trainer_id = trainer.trainer_id
    onboarding.status = TrainerOnboardingStatusEnum.UNDER_REVIEW
    onboarding.submitted_at = datetime.now(timezone.utc)
    onboarding.admin_reason = None
    await _record_event(db, onboarding.onboarding_id, user_id, "onboarding.submitted")

    user_res = await db.execute(select(User).where(User.user_id == user_id))
    user = user_res.scalar_one_or_none()
    if user:
        user.role = UserRoleEnum.TRAINER

    return onboarding


def mask_onboarding_sensitive(onboarding: TrainerOnboarding) -> dict:
    return {
        "onboarding_id": onboarding.onboarding_id,
        "user_id": onboarding.user_id,
        "trainer_id": onboarding.trainer_id,
        "status": onboarding.status.value,
        "last_step": onboarding.last_step,
        "basic_profile": dict(onboarding.basic_profile or {}),
        "kyc": _masked_section_copy(onboarding.kyc),
        "bank": _masked_section_copy(onboarding.bank),
        "availability": dict(onboarding.availability or {}),
        "certificates": dict(onboarding.certificates or {}),
        "declaration_accepted": onboarding.declaration_accepted,
        "admin_reason": onboarding.admin_reason,
        "submitted_at": onboarding.submitted_at,
        "reviewed_at": onboarding.reviewed_at,
        "created_at": onboarding.created_at,
        "updated_at": onboarding.updated_at,
    }


def _onboarding_status_priority():
    """Prefer review pipeline rows over a newer draft row (same user can have multiple applications)."""
    return case(
        (TrainerOnboarding.status == TrainerOnboardingStatusEnum.REWORK_REQUIRED, 1),
        (TrainerOnboarding.status == TrainerOnboardingStatusEnum.UNDER_REVIEW, 2),
        (TrainerOnboarding.status == TrainerOnboardingStatusEnum.SUBMITTED, 3),
        (TrainerOnboarding.status == TrainerOnboardingStatusEnum.DRAFT, 4),
        (TrainerOnboarding.status == TrainerOnboardingStatusEnum.APPROVED, 5),
        (TrainerOnboarding.status == TrainerOnboardingStatusEnum.REJECTED, 6),
        else_=7,
    )


async def get_my_onboarding(db: AsyncSession, user_id: str) -> TrainerOnboarding:
    result = await db.execute(
        select(TrainerOnboarding)
        .where(TrainerOnboarding.user_id == user_id)
        .order_by(_onboarding_status_priority(), TrainerOnboarding.updated_at.desc())
        .limit(1)
    )
    onboarding = result.scalar_one_or_none()
    if not onboarding:
        raise HTTPException(404, "No onboarding found")
    return onboarding


async def approve_onboarding_for_trainer_if_pending(db: AsyncSession, trainer_id: str) -> None:
    """When approving via legacy admin path, keep onboarding row consistent."""
    result = await db.execute(
        select(TrainerOnboarding)
        .where(
            TrainerOnboarding.trainer_id == trainer_id,
            TrainerOnboarding.status.in_(
                (
                    TrainerOnboardingStatusEnum.UNDER_REVIEW,
                    TrainerOnboardingStatusEnum.SUBMITTED,
                )
            ),
        )
        .order_by(TrainerOnboarding.updated_at.desc())
        .limit(1)
    )
    o = result.scalar_one_or_none()
    if not o:
        return
    o.status = TrainerOnboardingStatusEnum.APPROVED
    o.reviewed_at = datetime.now(timezone.utc)
    o.admin_reason = None


async def list_pending_onboardings(db: AsyncSession) -> list[TrainerOnboarding]:
    """Queued for admin review (submitted path). Includes SUBMITTED for older rows."""
    result = await db.execute(
        select(TrainerOnboarding)
        .where(
            TrainerOnboarding.status.in_(
                (
                    TrainerOnboardingStatusEnum.UNDER_REVIEW,
                    TrainerOnboardingStatusEnum.SUBMITTED,
                )
            )
        )
        .order_by(TrainerOnboarding.submitted_at.asc())
    )
    return list(result.scalars().all())


async def admin_decide(
    db: AsyncSession,
    onboarding_id: str,
    admin_user_id: str,
    action: str,
    reason: str,
) -> TrainerOnboarding:
    result = await db.execute(select(TrainerOnboarding).where(TrainerOnboarding.onboarding_id == onboarding_id))
    onboarding = result.scalar_one_or_none()
    if not onboarding:
        raise HTTPException(404, "Onboarding not found")

    t_res = await db.execute(select(Trainer).where(Trainer.trainer_id == onboarding.trainer_id))
    trainer = t_res.scalar_one_or_none()
    if not trainer:
        raise HTTPException(404, "Trainer profile not found")

    if action == "approve":
        onboarding.status = TrainerOnboardingStatusEnum.APPROVED
        trainer.approved = True
        trainer.rejected = False
    elif action == "reject":
        onboarding.status = TrainerOnboardingStatusEnum.REJECTED
        trainer.approved = False
        trainer.rejected = True
    elif action == "rework":
        onboarding.status = TrainerOnboardingStatusEnum.REWORK_REQUIRED
        trainer.approved = False
        trainer.rejected = False
    else:
        raise HTTPException(400, "Invalid decision action")

    onboarding.reviewed_at = datetime.now(timezone.utc)
    onboarding.admin_reason = reason
    await _record_event(
        db,
        onboarding.onboarding_id,
        admin_user_id,
        f"onboarding.{action}",
        note=reason,
    )
    return onboarding


async def get_latest_onboarding_for_trainer(db: AsyncSession, trainer_id: str) -> TrainerOnboarding:
    result = await db.execute(
        select(TrainerOnboarding)
        .where(TrainerOnboarding.trainer_id == trainer_id)
        .order_by(TrainerOnboarding.created_at.desc())
        .limit(1)
    )
    onboarding = result.scalar_one_or_none()
    if not onboarding:
        raise HTTPException(404, "Onboarding not found for trainer")
    return onboarding
