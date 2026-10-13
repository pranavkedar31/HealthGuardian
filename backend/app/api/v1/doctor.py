import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import require_doctor
from app.db.session import get_db
from app.models.user import User
from app.schemas.appointment import AppointmentOut, AppointmentUpdate
from app.schemas.doctor import DoctorProfileUpdate
from app.schemas.report import MedicalReportOut
from app.schemas.user import UserOut
from app.services.appointment_service import appointment_to_out
from app.services.doctor_service import DoctorService
from app.services.report_service import ReportService

router = APIRouter(prefix="/doctor", tags=["Doctor"])


# ── Appointment Management ────────────────────────────────────────

@router.get("/appointments", response_model=list[AppointmentOut])
def doctor_appointments(
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db),
):
    appts = DoctorService(db).list_appointments_for_doctor(current_user.id)
    return [appointment_to_out(a) for a in appts]


@router.get("/appointments/stats")
def doctor_appointments_stats(
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db),
):
    return DoctorService(db).get_doctor_stats(current_user.id)


@router.put("/appointments/{appointment_id}", response_model=AppointmentOut)
def update_doctor_appointment(
    appointment_id: uuid.UUID,
    data: AppointmentUpdate,
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db),
):
    updated = DoctorService(db).update_appointment(current_user, appointment_id, data)
    return appointment_to_out(updated)


# ── Patient Inspection (from Main) ────────────────────────────────

@router.get(
    "/patients",
    response_model=list[UserOut],
)
def doctor_patients(
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db),
):
    return DoctorService(db).list_patients_for_doctor(
        current_user.id
    )


@router.get("/patients/{patient_id}/health")
def doctor_patient_health(
    patient_id: uuid.UUID,
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db),
):
    health = DoctorService(db).get_patient_health(
        current_user.id,
        patient_id,
    )

    if not health:
        raise HTTPException(
            status_code=404,
            detail="Patient not found or not assigned to this doctor.",
        )

    patient = health["patient"]

    return {
        "patient": {
            "id": patient.id,
            "full_name": patient.full_name,
            "email": patient.email,
            "phone": patient.phone,
            "role": patient.role,
            "is_active": patient.is_active,
            "is_verified": patient.is_verified,
        },
        "health_profile": health["health_profile"],
        "vitals": health["vitals"],
        "symptoms": health["symptoms"],
    }


@router.get(
    "/patients/{patient_id}/reports",
    response_model=list[MedicalReportOut],
)
def doctor_patient_reports(
    patient_id: uuid.UUID,
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db),
):
    reports = ReportService(db).patient_reports_for_doctor(
        current_user.id,
        patient_id,
    )

    if reports is None:
        raise HTTPException(
            status_code=404,
            detail="Patient not found or not assigned to this doctor.",
        )

    return reports


# ── Doctor Profile ────────────────────────────────────────────────

@router.get("/profile")
def get_doctor_profile(
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db),
):
    return DoctorService(db).get_doctor_profile(current_user.id)


@router.put("/profile")
def update_doctor_profile(
    data: DoctorProfileUpdate,
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db),
):
    return DoctorService(db).update_doctor_profile(current_user, data)
