from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class TrainerApplyIn(BaseModel):
    certifications: list[str] = Field(default_factory=list)
    experience_years: int = Field(ge=0, default=0)
    lat: float
    lng: float
    allowed_apartment_ids: list[UUID] = Field(default_factory=list)


class TrainerApplyOut(BaseModel):
    trainer_id: UUID
    status: Literal["pending", "approved", "rejected"]


class ApproveTrainerIn(BaseModel):
    trainer_id: UUID
    approve: bool
    reason: str | None = None


class ApartmentOut(BaseModel):
    id: UUID
    name: str


class TrainerOut(BaseModel):
    id: UUID
    user_id: UUID
    status: Literal["pending", "approved", "rejected"]
    experience_years: int
    certifications: list[str]


class AvailabilityIn(BaseModel):
    slot_start: datetime
    slot_end: datetime


class BookIn(BaseModel):
    apartment_id: UUID
    trainer_id: UUID
    slot_start: datetime
    slot_end: datetime


class BookOut(BaseModel):
    booking_id: UUID
    status: Literal["booked", "cancelled", "completed"]


class UserOut(BaseModel):
    id: UUID
    email: EmailStr
    name: str
    role: Literal["admin", "user", "trainer"]
