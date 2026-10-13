import uuid
from typing import Optional

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.types import GUID, StringArray

from app.db.base_class import Base, TimestampMixin, UUIDMixin


class SymptomLog(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "symptom_logs"

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    symptoms: Mapped[list[str]] = mapped_column(StringArray(), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    predicted_condition: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    confidence: Mapped[Optional[float]] = mapped_column(nullable=True)
    severity: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    user: Mapped["User"] = relationship(back_populates="symptom_logs")
