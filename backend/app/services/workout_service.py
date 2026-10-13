from sqlalchemy.orm import Session

from app.ai.diet_workout_generator import generate_workout_plan
from app.models.user import User
from app.repositories.workout_repository import WorkoutRepository
from app.schemas.workout import WorkoutPlanRequest


class WorkoutService:
    def __init__(self, db: Session):
        self.repo = WorkoutRepository(db)

    def generate(self, user: User, data: WorkoutPlanRequest):
        plan = generate_workout_plan(
            goal=data.goal, difficulty=data.difficulty, days_per_week=data.days_per_week
        )
        payload = {"user_id": user.id, **plan}
        return self.repo.create(payload)

    def history(self, user: User):
        return self.repo.list_by_user(user.id)
