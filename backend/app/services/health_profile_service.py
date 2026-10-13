from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.health_profile_repository import HealthProfileRepository
from app.schemas.health_profile import HealthProfileCreate, HealthProfileUpdate


def _calculate_age(dob_str: str) -> int | None:
    try:
        from datetime import date
        dob = date.fromisoformat(dob_str)
        today = date.today()
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    except Exception:
        return None


class HealthProfileService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = HealthProfileRepository(db)

    def get_or_none(self, user: User):
        return self.repo.get_by_user_id(user.id)

    def create(self, user: User, data: HealthProfileCreate):
        existing = self.repo.get_by_user_id(user.id)
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Health profile already exists")
        payload = data.model_dump()
        payload["user_id"] = user.id
        if payload.get("blood_group"):
            payload["blood_group"] = str(payload["blood_group"]).strip().upper()
        if payload.get("date_of_birth") and payload.get("age") is None:
            calc_age = _calculate_age(payload["date_of_birth"])
            if calc_age is not None:
                payload["age"] = calc_age
        return self.repo.create(payload)

    def update(self, user: User, data: HealthProfileUpdate):
        existing = self.repo.get_by_user_id(user.id)
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Health profile not found")

        # ── Backend Immutability Enforcement ─────────────────────────
        # Gender cannot be changed once initially set
        if existing.gender and str(existing.gender).strip():
            if (
                data.gender is not None
                and str(data.gender).strip()
                and str(data.gender).strip().lower() != str(existing.gender).strip().lower()
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Gender cannot be changed after profile completion.",
                )

        # Date of Birth cannot be changed once initially set
        if existing.date_of_birth and str(existing.date_of_birth).strip():
            if (
                data.date_of_birth is not None
                and str(data.date_of_birth).strip()
                and str(data.date_of_birth).strip() != str(existing.date_of_birth).strip()
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Date of birth cannot be changed after profile completion.",
                )

        # Blood Group cannot be changed once initially set
        if existing.blood_group and str(existing.blood_group).strip():
            if (
                data.blood_group is not None
                and str(data.blood_group).strip()
                and str(data.blood_group).strip().upper() != str(existing.blood_group).strip().upper()
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Blood group cannot be changed after profile completion.",
                )

        update_data = data.model_dump(exclude_unset=True)
        if "blood_group" in update_data and update_data["blood_group"]:
            update_data["blood_group"] = str(update_data["blood_group"]).strip().upper()
        if "date_of_birth" in update_data and update_data["date_of_birth"] and "age" not in update_data:
            calc_age = _calculate_age(update_data["date_of_birth"])
            if calc_age is not None:
                update_data["age"] = calc_age

        return self.repo.update(existing, update_data)
