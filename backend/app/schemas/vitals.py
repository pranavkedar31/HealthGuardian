import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class VitalsLogCreate(BaseModel):
    heart_rate: Optional[float] = None
    blood_pressure_systolic: Optional[float] = None
    blood_pressure_diastolic: Optional[float] = None
    blood_sugar: Optional[float] = None
    spo2: Optional[float] = None
    temperature: Optional[float] = None


class VitalsLogOut(VitalsLogCreate):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    recorded_at: datetime
