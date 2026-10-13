"""
Seed script — populates the database with sample users, health profiles,
and related records for local development / demo purposes.

Usage:
    python -m app.seed
"""
import random
from datetime import datetime, time, timedelta, timezone

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.appointment import Appointment, AppointmentStatus
from app.models.health_profile import HealthProfile
from app.models.medicine_reminder import MedicineReminder
from app.models.user import User, UserRole
from app.models.vitals_log import VitalsLog

SAMPLE_USERS = [
    {"full_name": "Admin User", "email": "admin@healthguardian.app", "role": UserRole.admin},
    {"full_name": "Dr. Priya Sharma", "email": "dr.priya@healthguardian.app", "role": UserRole.doctor},
    {"full_name": "Dr. James Carter", "email": "dr.carter@healthguardian.app", "role": UserRole.doctor},
    {"full_name": "Aisha Khan", "email": "aisha.khan@example.com", "role": UserRole.patient},
    {"full_name": "Rahul Verma", "email": "rahul.verma@example.com", "role": UserRole.patient},
    {"full_name": "Emily Chen", "email": "emily.chen@example.com", "role": UserRole.patient},
]

DEFAULT_PASSWORD = "Password123"


def seed():
    db = SessionLocal()
    try:
        created_users: dict[str, User] = {}

        for entry in SAMPLE_USERS:
            existing = db.query(User).filter(User.email == entry["email"]).first()
            if existing:
                created_users[entry["email"]] = existing
                continue

            user = User(
                full_name=entry["full_name"],
                email=entry["email"],
                hashed_password=hash_password(DEFAULT_PASSWORD),
                role=entry["role"],
                is_active=True,
                is_verified=True,
            )
            db.add(user)
            db.flush()
            created_users[entry["email"]] = user

        db.commit()

        patients = [u for u in created_users.values() if u.role == UserRole.patient]
        doctors = [u for u in created_users.values() if u.role == UserRole.doctor]

        for patient in patients:
            if not db.query(HealthProfile).filter(HealthProfile.user_id == patient.id).first():
                profile = HealthProfile(
                    user_id=patient.id,
                    age=random.randint(22, 60),
                    gender=random.choice(["male", "female"]),
                    height_cm=round(random.uniform(155, 190), 1),
                    weight_kg=round(random.uniform(55, 95), 1),
                    blood_group=random.choice(["A+", "B+", "O+", "AB+", "O-"]),
                    allergies=random.sample(["pollen", "peanuts", "dust", "shellfish"], k=1),
                    chronic_conditions=[],
                    smoking=False,
                    alcohol=random.choice([True, False]),
                )
                db.add(profile)

            for i in range(3):
                db.add(
                    VitalsLog(
                        user_id=patient.id,
                        heart_rate=round(random.uniform(60, 100), 1),
                        blood_pressure_systolic=round(random.uniform(105, 135), 1),
                        blood_pressure_diastolic=round(random.uniform(65, 88), 1),
                        blood_sugar=round(random.uniform(80, 120), 1),
                        spo2=round(random.uniform(95, 100), 1),
                        temperature=round(random.uniform(36.4, 37.2), 1),
                        recorded_at=datetime.now(timezone.utc) - timedelta(days=i),
                    )
                )

            db.add(
                MedicineReminder(
                    user_id=patient.id,
                    medicine_name="Vitamin D3",
                    dosage="1 tablet",
                    reminder_time=time(9, 0),
                    frequency="daily",
                    is_active=True,
                )
            )

            if doctors:
                db.add(
                    Appointment(
                        patient_id=patient.id,
                        doctor_id=random.choice(doctors).id,
                        scheduled_at=datetime.now(timezone.utc) + timedelta(days=random.randint(1, 14)),
                        status=AppointmentStatus.pending,
                        reason="General checkup",
                    )
                )

        db.commit()
        print(f"Seed complete. {len(created_users)} users ensured, sample data created for {len(patients)} patients.")
        print(f"Default password for all seeded users: {DEFAULT_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
