from sqlalchemy.orm import Session

from app.ai.symptom_checker import get_symptom_checker
from app.models.user import User
from app.repositories.ai_log_repository import AILogRepository
from app.repositories.symptom_repository import SymptomRepository
from app.schemas.symptom import SymptomCheckRequest


class SymptomService:
    def __init__(self, db: Session):
        self.repo = SymptomRepository(db)
        self.ai_log_repo = AILogRepository(db)

    def check_symptoms(self, user: User, data: SymptomCheckRequest) -> dict:
        checker = get_symptom_checker()
        result = checker.predict(data.symptoms)

        self.repo.create(
            {
                "user_id": user.id,
                "symptoms": data.symptoms,
                "notes": data.notes,
                "predicted_condition": result["predicted_condition"],
                "confidence": result["confidence"],
                "severity": result["severity"],
            }
        )
        self.ai_log_repo.create(
            {
                "user_id": user.id,
                "module": "symptom_checker",
                "input_payload": {"symptoms": data.symptoms},
                "output_payload": result,
                "success": True,
            }
        )
        return result

    def history(self, user: User, skip: int = 0, limit: int = 50):
        return self.repo.list_by_user(user.id, skip, limit)
