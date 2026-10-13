import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.workout_plan import WorkoutPlan
from app.repositories.base import BaseRepository


class WorkoutRepository(BaseRepository[WorkoutPlan]):
    def __init__(self, db: Session):
        super().__init__(WorkoutPlan, db)

    def list_by_user(self, user_id: uuid.UUID) -> list[WorkoutPlan]:
        stmt = select(WorkoutPlan).where(WorkoutPlan.user_id == user_id).order_by(WorkoutPlan.created_at.desc())
        return list(self.db.execute(stmt).scalars().all())
