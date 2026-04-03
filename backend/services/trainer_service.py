from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.tables import Trainer, User, UserRoleEnum, Booking, BookingStatusEnum
from schemas.trainer import TrainerIn
from utils.geo import haversine


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
