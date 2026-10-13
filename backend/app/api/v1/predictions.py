from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.prediction import (
    BMIRequest,
    BMIResult,
    RiskPredictionRequest,
    RiskPredictionResult,
)
from app.services.prediction_service import PredictionService

router = APIRouter(prefix="/predictions", tags=["AI Predictions"])


@router.post("/risk", response_model=RiskPredictionResult)
def predict_risk(
    data: RiskPredictionRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return PredictionService(db).predict_risk(current_user, data)


@router.post("/bmi", response_model=BMIResult)
def calculate_bmi(data: BMIRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return PredictionService(db).calculate_bmi(data)
