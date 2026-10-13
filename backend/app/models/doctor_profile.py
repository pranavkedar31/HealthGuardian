import uuid
from typing import Optional

from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin, UUIDMixin
from app.db.types import GUID


class DoctorProfile(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "doctor_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    specialization: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    qualification: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    experience_years: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    hospital_name: Mapped[str] = mapped_column(String(200), nullable=False)
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    area: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    pincode: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    consultation_fee: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    available_days: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default="Mon,Tue,Wed,Thu,Fri,Sat")
    available_time_start: Mapped[Optional[str]] = mapped_column(String(10), nullable=True, default="09:00")
    available_time_end: Mapped[Optional[str]] = mapped_column(String(10), nullable=True, default="18:00")
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    profile_image: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    medical_registration_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    medical_registration_council: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    verification_status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)

    user: Mapped["User"] = relationship(back_populates="doctor_profile")
