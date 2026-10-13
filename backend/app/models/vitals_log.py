import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.types import GUID

from app.db.base_class import Base, TimestampMixin, UUIDMixin


class VitalsLog(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "vitals_logs"

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    heart_rate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    blood_pressure_systolic: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    blood_pressure_diastolic: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    blood_sugar: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    spo2: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    temperature: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="vitals_logs")
