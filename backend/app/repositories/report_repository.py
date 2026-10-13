import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.medical_report import MedicalReport
from app.repositories.base import BaseRepository


class ReportRepository(BaseRepository[MedicalReport]):
    def __init__(self, db: Session):
        super().__init__(MedicalReport, db)

    def list_by_user(
        self,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> list[MedicalReport]:
        stmt = (
            select(MedicalReport)
            .where(MedicalReport.user_id == user_id)
            .order_by(MedicalReport.created_at.desc())
            .offset(skip)
            .limit(limit)
        )

        return list(self.db.execute(stmt).scalars().all())

    def list_by_patient(
        self,
        patient_id: uuid.UUID,
        skip: int = 0,
        limit: int = 50,
    ) -> list[MedicalReport]:
        stmt = (
            select(MedicalReport)
            .where(MedicalReport.user_id == patient_id)
            .order_by(MedicalReport.created_at.desc())
            .offset(skip)
            .limit(limit)
        )

        return list(self.db.execute(stmt).scalars().all())
