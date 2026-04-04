from typing import Optional

from pydantic import BaseModel, ConfigDict


class PartnerRequestIn(BaseModel):
    organization_name: str
    contact_name: str
    email: str
    phone: Optional[str] = None
    message: str


class PartnerRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    request_id: str
    organization_name: str
    contact_name: str
    email: str
    phone: Optional[str]
    message: str
    status: str
    admin_note: Optional[str]
    created_at: object


class ComplaintCreateIn(BaseModel):
    about_user_id: Optional[str] = None
    about_trainer_id: Optional[str] = None
    subject: str
    body: str


class ComplaintOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    complaint_id: str
    from_user_id: str
    about_user_id: str
    subject: str
    body: str
    status: str
    admin_resolution_note: Optional[str]
    created_at: object


class TrainerLocationPatch(BaseModel):
    lat: float
    lng: float


class PartnerStatusPatch(BaseModel):
    status: str
    admin_note: Optional[str] = None


class ComplaintStatusPatch(BaseModel):
    status: str
    admin_resolution_note: Optional[str] = None
