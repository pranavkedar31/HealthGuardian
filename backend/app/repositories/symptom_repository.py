import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.symptom_log import SymptomLog
from app.repositories.base import BaseRepository


class SymptomRepository(BaseRepository[SymptomLog]):
    def __init__(self, db: Session):
        super().__init__(SymptomLog, db)

    def list_by_user(self, user_id: uuid.UUID, skip: int = 0, limit: int = 100) -> list[SymptomLog]:
        stmt = (
            select(SymptomLog)
            .where(SymptomLog.user_id == user_id)
            .order_by(SymptomLog.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.execute(stmt).scalars().all())
