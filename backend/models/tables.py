import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, Column, DateTime, Enum as SAEnum,
    Float, ForeignKey, Integer, JSON, String, Text, DECIMAL,
)
from database import Base


class UserRoleEnum(str, enum.Enum):
    USER = "user"
    TRAINER = "trainer"
    ADMIN = "admin"


class BookingStatusEnum(str, enum.Enum):
    INITIATED = "initiated"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TrainerOnboardingStatusEnum(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    REWORK_REQUIRED = "rework_required"


def _now():
    return datetime.now(timezone.utc)


def _uid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(24), unique=True, nullable=False, index=True, default=lambda: _uid("user"))
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    role = Column(SAEnum(UserRoleEnum), nullable=False, default=UserRoleEnum.USER)
    is_verified = Column(Boolean, nullable=False, default=False)
    picture = Column(String(500), nullable=True)
    is_banned = Column(Boolean, nullable=False, default=False)
    referral_code = Column(String(16), unique=True, nullable=True, index=True)
    referred_by_user_id = Column(String(24), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime, nullable=False, default=_now)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    token = Column(String(512), unique=True, nullable=False, index=True)
    user_id = Column(String(24), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, nullable=False, default=_now)
    expires_at = Column(DateTime, nullable=False)


class Trainer(Base):
    __tablename__ = "trainers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trainer_id = Column(String(24), unique=True, nullable=False, index=True, default=lambda: _uid("trainer"))
    user_id = Column(String(24), ForeignKey("users.user_id"), nullable=False)
    bio = Column(Text, nullable=False)
    photo = Column(String(500), nullable=False)
    specialty = Column(String(255), nullable=False, index=True)
    hourly_rate = Column(DECIMAL(10, 2), nullable=False)
    city = Column(String(100), nullable=False, index=True)
    area = Column(String(100), nullable=False, index=True)
    gender = Column(String(20), nullable=False)
    languages = Column(JSON, nullable=False, default=list)
    certifications = Column(String(500), nullable=True)
    video_intro = Column(String(500), nullable=True)
    travel_radius = Column(Integer, nullable=False, default=5)
    available_days = Column(JSON, nullable=False, default=list)
    video_verification_url = Column(String(500), nullable=True)
    aadhar_number = Column(String(20), nullable=True)
    digilocker_kyc = Column(Boolean, nullable=False, default=False)
    pan_number = Column(String(15), nullable=True)
    pan_upload_url = Column(String(500), nullable=True)
    certification_upload_urls = Column(JSON, nullable=False, default=list)
    experience_brief = Column(Text, nullable=True)
    bank_account_name = Column(String(255), nullable=True)
    bank_account_number = Column(String(50), nullable=True)
    bank_ifsc = Column(String(20), nullable=True)
    service_areas = Column(JSON, nullable=False, default=list)
    availability_slots = Column(JSON, nullable=False, default=list)
    photo_branding_enabled = Column(Boolean, nullable=False, default=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    approved = Column(Boolean, nullable=False, default=False)
    rejected = Column(Boolean, nullable=False, default=False)
    rating = Column(Float, nullable=False, default=0.0)
    reviews_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=_now)

    @property
    def verification_status(self) -> str:
        if self.approved:
            return "approved"
        if self.rejected:
            return "rejected"
        return "under_review"


class TrainerOnboarding(Base):
    __tablename__ = "trainer_onboarding"

    id = Column(Integer, primary_key=True, autoincrement=True)
    onboarding_id = Column(String(24), unique=True, nullable=False, index=True, default=lambda: _uid("tonb"))
    user_id = Column(String(24), ForeignKey("users.user_id"), nullable=False, index=True)
    trainer_id = Column(String(24), ForeignKey("trainers.trainer_id"), nullable=True, index=True)
    status = Column(
        SAEnum(TrainerOnboardingStatusEnum),
        nullable=False,
        default=TrainerOnboardingStatusEnum.DRAFT,
        index=True,
    )
    last_step = Column(String(50), nullable=True)
    basic_profile = Column(JSON, nullable=False, default=dict)
    kyc = Column(JSON, nullable=False, default=dict)
    bank = Column(JSON, nullable=False, default=dict)
    availability = Column(JSON, nullable=False, default=dict)
    certificates = Column(JSON, nullable=False, default=dict)
    declaration_accepted = Column(Boolean, nullable=False, default=False)
    admin_reason = Column(Text, nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=_now)
    updated_at = Column(DateTime, nullable=False, default=_now, onupdate=_now)


