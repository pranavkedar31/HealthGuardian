import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.reminder import (
    MedicineReminderCreate,
    MedicineReminderOut,
    MedicineReminderUpdate,
    WhatsAppHealthResponse,
    WhatsAppTestRequest,
    WhatsAppTestResponse,
)
from app.services.reminder_service import ReminderService
from app.services.whatsapp_service import check_whatsapp_health

router = APIRouter(prefix="/reminders", tags=["Medicine Reminders"])


@router.get("/whatsapp/health", response_model=WhatsAppHealthResponse)
def whatsapp_health():
    """Health check for WhatsApp Cloud API integration."""
    return check_whatsapp_health()


@router.post("/test-whatsapp", response_model=WhatsAppTestResponse)
def test_whatsapp_notification(
    data: WhatsAppTestRequest = WhatsAppTestRequest(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ReminderService(db).send_test_whatsapp(current_user, data.phone_number)


@router.post("", response_model=MedicineReminderOut, status_code=201)
def create_reminder(
    data: MedicineReminderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ReminderService(db).create(current_user, data)


@router.get("", response_model=list[MedicineReminderOut])
def list_reminders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ReminderService(db).list_for_user(current_user)


@router.put("/{reminder_id}", response_model=MedicineReminderOut)
def update_reminder(
    reminder_id: uuid.UUID,
    data: MedicineReminderUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ReminderService(db).update(current_user, reminder_id, data)


@router.post("/{reminder_id}/take", response_model=MedicineReminderOut)
def mark_reminder_taken(
    reminder_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ReminderService(db).mark_taken(current_user, reminder_id)


@router.post("/{reminder_id}/snooze", response_model=MedicineReminderOut)
def snooze_reminder(
    reminder_id: uuid.UUID,
    minutes: int = Query(default=5, ge=1, le=120),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ReminderService(db).snooze(current_user, reminder_id, minutes)


@router.delete("/{reminder_id}", status_code=204)
def delete_reminder(
    reminder_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ReminderService(db).delete(current_user, reminder_id)
