from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.tables import (
    Apartment,
    InvitationStatusEnum,
    Trainer,
    TrainerApartment,
    TrainerInvitation,
)
from schemas.booking import BookingIn
from services import booking_service
from services.notification_service import create_notification


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def create_apartment(db: AsyncSession, city: str, locality: str, name: str, lat=None, lng=None, is_active=True):
    row = Apartment(
        city=city.strip(),
        locality=locality.strip(),
        name=name.strip(),
        lat=lat,
        lng=lng,
        is_active=is_active,
    )
    db.add(row)
    await db.flush()
    return row


async def list_apartments(db: AsyncSession, q: str | None = None, city: str | None = None, limit: int = 25):
    stmt = select(Apartment).where(Apartment.is_active == True)
    if city:
        stmt = stmt.where(func.lower(Apartment.city) == city.strip().lower())
    if q:
        search = f"%{q.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Apartment.name).like(search),
                func.lower(Apartment.locality).like(search),
                func.lower(Apartment.city).like(search),
            )
        )
    stmt = stmt.order_by(Apartment.city.asc(), Apartment.locality.asc(), Apartment.name.asc()).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def set_trainer_apartment_preference(
    db: AsyncSession, trainer_id: str, apartment_id: str, active: bool
) -> TrainerApartment:
    trainer = (
        await db.execute(select(Trainer).where(Trainer.trainer_id == trainer_id, Trainer.approved == True))
    ).scalar_one_or_none()
    if not trainer:
        raise HTTPException(404, "Approved trainer not found")
    apartment = (
        await db.execute(select(Apartment).where(Apartment.apartment_id == apartment_id, Apartment.is_active == True))
    ).scalar_one_or_none()
    if not apartment:
        raise HTTPException(404, "Apartment not found")

    existing = (
        await db.execute(
            select(TrainerApartment).where(
                TrainerApartment.trainer_id == trainer_id,
                TrainerApartment.apartment_id == apartment_id,
            )
        )
    ).scalar_one_or_none()
    if existing:
        existing.active = active
        await db.flush()
        return existing
    row = TrainerApartment(trainer_id=trainer_id, apartment_id=apartment_id, active=active)
    db.add(row)
    await db.flush()
    return row


async def get_opted_trainers_for_apartment(db: AsyncSession, apartment_id: str):
    stmt = (
        select(Trainer)
        .join(
            TrainerApartment,
            and_(TrainerApartment.trainer_id == Trainer.trainer_id, TrainerApartment.active == True),
        )
        .where(TrainerApartment.apartment_id == apartment_id, Trainer.approved == True)
        .order_by(Trainer.rating.desc(), Trainer.reviews_count.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_invitation(
    db: AsyncSession,
    user_id: str,
    trainer_id: str,
    apartment_id: str,
    date: str,
    start_time: str,
    end_time: str,
    amount: float,
    workout: str | None,
    note: str | None,
) -> TrainerInvitation:
    trainer = (
        await db.execute(select(Trainer).where(Trainer.trainer_id == trainer_id, Trainer.approved == True))
    ).scalar_one_or_none()
    if not trainer:
        raise HTTPException(404, "Trainer not found")
    apartment = (
        await db.execute(select(Apartment).where(Apartment.apartment_id == apartment_id, Apartment.is_active == True))
    ).scalar_one_or_none()
    if not apartment:
        raise HTTPException(404, "Apartment not found")

    opted = (
        await db.execute(
            select(TrainerApartment).where(
                TrainerApartment.trainer_id == trainer_id,
                TrainerApartment.apartment_id == apartment_id,
                TrainerApartment.active == True,
            )
        )
    ).scalar_one_or_none()
    if not opted:
        raise HTTPException(409, "Trainer has not opted for this apartment yet")

    row = TrainerInvitation(
        user_id=user_id,
        trainer_id=trainer_id,
        apartment_id=apartment_id,
        date=date,
        start_time=start_time,
        end_time=end_time,
        amount=amount,
        workout=workout,
        note=note,
        status=InvitationStatusEnum.PENDING,
    )
    db.add(row)
    await db.flush()
    await create_notification(
        db,
        trainer.user_id,
        kind="trainer_invitation",
        title="New locality invite",
        body=f"You have a new invite in {apartment.locality}, {apartment.city}.",
        payload={"invitation_id": row.invitation_id, "trainer_id": trainer_id, "apartment_id": apartment_id},
    )
    return row


async def decide_invitation(db: AsyncSession, invitation_id: str, trainer_user_id: str, accept: bool) -> TrainerInvitation:
    row = (
        await db.execute(select(TrainerInvitation).where(TrainerInvitation.invitation_id == invitation_id))
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Invitation not found")
    trainer = (
        await db.execute(select(Trainer).where(Trainer.trainer_id == row.trainer_id))
    ).scalar_one_or_none()
    if not trainer or trainer.user_id != trainer_user_id:
        raise HTTPException(403, "Not allowed")
    if row.status != InvitationStatusEnum.PENDING:
        raise HTTPException(409, "Invitation is already processed")

    if not accept:
        row.status = InvitationStatusEnum.REJECTED
        row.responded_at = _now()
        await db.flush()
        await create_notification(
            db,
            row.user_id,
            kind="invitation_rejected",
            title="Trainer declined invite",
            body="Your selected trainer declined the invitation.",
            payload={"invitation_id": row.invitation_id, "trainer_id": row.trainer_id},
        )
        return row

    row.status = InvitationStatusEnum.ACCEPTED
    row.responded_at = _now()
    booking = await booking_service.create_booking(
        db,
        row.user_id,
        BookingIn(
            target_id=row.trainer_id,
            target_type="trainer",
            date=row.date,
            start_time=row.start_time,
            end_time=row.end_time,
            amount=float(row.amount),
            promo_code=None,
            idempotency_key=f"invite-{row.invitation_id}",
        ),
    )
    row.status = InvitationStatusEnum.BOOKING_INITIATED
    row.booking_id = booking.booking_id
    await db.flush()
    await create_notification(
        db,
        row.user_id,
        kind="invitation_accepted",
        title="Trainer accepted your invite",
        body="Your trainer accepted. Booking request has been created.",
        payload={"invitation_id": row.invitation_id, "booking_id": booking.booking_id},
    )
    await create_notification(
        db,
        trainer.user_id,
        kind="booking_created",
        title="Booking request created",
        body=f"Booking request {booking.booking_id} is created for your accepted invite.",
        payload={"invitation_id": row.invitation_id, "booking_id": booking.booking_id},
    )
    return row


async def list_invitations_for_user(db: AsyncSession, user_id: str) -> list[TrainerInvitation]:
    result = await db.execute(
        select(TrainerInvitation)
        .where(TrainerInvitation.user_id == user_id)
        .order_by(TrainerInvitation.created_at.desc())
        .limit(100)
    )
    return list(result.scalars().all())


async def list_invitations_for_trainer(db: AsyncSession, trainer_id: str) -> list[TrainerInvitation]:
    result = await db.execute(
        select(TrainerInvitation)
        .where(TrainerInvitation.trainer_id == trainer_id)
        .order_by(TrainerInvitation.created_at.desc())
        .limit(100)
    )
    return list(result.scalars().all())
