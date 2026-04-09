from sqlalchemy import bindparam, or_, select
from sqlalchemy.orm import Session

from .models import Apartment, Trainer, TrainerApartment


def trainers_for_apartment_or_radius(
    db: Session,
    apartment_id,
    radius_km: float,
):
    """
    Return approved trainers that are either:
    1) assigned to apartment, OR
    2) within radius from apartment point.
    """
    radius_m = float(radius_km) * 1000.0
    apt_location_subq = (
        select(Apartment.location).where(Apartment.id == bindparam("apartment_id")).scalar_subquery()
    )

    stmt = (
        select(Trainer)
        .where(Trainer.status == "approved")
        .where(
            or_(
                Trainer.id.in_(
                    select(TrainerApartment.trainer_id).where(
                        TrainerApartment.apartment_id == bindparam("apartment_id")
                    )
                ),
                # ST_DWithin(geography, geography, meters)
                Trainer.location.ST_DWithin(apt_location_subq, radius_m),
            )
        )
    )
    return db.execute(stmt, {"apartment_id": apartment_id}).scalars().all()
