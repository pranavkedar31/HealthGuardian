"""
Model aggregator — import all models here so Alembic/Base.metadata sees them.
"""
from app.db.base_class import Base  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.health_profile import HealthProfile  # noqa: F401
from app.models.vitals_log import VitalsLog  # noqa: F401
from app.models.symptom_log import SymptomLog  # noqa: F401
from app.models.medical_report import MedicalReport  # noqa: F401
from app.models.diet_plan import DietPlan  # noqa: F401
from app.models.workout_plan import WorkoutPlan  # noqa: F401
from app.models.medicine_reminder import MedicineReminder  # noqa: F401
from app.models.appointment import Appointment  # noqa: F401
from app.models.chat_message import ChatMessage  # noqa: F401
from app.models.ai_log import AILog  # noqa: F401
from app.models.password_reset import PasswordResetToken  # noqa: F401
from app.models.doctor_profile import DoctorProfile  # noqa: F401
from app.models.notification import Notification  # noqa: F401

__all__ = [
    "Base",
    "User",
    "HealthProfile",
    "VitalsLog",
    "SymptomLog",
    "MedicalReport",
    "DietPlan",
    "WorkoutPlan",
    "MedicineReminder",
    "Appointment",
    "ChatMessage",
    "AILog",
    "PasswordResetToken",
    "DoctorProfile",
    "Notification",
]
