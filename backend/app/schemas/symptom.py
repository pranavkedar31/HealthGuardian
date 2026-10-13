import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class SymptomCheckRequest(BaseModel):
    symptoms: list[str] = Field(..., min_length=1)
    notes: Optional[str] = None


class SymptomCheckResult(BaseModel):
    predicted_condition: str
    confidence: float
    severity: str
    recommendation: str


class SymptomLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    symptoms: list[str]
    notes: Optional[str] = None
    predicted_condition: Optional[str] = None
    confidence: Optional[float] = None
    severity: Optional[str] = None
    created_at: datetime
