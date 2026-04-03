from pydantic import BaseModel, ConfigDict
from typing import List, Optional


class TrainerIn(BaseModel):
    bio: str
    photo: str
    specialty: str
    hourly_rate: float
    city: str
    area: str
    gender: str
    languages: List[str]
    certifications: Optional[str] = None
    video_intro: Optional[str] = None
    travel_radius: int
    available_days: List[str]
    video_verification_url: Optional[str] = None
    aadhar_number: Optional[str] = None
    digilocker_kyc: bool = False
    pan_number: Optional[str] = None
    pan_upload_url: Optional[str] = None
    certification_upload_urls: List[str] = []
    experience_brief: Optional[str] = None
    bank_account_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    service_areas: List[str] = []
    availability_slots: List[str] = []
    photo_branding_enabled: bool = True
    lat: Optional[float] = None
    lng: Optional[float] = None


class TrainerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    trainer_id: str
    user_id: str
    bio: str
    photo: str
    specialty: str
    hourly_rate: float
    city: str
    area: str
    gender: str
    languages: List[str]
    certifications: Optional[str]
    video_intro: Optional[str]
    travel_radius: int
    available_days: List[str]
    service_areas: List[str]
    availability_slots: List[str]
    lat: Optional[float]
    lng: Optional[float]
    approved: bool
    rating: float
    reviews_count: int
