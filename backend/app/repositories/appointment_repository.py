import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.appointment import Appointment
from app.models.user import User
from app.repositories.base import BaseRepository


class AppointmentRepository(BaseRepository[Appointment]):
    def __init__(self, db: Session):
        super().__init__(Appointment, db)

    def get_with_details(self, appointment_id: uuid.UUID) -> Appointment | None:
        stmt = (
            select(Appointment)
            .options(
                joinedload(Appointment.patient),
                joinedload(Appointment.doctor).joinedload(User.doctor_profile),
            )
            .where(Appointment.id == appointment_id)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def list_by_patient(self, patient_id: uuid.UUID) -> list[Appointment]:
        stmt = (
            select(Appointment)
            .options(
                joinedload(Appointment.patient),
                joinedload(Appointment.doctor).joinedload(User.doctor_profile),
            )
            .where(Appointment.patient_id == patient_id)
            .order_by(Appointment.scheduled_at.desc())
        )
        return list(self.db.execute(stmt).scalars().all())
