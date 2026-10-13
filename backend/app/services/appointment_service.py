import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.appointment import Appointment, AppointmentStatus
from app.models.user import User, UserRole
from app.repositories.appointment_repository import AppointmentRepository
from app.schemas.appointment import AppointmentCreate, AppointmentOut, AppointmentUpdate, PatientSummary
from app.schemas.doctor import DoctorSummary
from app.services.notification_service import NotificationService


def appointment_to_out(appt: Appointment) -> AppointmentOut:
    doc_summary = None
    if appt.doctor:
        dp = getattr(appt.doctor, "doctor_profile", None)
        doc_summary = DoctorSummary(
            id=appt.doctor.id,
            doctor_profile_id=dp.id if dp else None,
            full_name=appt.doctor.full_name,
            email=appt.doctor.email,
            phone=appt.doctor.phone,
            specialization=dp.specialization if dp else "General Physician",
            qualification=dp.qualification if dp else None,
            experience_years=dp.experience_years if dp else None,
            hospital_name=dp.hospital_name if dp else "Clinic",
            address=dp.address if dp else "",
            area=dp.area if dp else (appt.doctor.location_area or ""),
            city=dp.city if dp else (appt.doctor.city or ""),
            state=dp.state if dp else (appt.doctor.state or ""),
            pincode=dp.pincode if dp else (appt.doctor.pincode or ""),
            latitude=dp.latitude if dp and dp.latitude is not None else appt.doctor.latitude,
            longitude=dp.longitude if dp and dp.longitude is not None else appt.doctor.longitude,
            consultation_fee=dp.consultation_fee if dp else None,
            available_days=dp.available_days if dp else None,
            available_time_start=dp.available_time_start if dp else None,
            available_time_end=dp.available_time_end if dp else None,
            bio=dp.bio if dp else None,
            profile_image=dp.profile_image if dp else None,
        )

    pat_summary = None
    if appt.patient:
        pat_summary = PatientSummary(
            id=appt.patient.id,
            full_name=appt.patient.full_name,
            email=appt.patient.email,
            phone=appt.patient.phone,
        )

    return AppointmentOut(
        id=appt.id,
        patient_id=appt.patient_id,
        doctor_id=appt.doctor_id,
        scheduled_at=appt.scheduled_at,
        status=appt.status,
        reason=appt.reason,
        created_at=appt.created_at,
        patient=pat_summary,
        doctor=doc_summary,
    )


class AppointmentService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = AppointmentRepository(db)
        self.notif_service = NotificationService(db)

    def create(self, user: User, data: AppointmentCreate) -> AppointmentOut:
        # 1. Reject past bookings
        now = datetime.now(timezone.utc)
        scheduled_at = data.scheduled_at
        if scheduled_at.tzinfo is None:
            scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)

        if scheduled_at < now - timedelta(minutes=5):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot book an appointment in the past. Please select a future date and time.",
            )

        # 2. Double booking prevention for doctor
        if data.doctor_id:
            doctor = self.db.query(User).filter(User.id == data.doctor_id, User.role == UserRole.doctor).first()
            if not doctor:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Selected doctor not found.")

            # Look for conflicting appointment within 25 minutes
            start_window = scheduled_at - timedelta(minutes=25)
            end_window = scheduled_at + timedelta(minutes=25)

            conflict = (
                self.db.query(Appointment)
                .filter(
                    Appointment.doctor_id == data.doctor_id,
                    Appointment.status.in_([AppointmentStatus.pending, AppointmentStatus.confirmed]),
                    Appointment.scheduled_at >= start_window,
                    Appointment.scheduled_at <= end_window,
                )
                .first()
            )
            if conflict:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This doctor already has an appointment scheduled for this time slot. Please select another time.",
                )

        payload = data.model_dump()
        payload["patient_id"] = user.id
        payload["scheduled_at"] = scheduled_at
        payload["status"] = AppointmentStatus.pending
        appt = self.repo.create(payload)

        # Load fresh with joined details
        detailed_appt = self.repo.get_with_details(appt.id) or appt

        # 3. Create notifications
        sched_str = scheduled_at.strftime("%d %B %Y at %I:%M %p")
        doc_name = detailed_appt.doctor.full_name if detailed_appt.doctor else "Doctor"
        hosp_name = (
            detailed_appt.doctor.doctor_profile.hospital_name
            if detailed_appt.doctor and getattr(detailed_appt.doctor, "doctor_profile", None)
            else "Clinic"
        )

        self.notif_service.create(
            user_id=user.id,
            title="Appointment Booked Successfully ✓",
            message=f"Your appointment request with Dr. {doc_name} at {hosp_name} on {sched_str} is submitted (Pending).",
            type="appointment",
            link="/dashboard",
        )

        if data.doctor_id:
            self.notif_service.create(
                user_id=data.doctor_id,
                title="New Appointment Request",
                message=f"Patient {user.full_name} has requested an appointment on {sched_str}.",
                type="appointment",
                link="/doctor-dashboard",
            )

        return appointment_to_out(detailed_appt)

    def list_for_user(self, user: User) -> list[AppointmentOut]:
        appts = self.repo.list_by_patient(user.id)
        return [appointment_to_out(a) for a in appts]

    def update(self, user: User, appointment_id: uuid.UUID, data: AppointmentUpdate) -> AppointmentOut:
        appt = self.repo.get_with_details(appointment_id)
        if not appt or appt.patient_id != user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

        updated = self.repo.update(appt, data.model_dump(exclude_unset=True))
        detailed = self.repo.get_with_details(updated.id) or updated

        if data.status == AppointmentStatus.cancelled and appt.doctor_id:
            self.notif_service.create(
                user_id=appt.doctor_id,
                title="Appointment Cancelled by Patient",
                message=f"Patient {user.full_name} has cancelled their appointment scheduled for {appt.scheduled_at.strftime('%d %B %Y at %I:%M %p')}.",
                type="appointment",
                link="/doctor-dashboard",
            )

        return appointment_to_out(detailed)
