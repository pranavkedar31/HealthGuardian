"""
Chatbot service managing conversation persistence, patient health context,
AI pipeline invocation, and audit logging.
"""
from typing import Any
from sqlalchemy.orm import Session

from app.ai.chatbot import execute_chatbot_pipeline
from app.models.user import User
from app.repositories.ai_log_repository import AILogRepository
from app.repositories.chat_repository import ChatRepository


class ChatbotService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ChatRepository(db)
        self.ai_log_repo = AILogRepository(db)

    def _build_patient_context(self, user: User) -> dict[str, Any]:
        """Extracts authorized health metrics from patient's profile and vitals."""
        context: dict[str, Any] = {
            "full_name": user.full_name,
        }
        if getattr(user, "health_profile", None):
            hp = user.health_profile
            context["age"] = hp.age
            context["gender"] = hp.gender
            context["blood_group"] = hp.blood_group
            context["date_of_birth"] = getattr(hp, "date_of_birth", None)
            if hp.height_cm and hp.weight_kg and hp.height_cm > 0:
                h_m = hp.height_cm / 100.0
                context["bmi"] = round(hp.weight_kg / (h_m * h_m), 1)
            context["smoking"] = hp.smoking
            context["alcohol"] = hp.alcohol

        if getattr(user, "vitals_logs", None) and len(user.vitals_logs) > 0:
            latest = sorted(
                user.vitals_logs,
                key=lambda v: v.recorded_at or v.created_at,
                reverse=True,
            )[0]
            if latest.blood_pressure_systolic:
                context["systolic"] = latest.blood_pressure_systolic
            if latest.blood_sugar:
                context["sugar"] = latest.blood_sugar

        return context

    def send_message(self, user: User, message: str, language: str = "English") -> dict[str, Any]:
        # 1. Save incoming user message
        user_msg = self.repo.create({"user_id": user.id, "message": message, "is_from_user": True})

        # 2. Retrieve recent conversation history for this authenticated patient
        recent_messages = self.repo.list_by_user(user.id, limit=10)
        history = [
            {"role": "user" if m.is_from_user else "assistant", "content": m.message}
            for m in recent_messages
        ]

        # 3. Pull patient profile and vitals for risk prediction context
        patient_context = self._build_patient_context(user)

        # 4. Execute the multi-layer AI pipeline
        result = execute_chatbot_pipeline(
            message=message,
            history=history[:-1] if history else None,
            language=language,
            patient_context=patient_context,
        )

        reply_text = result["reply"]

        # 5. Save assistant reply
        ai_msg = self.repo.create({"user_id": user.id, "message": reply_text, "is_from_user": False})

        # 6. Record audit log
        self.ai_log_repo.create({
            "user_id": user.id,
            "module": "chatbot",
            "input_payload": {"message": message, "language": language},
            "output_payload": {
                "reply": reply_text,
                "safety_level": result.get("safety_level"),
                "emergency": result.get("emergency"),
                "provider": result.get("provider"),
                "intent": result.get("intent"),
            },
            "success": True,
        })

        return {
            "reply": reply_text,
            "response": reply_text,
            "language": language,
            "safety_level": result.get("safety_level", "low"),
            "emergency": result.get("emergency", False),
            "intent": result.get("intent", "GENERAL_HEALTH"),
            "provider": result.get("provider", "gemini"),
            "model": result.get("model", ""),
            "user_message_id": str(user_msg.id),
            "ai_message_id": str(ai_msg.id),
            "resources": result.get("resources", []),
        }

    def history(self, user: User):
        """Returns message history for authenticated user only."""
        return self.repo.list_by_user(user.id)
