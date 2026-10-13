import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.medicine_reminder import MedicineReminder
from app.repositories.base import BaseRepository


class ReminderRepository(BaseRepository[MedicineReminder]):
    def __init__(self, db: Session):
        super().__init__(MedicineReminder, db)

    def list_by_user(self, user_id: uuid.UUID) -> list[MedicineReminder]:
        stmt = (
            select(MedicineReminder)
            .where(MedicineReminder.user_id == user_id)
            .order_by(MedicineReminder.created_at.desc())
        )
        return list(self.db.execute(stmt).scalars().all())
