import base64
import io
from datetime import datetime, timezone

import qrcode
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.tables import Booking, BookingStatusEnum, PromoCode, Trainer, User
from schemas.booking import BookingIn


def _duration_hours(start: str, end: str) -> float:
    def to_minutes(s: str) -> int:
        raw = (s or "").strip()
        if not raw:
            raise HTTPException(400, "Invalid time")
        parts = raw.split(":")
        try:
            h = int(parts[0])
            m = int(parts[1]) if len(parts) > 1 else 0
        except ValueError as e:
            raise HTTPException(400, "Invalid time format") from e
        if not (0 <= h <= 23 and 0 <= m <= 59):
            raise HTTPException(400, "Invalid time")
        return h * 60 + m

    a = to_minutes(start)
    b = to_minutes(end)
    if b <= a:
        raise HTTPException(400, "End time must be after start time")
    return (b - a) / 60.0


async def _base_amount_for_booking(db: AsyncSession, data: BookingIn) -> float:
    hours = _duration_hours(data.start_time, data.end_time)
    if data.target_type == "trainer":
        result = await db.execute(
            select(Trainer).where(Trainer.trainer_id == data.target_id, Trainer.approved == True)
        )
        t = result.scalar_one_or_none()
        if not t:
            raise HTTPException(404, "Trainer not found")
        return round(float(t.hourly_rate) * hours, 2)
    if data.target_type == "gym":
        return round(float(data.amount), 2)
    raise HTTPException(400, "Unsupported booking target")


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

    original = await _base_amount_for_booking(db, data)
    if data.target_type == "trainer" and abs(float(data.amount) - original) > 0.06:
        raise HTTPException(400, "Amount does not match trainer rate and selected duration")

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
        status=BookingStatusEnum.INITIATED,
        idempotency_key=data.idempotency_key,
    )
    db.add(booking)
    await db.flush()
    return booking


async def get_user_bookings(db: AsyncSession, user_id: str) -> list[Booking]:
    result = await db.execute(
        select(Booking).where(Booking.user_id == user_id).order_by(Booking.created_at.desc())
    )
    return list(result.scalars().all())


async def get_booking_for_actor(db: AsyncSession, booking_id: str, user: User) -> Booking:
    result = await db.execute(select(Booking).where(Booking.booking_id == booking_id))
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(404, "Booking not found")
    if b.user_id == user.user_id:
        return b
    if user.role.value == "trainer":
        t_res = await db.execute(select(Trainer).where(Trainer.user_id == user.user_id))
        trainer = t_res.scalar_one_or_none()
        if trainer and b.target_type == "trainer" and b.target_id == trainer.trainer_id:
            return b
    raise HTTPException(403, "Not allowed to view this booking")


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
        select(Booking)
        .where(Booking.target_id == trainer_id, Booking.status != BookingStatusEnum.INITIATED)
        .order_by(Booking.created_at.desc())
    )
    return list(result.scalars().all())


async def confirm_booking_payment(
    db: AsyncSession,
    booking_id: str,
    user_id: str,
    order_id: str,
    payment_id: str,
    signature: str,
) -> Booking:
    from services import razorpay_service

    result = await db.execute(select(Booking).where(Booking.booking_id == booking_id))
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(404, "Booking not found")
    if b.user_id != user_id:
        raise HTTPException(403, "Not your booking")
    if b.status == BookingStatusEnum.CONFIRMED and b.payment_id == payment_id:
        return b
    if b.status != BookingStatusEnum.INITIATED:
        raise HTTPException(400, "This booking cannot be paid for in its current state")
    if not b.razorpay_order_id or b.razorpay_order_id != order_id:
        raise HTTPException(400, "Payment does not match this booking")

    razorpay_service.verify_payment_signature(order_id=order_id, payment_id=payment_id, signature=signature)
    b.status = BookingStatusEnum.CONFIRMED
    b.payment_id = payment_id
    b.qr_code = _generate_qr(b.booking_id)
    return b
