import uuid
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.tables import Trainer, User, UserRoleEnum, Booking, BookingStatusEnum
from schemas.trainer import TrainerIn, TrainerOut, TrainerProfilePatch
from utils.geo import haversine

_BACKEND_ROOT = Path(__file__).resolve().parents[1]
TRAINER_PHOTO_DIR = _BACKEND_ROOT / "uploads" / "trainers"
PHOTO_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
MAX_TRAINER_PHOTO_BYTES = 5 * 1024 * 1024


async def create_trainer_profile(db: AsyncSession, user_id: str, data: TrainerIn) -> Trainer:
    existing = await db.execute(select(Trainer).where(Trainer.user_id == user_id))
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Trainer profile already exists for this user")

    trainer = Trainer(
        user_id=user_id,
        bio=data.bio,
        photo=data.photo,
        specialty=data.specialty,
        hourly_rate=data.hourly_rate,
        city=data.city,
        area=data.area,
        gender=data.gender,
        languages=data.languages,
        certifications=data.certifications,
        video_intro=data.video_intro,
        travel_radius=data.travel_radius,
        available_days=data.available_days,
        video_verification_url=data.video_verification_url,
        aadhar_number=data.aadhar_number,
        digilocker_kyc=data.digilocker_kyc,
        pan_number=data.pan_number,
        pan_upload_url=data.pan_upload_url,
        certification_upload_urls=data.certification_upload_urls,
        experience_brief=data.experience_brief,
        bank_account_name=data.bank_account_name,
        bank_account_number=data.bank_account_number,
        bank_ifsc=data.bank_ifsc,
        service_areas=data.service_areas,
        availability_slots=data.availability_slots,
        photo_branding_enabled=data.photo_branding_enabled,
        lat=data.lat,
        lng=data.lng,
        approved=False,
        rejected=False,
    )
    db.add(trainer)
    await db.flush()

    u_res = await db.execute(select(User).where(User.user_id == user_id))
    user = u_res.scalar_one_or_none()
    if user:
        user.role = UserRoleEnum.TRAINER

    return trainer


async def get_trainer_by_id(db: AsyncSession, trainer_id: str) -> Trainer:
    result = await db.execute(select(Trainer).where(Trainer.trainer_id == trainer_id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Trainer not found")
    return t


async def get_public_trainer_by_id(db: AsyncSession, trainer_id: str) -> Trainer:
    result = await db.execute(
        select(Trainer).where(Trainer.trainer_id == trainer_id, Trainer.approved == True)
    )
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Trainer not found")
    return t


async def update_trainer_location(db: AsyncSession, user_id: str, lat: float, lng: float) -> Trainer:
    t = await get_trainer_by_user(db, user_id)
    t.lat = lat
    t.lng = lng
    await db.flush()
    return t


async def update_trainer_profile(db: AsyncSession, user_id: str, data: TrainerProfilePatch) -> Trainer:
    t = await get_trainer_by_user(db, user_id)
    updates = data.model_dump(exclude_unset=True)
    if not updates:
        return t
    for key, value in updates.items():
        setattr(t, key, value)
    await db.flush()
    return t


async def save_trainer_profile_photo(db: AsyncSession, user_id: str, raw: bytes, content_type: str | None) -> Trainer:
    ct = (content_type or "").split(";")[0].strip().lower()
    if ct not in PHOTO_CONTENT_TYPES:
        raise HTTPException(400, "File must be JPEG, PNG, WebP, or GIF")
    if len(raw) > MAX_TRAINER_PHOTO_BYTES:
        raise HTTPException(413, "Image must be 5MB or smaller")
    TRAINER_PHOTO_DIR.mkdir(parents=True, exist_ok=True)
    ext = PHOTO_CONTENT_TYPES[ct]
    name = f"{uuid.uuid4().hex}{ext}"
    path = TRAINER_PHOTO_DIR / name
    path.write_bytes(raw)
    public_url = f"{settings.PUBLIC_BACKEND_URL.rstrip('/')}/uploads/trainers/{name}"
    t = await get_trainer_by_user(db, user_id)
    t.photo = public_url
    await db.flush()
    return t


async def get_trainer_by_user(db: AsyncSession, user_id: str) -> Trainer:
    result = await db.execute(select(Trainer).where(Trainer.user_id == user_id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Trainer profile not found")
    return t


async def list_trainers(
    db: AsyncSession,
    city: str | None = None,
    area: str | None = None,
    specialty: str | None = None,
    max_rate: float | None = None,
    lat: float | None = None,
    lng: float | None = None,
    radius_km: float = 20.0,
) -> list[Trainer]:
    stmt = select(Trainer).where(Trainer.approved == True)

    if city:
        stmt = stmt.where(Trainer.city == city)
    if area:
        stmt = stmt.where(Trainer.area.ilike(f"%{area}%"))
    if specialty:
        stmt = stmt.where(Trainer.specialty.ilike(f"%{specialty}%"))
    if max_rate is not None:
        stmt = stmt.where(Trainer.hourly_rate <= max_rate)

    result = await db.execute(stmt)
    trainers = list(result.scalars().all())

    if lat is not None and lng is not None:
        trainers = [
            t for t in trainers if t.lat and t.lng and haversine(lat, lng, t.lat, t.lng) <= radius_km
        ]

    return trainers


async def get_trainer_availability(db: AsyncSession, trainer_id: str, date: str) -> dict:
    result = await db.execute(select(Trainer).where(Trainer.trainer_id == trainer_id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Trainer not found")

    bookings_res = await db.execute(
        select(Booking).where(
            Booking.target_id == trainer_id,
            Booking.date == date,
            Booking.status.in_([BookingStatusEnum.CONFIRMED, BookingStatusEnum.INITIATED]),
        )
    )
    booked_slots = [{"start": b.start_time, "end": b.end_time} for b in bookings_res.scalars().all()]
    return {"available_slots": t.availability_slots, "booked": booked_slots}


async def approve_trainer(db: AsyncSession, trainer_id: str) -> Trainer:
    t = await get_trainer_by_id(db, trainer_id)
    t.approved = True
    t.rejected = False
    return t


async def reject_trainer(db: AsyncSession, trainer_id: str) -> Trainer:
    t = await get_trainer_by_id(db, trainer_id)
    t.rejected = True
    t.approved = False
    return t


async def user_names_by_user_ids(db: AsyncSession, user_ids: list[str]) -> dict[str, str]:
    if not user_ids:
        return {}
    unique = list({uid for uid in user_ids if uid})
    result = await db.execute(select(User.user_id, User.name).where(User.user_id.in_(unique)))
    return dict(result.all())


def to_trainer_out(trainer: Trainer, trainer_name: str | None = None) -> TrainerOut:
    out = TrainerOut.model_validate(trainer)
    return out.model_copy(update={"trainer_name": trainer_name})
