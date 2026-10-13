from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.vitals_repository import VitalsRepository
from app.schemas.vitals import VitalsLogCreate


class VitalsService:
    def __init__(self, db: Session):
        self.repo = VitalsRepository(db)

    def log_vitals(self, user: User, data: VitalsLogCreate):
        payload = data.model_dump()
        payload["user_id"] = user.id
        return self.repo.create(payload)

    def history(self, user: User, skip: int = 0, limit: int = 50):
        return self.repo.list_by_user(user.id, skip, limit)
