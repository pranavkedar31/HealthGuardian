import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class WorkoutPlanRequest(BaseModel):
    goal: str = Field(..., description="strength | cardio | flexibility | weight_loss")
    difficulty: str = Field("beginner", description="beginner | intermediate | advanced")
    days_per_week: int = Field(3, ge=1, le=7)


class WorkoutPlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    goal: Optional[str] = None
    difficulty: Optional[str] = None
    days_per_week: Optional[int] = None
    schedule: Optional[dict] = None
    created_at: datetime
