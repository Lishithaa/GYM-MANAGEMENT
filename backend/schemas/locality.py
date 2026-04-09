from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class ApartmentIn(BaseModel):
    city: str = Field(min_length=1, max_length=100)
    locality: str = Field(min_length=1, max_length=120)
    name: str = Field(min_length=1, max_length=255)
    lat: Optional[float] = None
    lng: Optional[float] = None
    is_active: bool = True


class ApartmentPatch(BaseModel):
    city: Optional[str] = Field(default=None, min_length=1, max_length=100)
    locality: Optional[str] = Field(default=None, min_length=1, max_length=120)
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    lat: Optional[float] = None
    lng: Optional[float] = None
    is_active: Optional[bool] = None


class ApartmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    apartment_id: str
    city: str
    locality: str
    name: str
    lat: Optional[float]
    lng: Optional[float]
    is_active: bool
    created_at: datetime


class TrainerApartmentOut(BaseModel):
    apartment_id: str
    trainer_id: str
    active: bool
    created_at: datetime


class TrainerInvitationIn(BaseModel):
    trainer_id: str
    apartment_id: str
    date: str
    start_time: str
    end_time: str
    workout: Optional[str] = None
    amount: float = Field(ge=0)
    note: Optional[str] = None


class InvitationDecisionIn(BaseModel):
    accept: bool


class TrainerInvitationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    invitation_id: str
    user_id: str
    trainer_id: str
    apartment_id: str
    date: str
    start_time: str
    end_time: str
    workout: Optional[str]
    amount: float
    note: Optional[str]
    status: str
    booking_id: Optional[str]
    created_at: datetime
    responded_at: Optional[datetime]


class UserNotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    notification_id: str
    user_id: str
    kind: str
    title: str
    body: str
    payload: Optional[dict[str, Any]]
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime]
