from sqlalchemy.orm import Session

from app.ai.bmi_calculator import calculate_bmi
from app.ai.risk_predictor import get_risk_predictor
from app.models.user import User
from app.repositories.ai_log_repository import AILogRepository
from app.schemas.prediction import BMIRequest, RiskPredictionRequest


class PredictionService:
    def __init__(self, db: Session):
        self.ai_log_repo = AILogRepository(db)

    def predict_risk(self, user: User, data: RiskPredictionRequest) -> dict:
        predictor = get_risk_predictor()
        result = predictor.predict(
            age=data.age,
            bmi=data.bmi,
            blood_pressure_systolic=data.blood_pressure_systolic,
            blood_sugar=data.blood_sugar,
            smoking=data.smoking,
            alcohol=data.alcohol,
        )
        self.ai_log_repo.create(
            {
                "user_id": user.id,
                "module": "risk_predictor",
                "input_payload": data.model_dump(),
                "output_payload": result,
                "success": True,
            }
        )
        return result

    @staticmethod
    def calculate_bmi(data: BMIRequest) -> dict:
        return calculate_bmi(data.height_cm, data.weight_kg)
