from typing import List
from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import get_current_user
from models.tables import User
from schemas.booking import BookingIn, BookingOut
from services import booking_service, review_service
from services.email_service import send_booking_confirmation, send_completion_email
from services import audit_service

router = APIRouter(prefix="/api/bookings", tags=["bookings"])


@router.post("", response_model=BookingOut, status_code=201)
async def create_booking(
    body: BookingIn,
    bg: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    booking = await booking_service.create_booking(db, user.user_id, body)
    await audit_service.record(db, "booking.created", user.user_id, "booking", booking.booking_id)
    bg.add_task(
        send_booking_confirmation,
        user.email,
        user.name,
        {
            "booking_id": booking.booking_id,
            "date": booking.date,
            "start_time": booking.start_time,
            "end_time": booking.end_time,
            "amount": float(booking.amount),
        },
        booking.qr_code or "",
    )
    return BookingOut.model_validate(booking)


@router.get("", response_model=List[BookingOut])
async def my_bookings(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    bookings = await booking_service.get_user_bookings(db, user.user_id)
    return [BookingOut.model_validate(b) for b in bookings]


@router.get("/{booking_id}", response_model=BookingOut)
async def get_booking(
    booking_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    b = await booking_service.get_booking(db, booking_id, user.user_id)
    return BookingOut.model_validate(b)


@router.post("/{booking_id}/complete", response_model=BookingOut)
async def complete_booking(
    booking_id: str,
    bg: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    b = await booking_service.complete_booking(db, booking_id, user.user_id, user.role.value)
    await audit_service.record(db, "booking.completed", user.user_id, "booking", booking_id)
    bg.add_task(send_completion_email, user.email, user.name, b.date)
    return BookingOut.model_validate(b)


@router.post("/{booking_id}/cancel", response_model=BookingOut)
async def cancel_booking(
    booking_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    b = await booking_service.cancel_booking(db, booking_id, user.user_id)
    await audit_service.record(db, "booking.cancelled", user.user_id, "booking", booking_id)
    return BookingOut.model_validate(b)
