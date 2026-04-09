from fastapi import APIRouter, Depends, HTTPException, Query
from geoalchemy2.shape import from_shape
from shapely.geometry import Point
from sqlalchemy import text
from sqlalchemy.orm import Session

from .deps import current_admin, current_trainer_user, current_user, ensure_admin
from .geo_queries import trainers_for_apartment_or_radius
from .models import Apartment, Booking, Trainer, TrainerApartment, TrainerAvailability
from .schemas import (
    ApproveTrainerIn,
    ApartmentOut,
    AvailabilityIn,
    BookIn,
    BookOut,
    TrainerApplyIn,
    TrainerApplyOut,
    TrainerOut,
)

router = APIRouter(prefix="/api", tags=["postgis-scaffold"])


def get_db():
    """
    Replace with your actual Session dependency:
      from database import get_db
    """
    raise NotImplementedError("Wire get_db() to your app database session")


@router.post("/trainer/apply", response_model=TrainerApplyOut)
def trainer_apply(
    body: TrainerApplyIn,
    db: Session = Depends(get_db),
    user=Depends(current_trainer_user),
):
    trainer = Trainer(
        user_id=user.id,
        certifications=body.certifications,
        experience_years=body.experience_years,
        location=from_shape(Point(body.lng, body.lat), srid=4326),
        status="pending",
    )
    db.add(trainer)
    db.flush()

    for apartment_id in body.allowed_apartment_ids:
        db.add(TrainerApartment(trainer_id=trainer.id, apartment_id=apartment_id))

    db.commit()
    db.refresh(trainer)
    return TrainerApplyOut(trainer_id=trainer.id, status=trainer.status)


@router.post("/admin/approve_trainer")
def admin_approve_trainer(
    body: ApproveTrainerIn,
    db: Session = Depends(get_db),
    admin=Depends(current_admin),
):
    ensure_admin(admin)
    trainer = db.query(Trainer).filter(Trainer.id == body.trainer_id).first()
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")
    trainer.status = "approved" if body.approve else "rejected"
    trainer.rejection_reason = None if body.approve else (body.reason or "Rejected by admin")
    db.commit()
    return {"trainer_id": trainer.id, "status": trainer.status}


@router.get("/apartments", response_model=list[ApartmentOut])
def list_apartments(db: Session = Depends(get_db)):
    rows = db.query(Apartment).order_by(Apartment.name.asc()).all()
    return [ApartmentOut(id=row.id, name=row.name) for row in rows]


@router.get("/trainers", response_model=list[TrainerOut])
def list_trainers(
    apartment_id: str = Query(...),
    radius_km: float = Query(5.0, ge=0.1, le=100.0),
    db: Session = Depends(get_db),
):
    rows = trainers_for_apartment_or_radius(db, apartment_id=apartment_id, radius_km=radius_km)
    return [
        TrainerOut(
            id=row.id,
            user_id=row.user_id,
            status=row.status,
            experience_years=row.experience_years,
            certifications=row.certifications or [],
        )
        for row in rows
    ]


@router.post("/trainer/availability")
def upsert_availability(
    body: AvailabilityIn,
    db: Session = Depends(get_db),
    user=Depends(current_trainer_user),
):
    trainer = db.query(Trainer).filter(Trainer.user_id == user.id).first()
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer profile not found")
    if body.slot_end <= body.slot_start:
        raise HTTPException(status_code=422, detail="slot_end must be after slot_start")

    row = (
        db.query(TrainerAvailability)
        .filter(
            TrainerAvailability.trainer_id == trainer.id,
            TrainerAvailability.slot_start == body.slot_start,
            TrainerAvailability.slot_end == body.slot_end,
        )
        .first()
    )
    if row:
        row.is_available = True
    else:
        db.add(
            TrainerAvailability(
                trainer_id=trainer.id,
                slot_start=body.slot_start,
                slot_end=body.slot_end,
                is_available=True,
            )
        )
    db.commit()
    return {"ok": True}


@router.post("/book", response_model=BookOut)
def book_trainer(
    body: BookIn,
    db: Session = Depends(get_db),
    user=Depends(current_user),
):
    if body.slot_end <= body.slot_start:
        raise HTTPException(status_code=422, detail="slot_end must be after slot_start")

    slot = (
        db.query(TrainerAvailability)
        .filter(
            TrainerAvailability.trainer_id == body.trainer_id,
            TrainerAvailability.slot_start == body.slot_start,
            TrainerAvailability.slot_end == body.slot_end,
            TrainerAvailability.is_available.is_(True),
        )
        .first()
    )
    if not slot:
        raise HTTPException(status_code=409, detail="Slot not available")

    booking = Booking(
        user_id=user.id,
        trainer_id=body.trainer_id,
        apartment_id=body.apartment_id,
        slot_start=body.slot_start,
        slot_end=body.slot_end,
        status="booked",
    )
    db.add(booking)

    try:
        db.flush()
        slot.is_available = False
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=409, detail="Slot already booked")

    return BookOut(booking_id=booking.id, status=booking.status)


@router.get("/admin/bookings")
def admin_bookings(db: Session = Depends(get_db), admin=Depends(current_admin)):
    ensure_admin(admin)
    rows = db.query(Booking).order_by(Booking.created_at.desc()).limit(200).all()
    return [
        {
            "booking_id": row.id,
            "user_id": row.user_id,
            "trainer_id": row.trainer_id,
            "apartment_id": row.apartment_id,
            "slot_start": row.slot_start,
            "slot_end": row.slot_end,
            "status": row.status,
            "created_at": row.created_at,
        }
        for row in rows
    ]


@router.post("/admin/assign_trainer_apartment")
def assign_trainer_apartment(
    trainer_id: str,
    apartment_id: str,
    db: Session = Depends(get_db),
    admin=Depends(current_admin),
):
    ensure_admin(admin)
    exists = (
        db.query(TrainerApartment)
        .filter(
            TrainerApartment.trainer_id == trainer_id,
            TrainerApartment.apartment_id == apartment_id,
        )
        .first()
    )
    if exists:
        return {"ok": True, "message": "Already assigned"}
    db.add(TrainerApartment(trainer_id=trainer_id, apartment_id=apartment_id))
    db.commit()
    return {"ok": True}
