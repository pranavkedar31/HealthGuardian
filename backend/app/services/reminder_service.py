from datetime import datetime, timedelta
from typing import Optional
from zoneinfo import ZoneInfo
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.reminder_repository import ReminderRepository
from app.schemas.reminder import (
    MedicineReminderCreate,
    MedicineReminderUpdate,
)
from app.utils.phone import normalize_phone_number
from app.services.whatsapp_service import send_whatsapp_message

INDIA_TIMEZONE = ZoneInfo("Asia/Kolkata")


def calculate_initial_next_trigger(reminder_time, frequency: str = "daily") -> datetime:
    """Calculates the upcoming occurrence for a reminder in Asia/Kolkata timezone."""
    now = datetime.now(INDIA_TIMEZONE)
    target = now.replace(
        hour=reminder_time.hour,
        minute=reminder_time.minute,
        second=0,
        microsecond=0,
    )
    # If scheduled for the current minute or upcoming today, trigger today!
    if (target.hour == now.hour and target.minute == now.minute) or target > now:
        return target

    # If the scheduled time has already passed earlier today:
    if frequency == "once":
        # For a one-time reminder created after today's time, schedule for tomorrow
        return target + timedelta(days=1)
    elif frequency == "weekly":
        return target + timedelta(days=7)
    else:  # daily or default
        return target + timedelta(days=1)


class ReminderService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ReminderRepository(db)

    def create(
        self,
        user: User,
        data: MedicineReminderCreate,
    ):
        payload = data.model_dump()

        phone_input = payload.pop("phone_number", None) or payload.pop("whatsapp_number", None)
        normalized_stored = None
        if phone_input and str(phone_input).strip():
            is_valid, stored_num, _, err_msg = normalize_phone_number(str(phone_input).strip())
            if not is_valid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=err_msg,
                )
            normalized_stored = stored_num
            user.phone = normalized_stored
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)

        notification_method = payload.get("notification_method", "browser")
        if notification_method not in ["browser", "whatsapp", "both"]:
            notification_method = "browser"
            payload["notification_method"] = "browser"

        if notification_method in ["whatsapp", "both"]:
            target_phone = normalized_stored or user.phone
            if not target_phone:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Please provide a valid WhatsApp phone number (e.g. +91XXXXXXXXXX) to receive WhatsApp notifications.",
                )
            # Re-verify existing user phone
            is_valid, stored_num, _, err_msg = normalize_phone_number(target_phone)
            if not is_valid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid phone number on profile: {err_msg}",
                )
            payload["whatsapp_number"] = stored_num

        # Calculate initial next_trigger_at in Asia/Kolkata
        freq = (payload.get("frequency") or "daily").lower()
        r_time = payload["reminder_time"]
        payload["next_trigger_at"] = calculate_initial_next_trigger(r_time, freq)
        payload["delivery_status"] = "PENDING"
        payload["user_id"] = user.id

        return self.repo.create(payload)

    def send_test_whatsapp(self, user: User, phone_number: Optional[str] = None):
        target_phone = (phone_number or user.phone or "").strip()
        if not target_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please provide a valid WhatsApp phone number (e.g. +91XXXXXXXXXX).",
            )

        is_valid, stored_num, _, err_msg = normalize_phone_number(target_phone)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=err_msg,
            )

        if user.phone != stored_num:
            user.phone = stored_num
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)

        test_msg = (
            "🔔 *HealthGuardian WhatsApp Alert*\n\n"
            "Great news! Your WhatsApp notifications are connected and working.\n\n"
            "You will receive timely reminders for your scheduled medicines and health routines.\n\n"
            "— HealthGuardian Preventive Care"
        )
        
        result = send_whatsapp_message(stored_num, test_msg)
        if not result.get("success"):
            detail_msg = result.get("detail") or result.get("error_message") or "Unable to send WhatsApp message."
            raw_code = result.get("status_code", 502)
            # Never return 401/403 for upstream third-party failures to avoid logging out the HealthGuardian user!
            if raw_code in (401, 403, 500, 502, 503):
                http_status = status.HTTP_502_BAD_GATEWAY
            elif raw_code == 400:
                http_status = status.HTTP_400_BAD_REQUEST
            elif raw_code == 404:
                http_status = status.HTTP_404_NOT_FOUND
            else:
                http_status = status.HTTP_502_BAD_GATEWAY

            raise HTTPException(
                status_code=http_status,
                detail=detail_msg,
            )

        return {
            "success": True,
            "message": f"Test WhatsApp reminder sent successfully to {stored_num}!",
            "phone": stored_num,
            "details": result,
        }

    def list_for_user(self, user: User):
        return self.repo.list_by_user(user.id)

    def update(
        self,
        user: User,
        reminder_id,
        data: MedicineReminderUpdate,
    ):
        reminder = self.repo.get(reminder_id)
        if not reminder or reminder.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reminder not found",
            )

        changes = data.model_dump(exclude_unset=True)

        if "whatsapp_number" in changes and changes["whatsapp_number"]:
            is_valid, stored_num, _, err_msg = normalize_phone_number(changes["whatsapp_number"])
            if not is_valid:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)
            changes["whatsapp_number"] = stored_num
            user.phone = stored_num
            self.db.add(user)
            self.db.commit()

        if "reminder_time" in changes or "frequency" in changes:
            r_time = changes.get("reminder_time", reminder.reminder_time)
            freq = (changes.get("frequency", reminder.frequency) or "daily").lower()
            changes["next_trigger_at"] = calculate_initial_next_trigger(r_time, freq)

        return self.repo.update(reminder, changes)

    def mark_taken(
        self,
        user: User,
        reminder_id,
    ):
        reminder = self.repo.get(reminder_id)
        if not reminder or reminder.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reminder not found",
            )

        now = datetime.now(INDIA_TIMEZONE)
        changes = {
            "last_notified_at": now,
            "completed_at": now,
            "snooze_until": None,
        }
        
        freq = (reminder.frequency or "daily").lower()
        if freq == "once":
            changes["is_active"] = False
        elif freq == "weekly":
            changes["next_trigger_at"] = (reminder.next_trigger_at or now) + timedelta(days=7)
        else:  # daily
            changes["next_trigger_at"] = (reminder.next_trigger_at or now) + timedelta(days=1)

        return self.repo.update(reminder, changes)

    def snooze(
        self,
        user: User,
        reminder_id,
        minutes: int = 5,
    ):
        reminder = self.repo.get(reminder_id)
        if not reminder or reminder.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reminder not found",
            )

        now = datetime.now(INDIA_TIMEZONE)
        snooze_time = now + timedelta(minutes=minutes)
        changes = {
            "snooze_until": snooze_time,
            "next_trigger_at": snooze_time,
        }
        return self.repo.update(reminder, changes)

    def delete(
        self,
        user: User,
        reminder_id,
    ):
        reminder = self.repo.get(reminder_id)
        if not reminder or reminder.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reminder not found",
            )
        self.repo.delete(reminder)