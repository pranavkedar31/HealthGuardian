import uuid
from typing import TYPE_CHECKING, Optional

from sqlalchemy import JSON, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin, UUIDMixin
from app.db.types import GUID

if TYPE_CHECKING:
    from app.models.user import User


class DietPlan(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "diet_plans"

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    goal: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    daily_calories: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    meals: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    user: Mapped["User"] = relationship(back_populates="diet_plans")
