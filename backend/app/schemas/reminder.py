import uuid
from datetime import datetime, time
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator


def _parse_time_value(v):
    if v is None:
        return None
    if isinstance(v, time):
        return v
    if isinstance(v, str):
        clean = v.strip().replace(".", ":")
        parts = clean.split(":")
        if len(parts) >= 2:
            try:
                h = int(parts[0])
                m = int(parts[1])
                s = int(parts[2]) if len(parts) > 2 else 0
                return time(h, m, s)
            except ValueError:
                pass
    raise ValueError("Invalid time format. Expected HH:MM or HH.MM (e.g. 09:35 or 9.35)")


class MedicineReminderCreate(BaseModel):
    medicine_name: str
    dosage: Optional[str] = None
    reminder_time: time
    frequency: Optional[str] = "daily"
    notification_method: str = "browser"
    phone_number: Optional[str] = None
    whatsapp_number: Optional[str] = None
    title: Optional[str] = None
    note: Optional[str] = None

    @field_validator("reminder_time", mode="before")
    @classmethod
    def validate_reminder_time(cls, v):
        return _parse_time_value(v)



class WhatsAppTestRequest(BaseModel):
    phone_number: Optional[str] = None


class WhatsAppTestResponse(BaseModel):
    success: bool
    message: str
    phone: Optional[str] = None
    details: Optional[dict] = None


class WhatsAppHealthResponse(BaseModel):
    configured: bool
    credentials_present: bool
    phone_number_id_configured: bool
    api_reachable: bool
    status: str
    message: str
    verified_name: Optional[str] = None


class MedicineReminderUpdate(BaseModel):
    medicine_name: Optional[str] = None
    dosage: Optional[str] = None
    reminder_time: Optional[time] = None
    frequency: Optional[str] = None
    is_active: Optional[bool] = None
    notification_method: Optional[str] = None
    whatsapp_number: Optional[str] = None
    title: Optional[str] = None
    note: Optional[str] = None
    snooze_until: Optional[datetime] = None

    @field_validator("reminder_time", mode="before")
    @classmethod
    def validate_reminder_time(cls, v):
        return _parse_time_value(v)



class MedicineReminderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    medicine_name: str
    dosage: Optional[str] = None
    reminder_time: time
    frequency: Optional[str] = None
    is_active: bool
    notification_method: str
    last_notified_at: Optional[datetime] = None
    created_at: datetime
    title: Optional[str] = None
    note: Optional[str] = None
    whatsapp_number: Optional[str] = None
    next_trigger_at: Optional[datetime] = None
    last_triggered_at: Optional[datetime] = None
    delivery_status: Optional[str] = "PENDING"
    completed_at: Optional[datetime] = None
    snooze_until: Optional[datetime] = None
