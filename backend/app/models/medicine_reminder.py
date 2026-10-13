import uuid
from datetime import datetime, time
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.types import GUID
from app.db.base_class import Base, TimestampMixin, UUIDMixin


class MedicineReminder(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "medicine_reminders"

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    medicine_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    dosage: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )

    reminder_time: Mapped[time] = mapped_column(
        Time,
        nullable=False,
    )

    frequency: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    title: Mapped[Optional[str]] = mapped_column(
        String(150),
        nullable=True,
    )

    note: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )

    whatsapp_number: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
    )

    # browser = simple browser notification
    # whatsapp = WhatsApp notification
    notification_method: Mapped[str] = mapped_column(
        String(20),
        default="browser",
        nullable=False,
    )

    # Prevent sending the same reminder repeatedly
    last_notified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    next_trigger_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    last_triggered_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    delivery_status: Mapped[str] = mapped_column(
        String(20),
        default="PENDING",
        nullable=False,
    )

    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    snooze_until: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    user: Mapped["User"] = relationship(
        back_populates="medicine_reminders"
    )