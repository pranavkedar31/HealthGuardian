import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.diet_plan import DietPlan
from app.repositories.base import BaseRepository


class DietRepository(BaseRepository[DietPlan]):
    def __init__(self, db: Session):
        super().__init__(DietPlan, db)

    def list_by_user(self, user_id: uuid.UUID) -> list[DietPlan]:
        stmt = select(DietPlan).where(DietPlan.user_id == user_id).order_by(DietPlan.created_at.desc())
        return list(self.db.execute(stmt).scalars().all())
