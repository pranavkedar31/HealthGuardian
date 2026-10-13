import uuid
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin, UUIDMixin
from app.db.types import GUID, StringArray

if TYPE_CHECKING:
    from app.models.user import User


class HealthProfile(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "health_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    age: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    date_of_birth: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    height_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    weight_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    blood_group: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)
    allergies: Mapped[Optional[list[str]]] = mapped_column(StringArray(), nullable=True)
    chronic_conditions: Mapped[Optional[list[str]]] = mapped_column(StringArray(), nullable=True)
    smoking: Mapped[Optional[bool]] = mapped_column(nullable=True)
    alcohol: Mapped[Optional[bool]] = mapped_column(nullable=True)

    user: Mapped["User"] = relationship(back_populates="health_profile")
