import uuid
from typing import Optional

from sqlalchemy import JSON, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column
from app.db.types import GUID

from app.db.base_class import Base, TimestampMixin, UUIDMixin


class AILog(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "ai_logs"

    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    module: Mapped[str] = mapped_column(String(50), nullable=False)
    input_payload: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    output_payload: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    success: Mapped[bool] = mapped_column(default=True, nullable=False)
