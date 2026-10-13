import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.appointment import AppointmentStatus
from app.schemas.doctor import DoctorSummary


class AppointmentCreate(BaseModel):
    doctor_id: Optional[uuid.UUID] = None
    scheduled_at: datetime
    reason: Optional[str] = None


class AppointmentUpdate(BaseModel):
    scheduled_at: Optional[datetime] = None
    status: Optional[str] = None
    reason: Optional[str] = None


class PatientSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    email: EmailStr
    phone: Optional[str] = None


class AppointmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    doctor_id: Optional[uuid.UUID] = None
    scheduled_at: datetime
    status: AppointmentStatus
    reason: Optional[str] = None
    created_at: datetime
    patient: Optional[PatientSummary] = None
    doctor: Optional[DoctorSummary] = None
