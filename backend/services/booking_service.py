import base64
import io
from datetime import datetime, timezone

import qrcode
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.tables import Booking, BookingStatusEnum, PromoCode, Trainer
from schemas.booking import BookingIn


async def _apply_promo(db: AsyncSession, code: str, amount: float) -> tuple[float, float]:
    result = await db.execute(select(PromoCode).where(PromoCode.code == code.upper()))
    promo = result.scalar_one_or_none()
    if not promo:
        raise HTTPException(400, "Invalid promo code")
    if promo.uses >= promo.max_uses:
        raise HTTPException(400, "Promo code usage limit reached")

    discount = round(amount * promo.discount_percent / 100, 2)
    promo.uses += 1
    return round(amount - discount, 2), discount


def _generate_qr(booking_id: str) -> str:
    img = qrcode.make(booking_id)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode()


async def create_booking(db: AsyncSession, user_id: str, data: BookingIn) -> Booking:
    if data.idempotency_key:
        existing = await db.execute(select(Booking).where(Booking.idempotency_key == data.idempotency_key))
        b = existing.scalar_one_or_none()
        if b:
            return b

    conflict = await db.execute(
        select(Booking).where(
            Booking.target_id == data.target_id,
            Booking.date == data.date,
            Booking.start_time == data.start_time,
            Booking.status.in_([BookingStatusEnum.CONFIRMED, BookingStatusEnum.INITIATED]),
        )
    )
    if conflict.scalar_one_or_none():
        raise HTTPException(409, "This slot is already booked")

    original = data.amount
    discount = 0.0
    final = original

    if data.promo_code:
        final, discount = await _apply_promo(db, data.promo_code, original)

    booking = Booking(
        user_id=user_id,
        target_id=data.target_id,
        target_type=data.target_type,
        date=data.date,
        start_time=data.start_time,
        end_time=data.end_time,
        original_amount=original,
        discount=discount,
        amount=final,
        promo_code=data.promo_code,
        status=BookingStatusEnum.CONFIRMED,
        idempotency_key=data.idempotency_key,
    )
    db.add(booking)
    await db.flush()

    booking.qr_code = _generate_qr(booking.booking_id)
    return booking


async def get_user_bookings(db: AsyncSession, user_id: str) -> list[Booking]:
    result = await db.execute(
        select(Booking).where(Booking.user_id == user_id).order_by(Booking.created_at.desc())
    )
    return list(result.scalars().all())


async def get_booking(db: AsyncSession, booking_id: str, user_id: str) -> Booking:
    result = await db.execute(select(Booking).where(Booking.booking_id == booking_id))
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(404, "Booking not found")
    if b.user_id != user_id:
        raise HTTPException(403, "Not your booking")
    return b


async def complete_booking(db: AsyncSession, booking_id: str, actor_user_id: str, actor_role: str) -> Booking:
    result = await db.execute(select(Booking).where(Booking.booking_id == booking_id))
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(404, "Booking not found")
    if b.status != BookingStatusEnum.CONFIRMED:
        raise HTTPException(400, f"Cannot complete a booking with status '{b.status.value}'")

    if actor_role != "admin":
        t_res = await db.execute(select(Trainer).where(Trainer.user_id == actor_user_id))
        trainer = t_res.scalar_one_or_none()
        if not trainer or trainer.trainer_id != b.target_id:
            raise HTTPException(403, "Only the assigned trainer can complete this booking")

    b.status = BookingStatusEnum.COMPLETED
    b.completed_at = datetime.now(timezone.utc)
    return b


async def cancel_booking(db: AsyncSession, booking_id: str, user_id: str) -> Booking:
    result = await db.execute(select(Booking).where(Booking.booking_id == booking_id))
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(404, "Booking not found")
    if b.user_id != user_id:
        raise HTTPException(403, "Not your booking")
    if b.status not in (BookingStatusEnum.INITIATED, BookingStatusEnum.CONFIRMED):
        raise HTTPException(400, "Booking cannot be cancelled in its current state")

    b.status = BookingStatusEnum.CANCELLED
    b.cancelled_at = datetime.now(timezone.utc)
    return b


async def get_trainer_bookings(db: AsyncSession, trainer_id: str) -> list[Booking]:
    result = await db.execute(
        select(Booking).where(Booking.target_id == trainer_id).order_by(Booking.created_at.desc())
    )
    return list(result.scalars().all())
