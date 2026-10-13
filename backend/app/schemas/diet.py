import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class DietPlanRequest(BaseModel):
    goal: str = Field(..., description="weight_loss | weight_gain | maintenance | muscle_gain")
    dietary_preference: Optional[str] = Field(None, description="vegetarian | non_vegetarian | vegan")


class DietPlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    goal: Optional[str] = None
    daily_calories: Optional[int] = None
    meals: Optional[dict] = None
    created_at: datetime
