from sqlalchemy.orm import Session

from app.ai.diet_workout_generator import generate_diet_plan
from app.models.user import User
from app.repositories.diet_repository import DietRepository
from app.repositories.health_profile_repository import HealthProfileRepository
from app.schemas.diet import DietPlanRequest


class DietService:
    def __init__(self, db: Session):
        self.repo = DietRepository(db)
        self.profile_repo = HealthProfileRepository(db)

    def generate(self, user: User, data: DietPlanRequest):
        profile = self.profile_repo.get_by_user_id(user.id)
        weight = profile.weight_kg if profile and profile.weight_kg else 70
        height = profile.height_cm if profile and profile.height_cm else 170
        age = profile.age if profile and profile.age else 30
        gender = profile.gender if profile and profile.gender else "male"

        plan = generate_diet_plan(
            goal=data.goal,
            weight_kg=weight,
            height_cm=height,
            age=age,
            gender=gender,
            dietary_preference=data.dietary_preference,
        )
        payload = {"user_id": user.id, **plan}
        return self.repo.create(payload)

    def history(self, user: User):
        return self.repo.list_by_user(user.id)
