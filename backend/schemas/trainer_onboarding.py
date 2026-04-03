from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class BasicProfileIn(BaseModel):
    bio: str
    specialty: str
    experience_brief: str
    photo: str
    city: str
    area: str
    hourly_rate: float
    gender: str
    languages: list[str] = Field(default_factory=list)
    lat: Optional[float] = None
    lng: Optional[float] = None


class KycIn(BaseModel):
    aadhar_number: str
    digilocker_kyc: bool = False
    pan_number: str
    pan_upload_url: str
    video_verification_url: str


class BankDetailsIn(BaseModel):
    bank_account_name: str
    bank_account_number: str
    bank_ifsc: str


class AvailabilityIn(BaseModel):
    available_days: list[str] = Field(default_factory=list)
    availability_slots: list[str] = Field(default_factory=list)
    travel_radius: int = 5
    service_areas: list[str] = Field(default_factory=list)
    service_polygon: list[dict] = Field(default_factory=list)


class CertificatesIn(BaseModel):
    certifications: Optional[str] = None
    certification_upload_urls: list[str] = Field(default_factory=list)
    video_intro: Optional[str] = None
    photo_branding_enabled: bool = True
    declaration_accepted: bool = False


class OnboardingStartOut(BaseModel):
    onboarding_id: str
    status: str


class OnboardingStepPatchIn(BaseModel):
    step: Literal["basic_profile", "kyc", "bank", "availability", "certificates"]
    basic_profile: Optional[BasicProfileIn] = None
    kyc: Optional[KycIn] = None
    bank: Optional[BankDetailsIn] = None
    availability: Optional[AvailabilityIn] = None
    certificates: Optional[CertificatesIn] = None


class AdminDecisionIn(BaseModel):
    reason: str


class TrainerOnboardingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    onboarding_id: str
    user_id: str
    trainer_id: Optional[str]
    status: str
    last_step: Optional[str]
    basic_profile: dict = Field(default_factory=dict)
    kyc: dict = Field(default_factory=dict)
    bank: dict = Field(default_factory=dict)
    availability: dict = Field(default_factory=dict)
    certificates: dict = Field(default_factory=dict)
    declaration_accepted: bool
    admin_reason: Optional[str]
    submitted_at: Optional[datetime]
    reviewed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
