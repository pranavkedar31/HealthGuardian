import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.appointment import AppointmentCreate, AppointmentOut, AppointmentUpdate
from app.services.appointment_service import AppointmentService

router = APIRouter(prefix="/appointments", tags=["Appointments"])


@router.post("", response_model=AppointmentOut, status_code=201)
def create_appointment(
    data: AppointmentCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return AppointmentService(db).create(current_user, data)


@router.get("", response_model=list[AppointmentOut])
def list_appointments(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return AppointmentService(db).list_for_user(current_user)


@router.put("/{appointment_id}", response_model=AppointmentOut)
def update_appointment(
    appointment_id: uuid.UUID,
    data: AppointmentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AppointmentService(db).update(current_user, appointment_id, data)
