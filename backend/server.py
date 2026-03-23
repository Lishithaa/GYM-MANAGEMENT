from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Header
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import qrcode
import io
import base64
import requests

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logger = logging.getLogger(__name__)

CITIES_AREAS = {
    "Hyderabad": ["Banjara Hills", "Jubilee Hills", "Hitech City", "Gachibowli", "Kukatpally", "Madhapur"],
    "Bangalore": ["Koramangala", "Indiranagar", "Whitefield", "HSR Layout", "Electronic City", "Jayanagar"],
    "Guntur": ["Brodipet", "Lakshmipuram", "Arundelpet", "Nallapadu", "Pattabhipuram"]
}

def get_user_from_token(authorization: Optional[str], cookie_token: Optional[str]):
    token = None
    if cookie_token:
        token = cookie_token
    elif authorization and authorization.startswith('Bearer '):
        token = authorization.split(' ')[1]
    return token

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str = "user"
    created_at: datetime

class SessionExchange(BaseModel):
    session_id: str

class GymCreate(BaseModel):
    name: str
    city: str
    area: str
    description: str
    photos: List[str]
    amenities: List[str]
    hourly_rate: float

class Gym(BaseModel):
    gym_id: str
    owner_id: str
    name: str
    city: str
    area: str
    description: str
    photos: List[str]
    amenities: List[str]
    hourly_rate: float
    approved: bool
    rating: float
    reviews_count: int
    created_at: datetime

class TrainerCreate(BaseModel):
    gym_id: str
    bio: str
    photo: str
    specialty: str
    hourly_rate: float

class Trainer(BaseModel):
    trainer_id: str
    user_id: str
    gym_id: str
    bio: str
    photo: str
    specialty: str
    hourly_rate: float
    approved: bool
    rating: float
    reviews_count: int
    created_at: datetime

class BookingCreate(BaseModel):
    target_id: str
    target_type: str
    date: str
    start_time: str
    end_time: str
    amount: float

class Booking(BaseModel):
    booking_id: str
    user_id: str
    target_id: str
    target_type: str
    date: str
    start_time: str
    end_time: str
    amount: float
    status: str
    qr_code: str
    payment_id: Optional[str] = None
    created_at: datetime

class ReviewCreate(BaseModel):
    target_id: str
    target_type: str
    rating: int
    comment: str

class Review(BaseModel):
    review_id: str
    user_id: str
    target_id: str
    target_type: str
    rating: int
    comment: str
    user_name: str
    created_at: datetime

class ContactMessage(BaseModel):
    name: str
    email: str
    message: str

@api_router.post("/auth/session")
async def exchange_session(body: SessionExchange, response: Response):
    session_id = body.session_id
    
    try:
        auth_response = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
            timeout=10
        )
        
        if auth_response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        user_data = auth_response.json()
        
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        existing_user = await db.users.find_one({"email": user_data["email"]}, {"_id": 0})
        
        if existing_user:
            user_id = existing_user["user_id"]
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {
                    "name": user_data["name"],
                    "picture": user_data.get("picture")
                }}
            )
        else:
            await db.users.insert_one({
                "user_id": user_id,
                "email": user_data["email"],
                "name": user_data["name"],
                "picture": user_data.get("picture"),
                "role": "user",
                "created_at": datetime.now(timezone.utc)
            })
        
        session_token = user_data["session_token"]
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        
        await db.user_sessions.insert_one({
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc)
        })
        
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=True,
            samesite="none",
            path="/",
            max_age=7*24*60*60
        )
        
        user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        return {"user": user_doc, "session_token": session_token}
    
    except Exception as e:
        logger.error(f"Session exchange error: {str(e)}")
        raise HTTPException(status_code=500, detail="Authentication failed")

