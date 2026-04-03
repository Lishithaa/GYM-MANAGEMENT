from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import get_current_user, get_current_user_optional
from models.tables import ContactMessage, LifestyleAssessment, User
from schemas.common import ContactIn, LifestyleAssessmentIn, LifestyleAssessmentOut
from schemas.trainer import TrainerOut
from services import booking_service, trainer_service

router = APIRouter(tags=["misc"])

CITIES_AREAS = {
    "Hyderabad": ["Banjara Hills", "Jubilee Hills", "Hitech City", "Gachibowli", "Kukatpally", "Madhapur"],
    "Bangalore": ["Koramangala", "Indiranagar", "Whitefield", "HSR Layout", "Electronic City", "Jayanagar"],
    "Guntur": ["Brodipet", "Lakshmipuram", "Arundelpet", "Nallapadu", "Pattabhipuram"],
}


@router.get("/api/cities")
async def cities():
    return list(CITIES_AREAS.keys())


@router.get("/api/areas/{city}")
async def areas(city: str):
    return CITIES_AREAS.get(city, [])


@router.get("/api/gyms")
async def gyms_stub():
    """Legacy UI calls this; Mongo gym flow lives in server.py if you still use it."""
    return []


@router.get("/api/trainer/my-profile", response_model=TrainerOut | None)
async def trainer_my_profile_compat(
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    """JWT auth: same data as GET /api/trainers/me (for older frontend paths)."""
    if not user:
        return None
    try:
        t = await trainer_service.get_trainer_by_user(db, user.user_id)
        return TrainerOut.model_validate(t)
    except Exception:
        return None


@router.get("/api/trainer/bookings")
async def trainer_bookings_compat(
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
):
    from schemas.booking import BookingOut

    if not user:
        return []
    try:
        t = await trainer_service.get_trainer_by_user(db, user.user_id)
    except Exception:
        return []
    bookings = await booking_service.get_trainer_bookings(db, t.trainer_id)
    return [BookingOut.model_validate(b) for b in bookings]


@router.post("/api/lifestyle-assessment", response_model=LifestyleAssessmentOut, status_code=201)
async def submit_assessment(
    body: LifestyleAssessmentIn,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    bmi = round(body.weight_kg / ((body.height_cm / 100) ** 2), 2)

    rec = LifestyleAssessment(
        user_id=current_user.user_id if current_user else None,
        dine_out_frequency=body.dine_out_frequency,
        snack_frequency=body.snack_frequency,
        exercise_frequency=body.exercise_frequency,
        fitness_level=body.fitness_level,
        illness_status=body.illness_status,
        smoker_status=body.smoker_status,
        alcohol_status=body.alcohol_status,
        sleep_hours=body.sleep_hours,
        working_mood=body.working_mood,
        free_time_activity=body.free_time_activity,
        mental_health_condition=body.mental_health_condition,
        last_illness_time=body.last_illness_time,
        height_cm=body.height_cm,
        weight_kg=body.weight_kg,
        bmi=bmi,
        email=body.email,
        mobile=body.mobile,
        name=body.name,
        apartment_complex=body.apartment_complex,
    )
    db.add(rec)
    await db.flush()
    return LifestyleAssessmentOut.model_validate(rec)


@router.post("/api/contact", status_code=201)
async def contact(body: ContactIn, db: AsyncSession = Depends(get_db)):
    msg = ContactMessage(name=body.name, email=body.email, message=body.message)
    db.add(msg)
    return {"message": "Thanks for reaching out! We'll get back to you soon."}


@router.get("/health")
async def health():
    return {"status": "ok"}
