import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.health_profile import HealthProfile
from app.repositories.base import BaseRepository


class HealthProfileRepository(BaseRepository[HealthProfile]):
    def __init__(self, db: Session):
        super().__init__(HealthProfile, db)

    def get_by_user_id(self, user_id: uuid.UUID) -> Optional[HealthProfile]:
        stmt = select(HealthProfile).where(HealthProfile.user_id == user_id)
        return self.db.execute(stmt).scalar_one_or_none()
