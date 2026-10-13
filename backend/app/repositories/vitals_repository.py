import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.vitals_log import VitalsLog
from app.repositories.base import BaseRepository


class VitalsRepository(BaseRepository[VitalsLog]):
    def __init__(self, db: Session):
        super().__init__(VitalsLog, db)

    def list_by_user(self, user_id: uuid.UUID, skip: int = 0, limit: int = 100) -> list[VitalsLog]:
        stmt = (
            select(VitalsLog)
            .where(VitalsLog.user_id == user_id)
            .order_by(VitalsLog.recorded_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.execute(stmt).scalars().all())