@api_router.get("/auth/me")
async def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(None)
):
    cookie_token = request.cookies.get("session_token")
    token = get_user_from_token(authorization, cookie_token)
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    cookie_token = request.cookies.get("session_token")
    
    if cookie_token:
        await db.user_sessions.delete_one({"session_token": cookie_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}

@api_router.get("/cities")
async def get_cities():
    return {"cities": list(CITIES_AREAS.keys())}

@api_router.get("/areas/{city}")
async def get_areas(city: str):
    if city not in CITIES_AREAS:
        raise HTTPException(status_code=404, detail="City not found")
    return {"areas": CITIES_AREAS[city]}

@api_router.post("/gyms", response_model=Gym)
async def create_gym(
    gym_data: GymCreate,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    cookie_token = request.cookies.get("session_token")
    token = get_user_from_token(authorization, cookie_token)
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user or user["role"] not in ["gym_owner", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    gym_id = f"gym_{uuid.uuid4().hex[:12]}"
    gym_doc = {
        "gym_id": gym_id,
        "owner_id": user["user_id"],
        **gym_data.model_dump(),
        "approved": False,
        "rating": 0.0,
        "reviews_count": 0,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.gyms.insert_one(gym_doc)
    return Gym(**gym_doc)

@api_router.get("/gyms", response_model=List[Gym])
async def get_gyms(
    city: Optional[str] = None,
    area: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None
):
    query = {"approved": True}
    
    if city:
        query["city"] = city
    if area:
        query["area"] = area
    if min_price is not None:
        query["hourly_rate"] = {"$gte": min_price}
    if max_price is not None:
        if "hourly_rate" in query:
            query["hourly_rate"]["$lte"] = max_price
        else:
            query["hourly_rate"] = {"$lte": max_price}
    
    gyms = await db.gyms.find(query, {"_id": 0}).to_list(100)
    return gyms

@api_router.get("/gyms/{gym_id}", response_model=Gym)
async def get_gym(gym_id: str):
    gym = await db.gyms.find_one({"gym_id": gym_id}, {"_id": 0})
    if not gym:
        raise HTTPException(status_code=404, detail="Gym not found")
    return gym

@api_router.post("/trainers", response_model=Trainer)
async def create_trainer(
    trainer_data: TrainerCreate,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    cookie_token = request.cookies.get("session_token")
    token = get_user_from_token(authorization, cookie_token)
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    trainer_id = f"trainer_{uuid.uuid4().hex[:12]}"
    trainer_doc = {
        "trainer_id": trainer_id,
        "user_id": session["user_id"],
        **trainer_data.model_dump(),
        "approved": False,
        "rating": 0.0,
        "reviews_count": 0,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.trainers.insert_one(trainer_doc)
    return Trainer(**trainer_doc)

@api_router.get("/trainers", response_model=List[Trainer])
async def get_trainers(
    gym_id: Optional[str] = None,
    specialty: Optional[str] = None
):
    query = {"approved": True}
    
    if gym_id:
        query["gym_id"] = gym_id
    if specialty:
        query["specialty"] = specialty
    
    trainers = await db.trainers.find(query, {"_id": 0}).to_list(100)
    return trainers

@api_router.get("/trainers/{trainer_id}", response_model=Trainer)
async def get_trainer(trainer_id: str):
    trainer = await db.trainers.find_one({"trainer_id": trainer_id}, {"_id": 0})
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")
    return trainer

@api_router.post("/bookings", response_model=Booking)
async def create_booking(
    booking_data: BookingCreate,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    cookie_token = request.cookies.get("session_token")
    token = get_user_from_token(authorization, cookie_token)
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    booking_id = f"booking_{uuid.uuid4().hex[:12]}"
    
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(f"HOURLYGYM-{booking_id}")
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    booking_doc = {
        "booking_id": booking_id,
        "user_id": session["user_id"],
        **booking_data.model_dump(),
        "status": "confirmed",
        "qr_code": qr_code_base64,
        "payment_id": f"pay_mock_{uuid.uuid4().hex[:12]}",
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.bookings.insert_one(booking_doc)
    
    response = JSONResponse(
        content=Booking(**booking_doc).model_dump(mode='json'),
        status_code=201
    )
    return response

@api_router.get("/bookings", response_model=List[Booking])
async def get_bookings(
    request: Request,
    authorization: Optional[str] = Header(None)
):
    cookie_token = request.cookies.get("session_token")
    token = get_user_from_token(authorization, cookie_token)
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    bookings = await db.bookings.find({"user_id": session["user_id"]}, {"_id": 0}).to_list(100)
    return bookings

@api_router.get("/bookings/{booking_id}", response_model=Booking)
async def get_booking(
    booking_id: str,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    cookie_token = request.cookies.get("session_token")
    token = get_user_from_token(authorization, cookie_token)
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking

@api_router.post("/reviews", response_model=Review)
async def create_review(
    review_data: ReviewCreate,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    cookie_token = request.cookies.get("session_token")
    token = get_user_from_token(authorization, cookie_token)
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    
    review_id = f"review_{uuid.uuid4().hex[:12]}"
    review_doc = {
        "review_id": review_id,
        "user_id": user["user_id"],
        "user_name": user["name"],
        **review_data.model_dump(),
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.reviews.insert_one(review_doc)
    
    collection = "gyms" if review_data.target_type == "gym" else "trainers"
    id_field = "gym_id" if review_data.target_type == "gym" else "trainer_id"
    
    all_reviews = await db.reviews.find({"target_id": review_data.target_id, "target_type": review_data.target_type}, {"_id": 0}).to_list(1000)
    avg_rating = sum(r["rating"] for r in all_reviews) / len(all_reviews)
    
    await db[collection].update_one(
        {id_field: review_data.target_id},
        {"$set": {"rating": round(avg_rating, 1), "reviews_count": len(all_reviews)}}
    )
    
    response = JSONResponse(
        content=Review(**review_doc).model_dump(mode='json'),
        status_code=201
    )
    return response

@api_router.get("/reviews/{target_type}/{target_id}", response_model=List[Review])
async def get_reviews(target_type: str, target_id: str):
    reviews = await db.reviews.find({"target_type": target_type, "target_id": target_id}, {"_id": 0}).to_list(100)
    return reviews

@api_router.post("/contact")
async def submit_contact(message: ContactMessage):
    message_id = f"msg_{uuid.uuid4().hex[:12]}"
    message_doc = {
        "message_id": message_id,
        **message.model_dump(),
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.contact_messages.insert_one(message_doc)
    return {"message": "Message sent successfully", "message_id": message_id}

@api_router.get("/admin/pending-approvals")
async def get_pending_approvals(
    request: Request,
    authorization: Optional[str] = Header(None)
):
    cookie_token = request.cookies.get("session_token")
    token = get_user_from_token(authorization, cookie_token)
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user or user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    pending_gyms = await db.gyms.find({"approved": False}, {"_id": 0}).to_list(100)
    pending_trainers = await db.trainers.find({"approved": False}, {"_id": 0}).to_list(100)
    
    return {
        "gyms": pending_gyms,
        "trainers": pending_trainers
    }

@api_router.post("/admin/approve/{item_type}/{item_id}")
async def approve_item(
    item_type: str,
    item_id: str,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    cookie_token = request.cookies.get("session_token")
    token = get_user_from_token(authorization, cookie_token)
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user or user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if item_type == "gym":
        await db.gyms.update_one({"gym_id": item_id}, {"$set": {"approved": True}})
    elif item_type == "trainer":
        await db.trainers.update_one({"trainer_id": item_id}, {"$set": {"approved": True}})
    else:
        raise HTTPException(status_code=400, detail="Invalid item type")
    
    return {"message": "Approved successfully"}

@api_router.get("/admin/stats")
async def get_admin_stats(
    request: Request,
    authorization: Optional[str] = Header(None)
):
    cookie_token = request.cookies.get("session_token")
    token = get_user_from_token(authorization, cookie_token)
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user or user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    total_gyms = await db.gyms.count_documents({"approved": True})
    total_trainers = await db.trainers.count_documents({"approved": True})
    total_bookings = await db.bookings.count_documents({})
    
    city_stats = []
    for city in CITIES_AREAS.keys():
        gym_count = await db.gyms.count_documents({"city": city, "approved": True})
        booking_count = await db.bookings.count_documents({})
        city_stats.append({
            "city": city,
            "gyms": gym_count,
            "bookings": booking_count
        })
    
    return {
        "total_gyms": total_gyms,
        "total_trainers": total_trainers,
        "total_bookings": total_bookings,
        "city_stats": city_stats
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
