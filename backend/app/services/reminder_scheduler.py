from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.medicine_reminder import MedicineReminder
from app.services.whatsapp_service import send_whatsapp_message

scheduler = BackgroundScheduler()
INDIA_TIMEZONE = ZoneInfo("Asia/Kolkata")


def reminder_is_due(
    reminder: MedicineReminder,
    now: datetime,
) -> bool:
    if not reminder.is_active:
        return False

    # If snooze is active and in future, not due yet
    if reminder.snooze_until is not None:
        snooze_local = reminder.snooze_until
        if snooze_local.tzinfo is None:
            snooze_local = snooze_local.replace(tzinfo=ZoneInfo("UTC")).astimezone(INDIA_TIMEZONE)
        else:
            snooze_local = snooze_local.astimezone(INDIA_TIMEZONE)
        if now < snooze_local:
            return False

    # Check next_trigger_at if populated
    if reminder.next_trigger_at is not None:
        trigger_local = reminder.next_trigger_at
        if trigger_local.tzinfo is None:
            trigger_local = trigger_local.replace(tzinfo=ZoneInfo("UTC")).astimezone(INDIA_TIMEZONE)
        else:
            trigger_local = trigger_local.astimezone(INDIA_TIMEZONE)
        return now >= trigger_local

    # Fallback to time-of-day comparison
    current_time = now.time().replace(second=0, microsecond=0)
    reminder_time = reminder.reminder_time.replace(second=0, microsecond=0)
    if current_time < reminder_time:
        return False

    last = reminder.last_notified_at
    if last is not None:
        last_local = last
        if last_local.tzinfo is None:
            last_local = last_local.replace(tzinfo=ZoneInfo("UTC")).astimezone(INDIA_TIMEZONE)
        else:
            last_local = last_local.astimezone(INDIA_TIMEZONE)
        if last_local.date() == now.date():
            return False

    if reminder.frequency == "once":
        return last is None

    return True


def process_whatsapp_reminders():
    db: Session = SessionLocal()
    try:
        now = datetime.now(INDIA_TIMEZONE)
        reminders = (
            db.query(MedicineReminder)
            .filter(MedicineReminder.is_active.is_(True))
            .all()
        )

        for reminder in reminders:
            if not reminder_is_due(reminder, now):
                continue

            # Process notification if method includes WhatsApp
            if reminder.notification_method in ("whatsapp", "both"):
                user = reminder.user
                phone = reminder.whatsapp_number or (user.phone if user else None)
                if phone:
                    clean_phone = phone.strip()
                    title_text = reminder.title or reminder.medicine_name
                    message = (
                        "🔔 *HealthGuardian Reminder* 💊\n\n"
                        "It's time to take your scheduled medicine / health routine.\n\n"
                        f"• *Item*: {title_text}\n"
                        f"• *Dosage*: {reminder.dosage or 'As advised'}\n"
                        f"• *Scheduled Time*: {reminder.reminder_time.strftime('%I:%M %p')}\n"
                    )
                    if reminder.note:
                        message += f"• *Note*: {reminder.note}\n"
                    message += "\nPlease follow the instructions provided by your healthcare professional.\n\n— HealthGuardian"

                    result = send_whatsapp_message(clean_phone, message)
                    if result.get("success"):
                        reminder.delivery_status = "SENT"
                    else:
                        reminder.delivery_status = "FAILED"

                reminder.last_notified_at = now
                reminder.last_triggered_at = now

                # Advance next_trigger_at
                freq = (reminder.frequency or "daily").lower()
                if freq == "once":
                    reminder.is_active = False
                elif freq == "weekly":
                    reminder.next_trigger_at = now + timedelta(days=7)
                else:  # daily
                    reminder.next_trigger_at = now + timedelta(days=1)

                db.add(reminder)

        db.commit()
    except Exception as exc:
        db.rollback()
        print(f"Reminder scheduler error: {exc}")
    finally:
        db.close()


def start_reminder_scheduler():
    if scheduler.running:
        return

    scheduler.add_job(
        process_whatsapp_reminders,
        "interval",
        seconds=30,
        id="whatsapp_reminders",
        replace_existing=True,
    )
    scheduler.start()
    print("HealthGuardian reminder scheduler started.")


def stop_reminder_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        print("HealthGuardian reminder scheduler stopped.")