class TrainerDocument(Base):
    __tablename__ = "trainer_documents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(String(24), unique=True, nullable=False, index=True, default=lambda: _uid("tdoc"))
    onboarding_id = Column(
        String(24),
        ForeignKey("trainer_onboarding.onboarding_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(String(24), ForeignKey("users.user_id"), nullable=False, index=True)
    document_type = Column(String(50), nullable=False, index=True)
    document_url = Column(String(500), nullable=False)
    verification_status = Column(String(20), nullable=False, default="pending")
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=_now)


class TrainerVerificationEvent(Base):
    __tablename__ = "trainer_verification_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(String(24), unique=True, nullable=False, index=True, default=lambda: _uid("tve"))
    onboarding_id = Column(
        String(24),
        ForeignKey("trainer_onboarding.onboarding_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    actor_user_id = Column(String(24), nullable=False, index=True)
    action = Column(String(50), nullable=False, index=True)
    note = Column(Text, nullable=True)
    meta = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, default=_now)


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    booking_id = Column(String(24), unique=True, nullable=False, index=True, default=lambda: _uid("booking"))
    user_id = Column(String(24), ForeignKey("users.user_id"), nullable=False, index=True)
    target_id = Column(String(24), nullable=False, index=True)
    target_type = Column(String(20), nullable=False)
    date = Column(String(20), nullable=False)
    start_time = Column(String(10), nullable=False)
    end_time = Column(String(10), nullable=False)
    original_amount = Column(DECIMAL(10, 2), nullable=False)
    discount = Column(DECIMAL(10, 2), nullable=False, default=0)
    amount = Column(DECIMAL(10, 2), nullable=False)
    promo_code = Column(String(50), nullable=True)
    status = Column(SAEnum(BookingStatusEnum), nullable=False, default=BookingStatusEnum.CONFIRMED)
    qr_code = Column(Text, nullable=True)
    idempotency_key = Column(String(64), unique=True, nullable=True, index=True)
    payment_id = Column(String(64), nullable=True)
    razorpay_order_id = Column(String(64), nullable=True, index=True)
    created_at = Column(DateTime, nullable=False, default=_now)
    completed_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, autoincrement=True)
    review_id = Column(String(24), unique=True, nullable=False, default=lambda: _uid("review"))
    user_id = Column(String(24), ForeignKey("users.user_id"), nullable=False)
    user_name = Column(String(255), nullable=False)
    target_id = Column(String(24), nullable=False, index=True)
    target_type = Column(String(20), nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=_now)


class PromoCode(Base):
    __tablename__ = "promo_codes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    discount_percent = Column(Integer, nullable=False)
    max_uses = Column(Integer, nullable=False)
    uses = Column(Integer, nullable=False, default=0)
    valid_until = Column(String(20), nullable=False)
    created_at = Column(DateTime, nullable=False, default=_now)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    log_id = Column(String(24), nullable=False)
    action = Column(String(100), nullable=False, index=True)
    user_id = Column(String(24), nullable=False, index=True)
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(String(50), nullable=False)
    meta = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, default=_now)


class LifestyleAssessment(Base):
    __tablename__ = "lifestyle_assessments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    assessment_id = Column(String(24), unique=True, nullable=False, default=lambda: _uid("life"))
    user_id = Column(String(24), nullable=True)
    dine_out_frequency = Column(String(50), nullable=False)
    snack_frequency = Column(String(50), nullable=False)
    exercise_frequency = Column(String(50), nullable=False)
    fitness_level = Column(String(50), nullable=False)
    illness_status = Column(String(50), nullable=False)
    smoker_status = Column(String(50), nullable=False)
    alcohol_status = Column(String(50), nullable=False)
    sleep_hours = Column(String(50), nullable=False)
    working_mood = Column(String(50), nullable=False)
    free_time_activity = Column(String(50), nullable=False)
    mental_health_condition = Column(String(50), nullable=False)
    last_illness_time = Column(String(50), nullable=False)
    height_cm = Column(Float, nullable=False)
    weight_kg = Column(Float, nullable=False)
    bmi = Column(Float, nullable=False)
    email = Column(String(255), nullable=False)
    mobile = Column(String(20), nullable=False)
    name = Column(String(255), nullable=False)
    apartment_complex = Column(String(255), nullable=False)
    created_at = Column(DateTime, nullable=False, default=_now)


class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    message_id = Column(String(24), nullable=False, default=lambda: _uid("msg"))
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=_now)


class PartnerRequest(Base):
    __tablename__ = "partner_requests"

    id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(String(24), unique=True, nullable=False, index=True, default=lambda: _uid("part"))
    organization_name = Column(String(255), nullable=False)
    contact_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(40), nullable=True)
    message = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="pending", index=True)
    admin_note = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=_now)


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, autoincrement=True)
    complaint_id = Column(String(24), unique=True, nullable=False, index=True, default=lambda: _uid("cmp"))
    from_user_id = Column(String(24), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    about_user_id = Column(String(24), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    subject = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="open", index=True)
    admin_resolution_note = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=_now)
