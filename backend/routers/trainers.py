from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import get_current_user
from models.tables import User
from schemas.platform import TrainerLocationPatch
from schemas.trainer import TrainerIn, TrainerOut, TrainerProfilePatch
from schemas.trainer_onboarding import OnboardingStartOut, OnboardingStepPatchIn, TrainerOnboardingOut
from services import audit_service, trainer_onboarding_service, trainer_service

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
    names = await trainer_service.user_names_by_user_ids(db, [t.user_id for t in trainers])
    return [trainer_service.to_trainer_out(t, names.get(t.user_id)) for t in trainers]


@router.get("/me", response_model=TrainerOut)
async def my_profile(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    t = await trainer_service.get_trainer_by_user(db, user.user_id)
    return trainer_service.to_trainer_out(t, user.name)


@router.patch("/me", response_model=TrainerOut)
async def patch_my_profile(
    body: TrainerProfilePatch,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    t = await trainer_service.update_trainer_profile(db, user.user_id, body)
    await audit_service.record(db, "trainer.profile_updated", user.user_id, "trainer", t.trainer_id)
    return trainer_service.to_trainer_out(t, user.name)


@router.patch("/me/location", response_model=TrainerOut)
async def patch_my_location(
    body: TrainerLocationPatch,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    t = await trainer_service.update_trainer_location(db, user.user_id, body.lat, body.lng)
    return trainer_service.to_trainer_out(t, user.name)


@router.post("/me/photo", response_model=TrainerOut)
async def upload_my_profile_photo(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    raw = await file.read()
    t = await trainer_service.save_trainer_profile_photo(db, user.user_id, raw, file.content_type)
    await audit_service.record(db, "trainer.photo_uploaded", user.user_id, "trainer", t.trainer_id)
    return trainer_service.to_trainer_out(t, user.name)


@router.get("/me/verification-status")
async def my_verification_status(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    onboarding = None
    trainer = None
    try:
        onboarding = await trainer_onboarding_service.get_my_onboarding(db, user.user_id)
    except HTTPException:
        onboarding = None

    try:
        trainer = await trainer_service.get_trainer_by_user(db, user.user_id)
    except HTTPException:
        trainer = None

    return {
        "trainer_id": trainer.trainer_id if trainer else None,
        "approved": trainer.approved if trainer else False,
        "rejected": trainer.rejected if trainer else False,
        "verification_status": trainer.verification_status if trainer else "draft",
        "onboarding_status": onboarding.status.value if onboarding else None,
        "admin_reason": onboarding.admin_reason if onboarding else None,
    }


@router.post("/onboarding/start", response_model=OnboardingStartOut, status_code=201)
async def start_onboarding(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    onboarding = await trainer_onboarding_service.start_or_get_onboarding(db, user.user_id)
    await audit_service.record(
        db,
        "trainer.onboarding.started",
        user.user_id,
        "trainer_onboarding",
        onboarding.onboarding_id,
    )
    return OnboardingStartOut(onboarding_id=onboarding.onboarding_id, status=onboarding.status.value)


@router.patch("/onboarding/{onboarding_id}/step", response_model=TrainerOnboardingOut)
async def update_onboarding_step(
    onboarding_id: str,
    body: OnboardingStepPatchIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    onboarding = await trainer_onboarding_service.update_onboarding_step(db, user.user_id, onboarding_id, body)
    await audit_service.record(
        db,
        "trainer.onboarding.step_updated",
        user.user_id,
        "trainer_onboarding",
        onboarding.onboarding_id,
        meta={"step": body.step},
    )
    return TrainerOnboardingOut.model_validate(trainer_onboarding_service.mask_onboarding_sensitive(onboarding))


@router.post("/onboarding/{onboarding_id}/submit", response_model=TrainerOnboardingOut)
async def submit_onboarding(
    onboarding_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    onboarding = await trainer_onboarding_service.submit_onboarding(db, user.user_id, onboarding_id)
    await audit_service.record(
        db,
        "trainer.onboarding.submitted",
        user.user_id,
        "trainer_onboarding",
        onboarding.onboarding_id,
    )
    return TrainerOnboardingOut.model_validate(trainer_onboarding_service.mask_onboarding_sensitive(onboarding))


@router.get("/onboarding/me", response_model=TrainerOnboardingOut)
async def get_my_onboarding(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    onboarding = await trainer_onboarding_service.get_my_onboarding(db, user.user_id)
    return TrainerOnboardingOut.model_validate(trainer_onboarding_service.mask_onboarding_sensitive(onboarding))


@router.post("", response_model=TrainerOut, status_code=201)
async def create_profile(
    body: TrainerIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    t = await trainer_service.create_trainer_profile(db, user.user_id, body)
    return trainer_service.to_trainer_out(t, user.name)


@router.get("/{trainer_id}/availability")
async def get_availability(trainer_id: str, date: str, db: AsyncSession = Depends(get_db)):
    return await trainer_service.get_trainer_availability(db, trainer_id, date)


@router.get("/{trainer_id}", response_model=TrainerOut)
async def get_trainer(trainer_id: str, db: AsyncSession = Depends(get_db)):
    t = await trainer_service.get_public_trainer_by_id(db, trainer_id)
    names = await trainer_service.user_names_by_user_ids(db, [t.user_id])
    return trainer_service.to_trainer_out(t, names.get(t.user_id))
