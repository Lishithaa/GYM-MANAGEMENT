import uuid

from geoalchemy2 import Geography
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        CheckConstraint("role IN ('admin','user','trainer')", name="ck_users_role"),
    )


class Apartment(Base):
    __tablename__ = "apartments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, index=True)
    location = Column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class Trainer(Base):
    __tablename__ = "trainers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    certifications = Column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    experience_years = Column(Integer, nullable=False, server_default=text("0"))
    location = Column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    status = Column(String(20), nullable=False, index=True, server_default=text("'pending'"))
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        CheckConstraint("status IN ('pending','approved','rejected')", name="ck_trainers_status"),
    )


class TrainerApartment(Base):
    __tablename__ = "trainer_apartments"

    trainer_id = Column(UUID(as_uuid=True), ForeignKey("trainers.id", ondelete="CASCADE"), primary_key=True)
    apartment_id = Column(UUID(as_uuid=True), ForeignKey("apartments.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class TrainerAvailability(Base):
    __tablename__ = "trainer_availability"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trainer_id = Column(UUID(as_uuid=True), ForeignKey("trainers.id", ondelete="CASCADE"), nullable=False, index=True)
    slot_start = Column(DateTime(timezone=True), nullable=False, index=True)
    slot_end = Column(DateTime(timezone=True), nullable=False, index=True)
    is_available = Column(Boolean, nullable=False, server_default=text("true"))

    __table_args__ = (
        UniqueConstraint("trainer_id", "slot_start", "slot_end", name="uq_trainer_availability_slot"),
    )


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    trainer_id = Column(UUID(as_uuid=True), ForeignKey("trainers.id", ondelete="RESTRICT"), nullable=False, index=True)
    apartment_id = Column(UUID(as_uuid=True), ForeignKey("apartments.id", ondelete="RESTRICT"), nullable=False, index=True)
    slot_start = Column(DateTime(timezone=True), nullable=False, index=True)
    slot_end = Column(DateTime(timezone=True), nullable=False, index=True)
    status = Column(String(20), nullable=False, index=True, server_default=text("'booked'"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        CheckConstraint("status IN ('booked','cancelled','completed')", name="ck_bookings_status"),
    )
