from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class PromoCodeIn(BaseModel):
    code: str
    discount_percent: int
    max_uses: int
    valid_until: str


class PromoCodePatch(BaseModel):
    discount_percent: Optional[int] = None
    max_uses: Optional[int] = None
    valid_until: Optional[str] = None


class PromoCodeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str
    discount_percent: int
    max_uses: int
    uses: int
    valid_until: str


class ContactIn(BaseModel):
    name: str
    email: str
    message: str


class LifestyleAssessmentIn(BaseModel):
    dine_out_frequency: str
    snack_frequency: str
    exercise_frequency: str
    fitness_level: str
    illness_status: str
    smoker_status: str
    alcohol_status: str
    sleep_hours: str
    working_mood: str
    free_time_activity: str
    mental_health_condition: str
    last_illness_time: str
    height_cm: float
    weight_kg: float
    email: str
    mobile: str
    name: str
    apartment_complex: str


class LifestyleAssessmentOut(LifestyleAssessmentIn):
    model_config = ConfigDict(from_attributes=True)

    assessment_id: str
    user_id: Optional[str]
    bmi: float
    created_at: datetime
