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
    "Hyderabad": sorted(
        {
            "Ameerpet",
            "Banjara Hills",
            "Begumpet",
            "Chandanagar",
            "Charminar / Old City",
            "Dilsukhnagar",
            "Film Nagar",
            "Financial District",
            "Gachibowli",
            "Hitech City",
            "Jubilee Hills",
            "Kokapet",
            "Kompally",
            "Kondapur",
            "Kukatpally",
            "LB Nagar",
            "Madhapur",
            "Manikonda",
            "Mehdipatnam",
            "Miyapur",
            "Nagole",
            "Nanakramguda",
            "Nallagandla",
            "Secunderabad",
            "Serilingampally",
            "Shamshabad",
            "Shamirpet",
            "Somajiguda",
            "SR Nagar",
            "Tolichowki",
            "Uppal",
            "Vanasthalipuram",
            "Yousufguda",
        }
    ),
    "Bangalore": sorted(
        {
            "Bellandur",
            "BTM Layout",
            "Electronic City",
            "HSR Layout",
            "Indiranagar",
            "Jayanagar",
            "JP Nagar",
            "Koramangala",
            "Marathahalli",
            "MG Road / Ulsoor",
            "Rajajinagar",
            "Whitefield",
            "Yelahanka",
        }
    ),
    "Guntur": sorted(
        {
            "Arundelpet",
            "Brodipet",
            "Lakshmipuram",
            "Nallapadu",
            "Pattabhipuram",
            "Pedakakani",
            "Phoenix Mall area",
            "Reddy Bazar",
        }
    ),
    "Mumbai": sorted(
        {
            "Andheri",
            "Bandra",
            "Borivali",
            "Chembur",
            "Colaba",
            "Goregaon",
            "Juhu",
            "Lower Parel",
            "Navi Mumbai",
            "Powai",
            "Thane",
            "Worli",
        }
    ),
    "Chennai": sorted(
        {
            "Adyar",
            "Anna Nagar",
            "OMR",
            "Porur",
            "T Nagar",
            "Tambaram",
            "Velachery",
        }
    ),
    "Pune": sorted(
        {
            "Baner",
            "Hinjewadi",
            "Kharadi",
            "Kondhwa",
            "Koregaon Park",
            "Kothrud",
            "Viman Nagar",
            "Wakad",
        }
    ),
    "Delhi NCR": sorted(
        {
            "Connaught Place",
            "Dwarka",
            "Ghaziabad",
            "Golf Course Road (Gurgaon)",
            "Greater Noida",
            "Gurgaon",
            "Noida",
            "South Delhi",
            "Vasant Kunj",
        }
    ),
    "Kolkata": sorted(
        {
            "Alipore",
            "Howrah",
            "New Town",
            "Park Street",
            "Salt Lake",
            "South Kolkata",
        }
    ),
    "Ahmedabad": sorted(
        {
            "Maninagar",
            "Navrangpura",
            "Satellite",
            "SG Highway",
            "Vastrapur",
        }
    ),
}

# Order shown under "Popular cities" in the UI (reference: tier-1 metros + existing regions).
POPULAR_CITY_ORDER = [
    "Bangalore",
    "Delhi NCR",
    "Hyderabad",
    "Mumbai",
    "Chennai",
    "Pune",
    "Guntur",
    "Kolkata",
    "Ahmedabad",
]


def _areas_for_city(city: str) -> list[str]:
    if not city or not city.strip():
        return []
    key = city.strip()
    if key in CITIES_AREAS:
        return list(CITIES_AREAS[key])
    lowered = key.lower()
    for name, areas in CITIES_AREAS.items():
        if name.lower() == lowered:
            return list(areas)
    return []


@router.get("/api/cities")
async def cities():
    all_cities = sorted(CITIES_AREAS.keys())
    popular = [c for c in POPULAR_CITY_ORDER if c in CITIES_AREAS]
    return {"cities": all_cities, "popular": popular}


@router.get("/api/areas/{city}")
async def areas(city: str):
    return {"areas": _areas_for_city(city)}


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
        return trainer_service.to_trainer_out(t, user.name)
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
