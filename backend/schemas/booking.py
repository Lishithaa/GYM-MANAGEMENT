from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class BookingIn(BaseModel):
    target_id: str
    target_type: str
    date: str
    start_time: str
    end_time: str
    amount: float
    promo_code: Optional[str] = None
    idempotency_key: Optional[str] = None


class RazorpayConfirmIn(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class BookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    booking_id: str
    user_id: str
    target_id: str
    target_type: str
    date: str
    start_time: str
    end_time: str
    original_amount: float
    discount: float
    amount: float
    promo_code: Optional[str]
    status: str
    qr_code: Optional[str]
    payment_id: Optional[str]
    razorpay_order_id: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime]
    cancelled_at: Optional[datetime]


class BookingCreateResult(BaseModel):
    booking: BookingOut
    razorpay_key_id: str
    razorpay_order_id: str
    amount: int
    currency: str = "INR"


class ReviewIn(BaseModel):
    target_id: str
    target_type: str
    rating: int
    comment: str


class ReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    review_id: str
    user_id: str
    user_name: str
    target_id: str
    target_type: str
    rating: int
    comment: str
    created_at: datetime
