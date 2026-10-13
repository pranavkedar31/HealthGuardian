from typing import Optional

from pydantic import BaseModel, Field


class DiseasePredictionRequest(BaseModel):
    symptoms: list[str] = Field(..., min_length=1)


class DiseasePredictionResult(BaseModel):
    predicted_disease: str
    confidence: float
    top_matches: list[dict]


class RiskPredictionRequest(BaseModel):
    age: int
    bmi: float
    blood_pressure_systolic: float
    blood_sugar: float
    smoking: bool = False
    alcohol: bool = False


class RiskPredictionResult(BaseModel):
    diabetes_risk: float
    heart_disease_risk: float
    hypertension_risk: float
    risk_level: str


class BMIRequest(BaseModel):
    height_cm: float = Field(..., gt=0)
    weight_kg: float = Field(..., gt=0)


class BMIResult(BaseModel):
    bmi: float
    category: str
