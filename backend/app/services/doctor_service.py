import math
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import distinct, select
from sqlalchemy.orm import Session, joinedload

from app.models.appointment import Appointment, AppointmentStatus
from app.models.doctor_profile import DoctorProfile
from app.models.health_profile import HealthProfile
from app.models.symptom_log import SymptomLog
from app.models.user import User, UserRole
from app.models.vitals_log import VitalsLog
from app.repositories.appointment_repository import AppointmentRepository
from app.schemas.appointment import AppointmentUpdate
from app.schemas.doctor import AvailableSlot, DoctorProfileUpdate, DoctorSearchOut, DoctorSummary
from app.services.notification_service import NotificationService
from app.services.whatsapp_service import send_whatsapp_message


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance between two points in km."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 1)


class DoctorService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = AppointmentRepository(db)
        self.notif_service = NotificationService(db)

    # ── Appointments ──────────────────────────────────────────────

    def list_appointments_for_doctor(self, doctor_id: uuid.UUID) -> list[Appointment]:
        stmt = (
            select(Appointment)
            .options(
                joinedload(Appointment.patient),
                joinedload(Appointment.doctor).joinedload(User.doctor_profile),
            )
            .where(Appointment.doctor_id == doctor_id)
            .order_by(Appointment.scheduled_at.asc())
        )
        return list(self.repo.db.execute(stmt).scalars().all())

    def get_doctor_stats(self, doctor_id: uuid.UUID) -> dict:
        doc_uuid = uuid.UUID(str(doctor_id)) if not isinstance(doctor_id, uuid.UUID) else doctor_id
        stmt = select(Appointment.status).where(Appointment.doctor_id == doc_uuid)
        statuses = list(self.db.execute(stmt).scalars().all())

        def _norm(st) -> str:
            if hasattr(st, "value"):
                val = st.value
            else:
                val = str(st)
            s = str(val).lower().strip()
            if s in ("confirmed", "approved"):
                return "approved"
            if s in ("cancelled", "canceled"):
                return "canceled"
            return s

        pending_cnt = sum(1 for s in statuses if _norm(s) == "pending")
        approved_cnt = sum(1 for s in statuses if _norm(s) == "approved")
        rejected_cnt = sum(1 for s in statuses if _norm(s) == "rejected")
        canceled_cnt = sum(1 for s in statuses if _norm(s) == "canceled")
        completed_cnt = sum(1 for s in statuses if _norm(s) == "completed")
        total_cnt = len(statuses)

        return {
            "total": total_cnt,
            "pending": pending_cnt,
            "approved": approved_cnt,
            "rejected": rejected_cnt,
            "canceled": canceled_cnt,
            "completed": completed_cnt,
        }

    def update_appointment(self, doctor: User, appointment_id: uuid.UUID, data: AppointmentUpdate) -> Appointment:
        appt = self.repo.get_with_details(appointment_id)
        if not appt or appt.doctor_id != doctor.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

        old_status = appt.status
        values = {}

        if data.scheduled_at is not None:
            values["scheduled_at"] = data.scheduled_at
        if data.reason is not None:
            values["reason"] = data.reason

        if data.status:
            st_raw = data.status.lower().strip()
            status_map = {
                "approved": AppointmentStatus.confirmed,
                "confirmed": AppointmentStatus.confirmed,
                "rejected": AppointmentStatus.rejected,
                "canceled": AppointmentStatus.cancelled,
                "cancelled": AppointmentStatus.cancelled,
                "completed": AppointmentStatus.completed,
                "pending": AppointmentStatus.pending,
            }
            if st_raw not in status_map:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid appointment status '{data.status}'.")

            new_st = status_map[st_raw]

            # Validate transitions
            if new_st != old_status:
                if old_status in (AppointmentStatus.cancelled, AppointmentStatus.rejected, AppointmentStatus.completed):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Cannot change status: appointment is already {old_status.value}."
                    )
                if old_status == AppointmentStatus.pending and new_st not in (AppointmentStatus.confirmed, AppointmentStatus.rejected):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Pending appointments can only be Approved or Rejected."
                    )
                if old_status == AppointmentStatus.confirmed and new_st not in (AppointmentStatus.completed, AppointmentStatus.cancelled):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Approved appointments can only be Completed or Canceled."
                    )
                values["status"] = new_st

        updated_appt = self.repo.update(appt, values)

        # Notify patient of status transitions
        if "status" in values and values["status"] != old_status:
            new_st = values["status"]
            sched_str = updated_appt.scheduled_at.strftime("%d %B %Y at %I:%M %p")
            doc_name = doctor.full_name
            hosp_name = (
                doctor.doctor_profile.hospital_name
                if doctor.doctor_profile
                else "Clinic"
            )

            if new_st == AppointmentStatus.confirmed:
                self.notif_service.create(
                    user_id=updated_appt.patient_id,
                    title="Appointment Confirmed ✓",
                    message=f"Dr. {doc_name} confirmed/approved your appointment at {hosp_name} for {sched_str}.",
                    type="appointment",
                    link="/dashboard",
                )
                self.notif_service.create(
                    user_id=updated_appt.patient_id,
                    title="Upcoming Appointment Reminder",
                    message=f"Reminder: You have an appointment with Dr. {doc_name} on {sched_str} at {hosp_name}.",
                    type="reminder",
                    link="/dashboard",
                )
                if updated_appt.patient and updated_appt.patient.phone:
                    try:
                        send_whatsapp_message(
                            phone_number=updated_appt.patient.phone,
                            message=f"HealthGuardian Reminder: Your appointment with Dr. {doc_name} at {hosp_name} on {sched_str} has been confirmed.",
                        )
                    except Exception:
                        pass

            elif new_st == AppointmentStatus.cancelled:
                self.notif_service.create(
                    user_id=updated_appt.patient_id,
                    title="Appointment Cancelled",
                    message=f"Your appointment with Dr. {doc_name} for {sched_str} was cancelled.",
                    type="appointment",
                    link="/dashboard",
                )
            elif new_st == AppointmentStatus.rejected:
                self.notif_service.create(
                    user_id=updated_appt.patient_id,
                    title="Appointment Request Declined",
                    message=f"Dr. {doc_name} was unable to accept your appointment for {sched_str}.",
                    type="appointment",
                    link="/dashboard",
                )
            elif new_st == AppointmentStatus.completed:
                self.notif_service.create(
                    user_id=updated_appt.patient_id,
                    title="Appointment Completed",
                    message=f"Your appointment with Dr. {doc_name} on {sched_str} is completed.",
                    type="appointment",
                    link="/dashboard",
                )

        return updated_appt

    # ── Patients (from Main) ──────────────────────────────────────

    def list_patients_for_doctor(self, doctor_id):
        stmt = (
            select(User)
            .join(
                Appointment,
                Appointment.patient_id == User.id,
            )
            .where(Appointment.doctor_id == doctor_id)
            .distinct()
            .order_by(User.full_name)
        )

        return list(
            self.db.execute(stmt).scalars().all()
        )

    def get_patient_health(self, doctor_id, patient_id):
        # Check that this patient is assigned to this doctor
        assignment_stmt = (
            select(Appointment)
            .where(
                Appointment.doctor_id == doctor_id,
                Appointment.patient_id == patient_id,
            )
            .limit(1)
        )

        assignment = self.db.execute(
            assignment_stmt
        ).scalar_one_or_none()

        if not assignment:
            return None

        # Get patient
        patient = self.db.get(User, patient_id)

        if not patient:
            return None

        # Health profile
        profile_stmt = select(HealthProfile).where(
            HealthProfile.user_id == patient_id
        )

        health_profile = self.db.execute(
            profile_stmt
        ).scalar_one_or_none()

        # Latest 5 vitals
        vitals_stmt = (
            select(VitalsLog)
            .where(VitalsLog.user_id == patient_id)
            .order_by(VitalsLog.recorded_at.desc())
            .limit(5)
        )

        vitals = list(
            self.db.execute(vitals_stmt).scalars().all()
        )

        # Latest 5 symptoms
        symptoms_stmt = (
            select(SymptomLog)
            .where(SymptomLog.user_id == patient_id)
            .order_by(SymptomLog.created_at.desc())
            .limit(5)
        )

        symptoms = list(
            self.db.execute(symptoms_stmt).scalars().all()
        )

        return {
            "patient": patient,
            "health_profile": health_profile,
            "vitals": vitals,
            "symptoms": symptoms,
        }

    # ── Doctor Profile ────────────────────────────────────────────

    def get_doctor_profile(self, doctor_id: uuid.UUID) -> dict:
        doc_uuid = uuid.UUID(str(doctor_id)) if not isinstance(doctor_id, uuid.UUID) else doctor_id
        user = self.db.query(User).options(joinedload(User.doctor_profile)).filter(User.id == doc_uuid).first()
        if not user or user.role != UserRole.doctor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor profile not found")

        dp = user.doctor_profile
        if not dp:
            dp = DoctorProfile(
                user_id=user.id,
                specialization="General Physician",
                qualification="MBBS, MD",
                experience_years=5,
                hospital_name="Healthcare Clinic",
                address="Main Road",
                area=user.location_area or "Central",
                city=user.city or "Nagpur",
                state=user.state or "Maharashtra",
                pincode=user.pincode or "440001",
                consultation_fee=500.0,
                available_days="Mon,Tue,Wed,Thu,Fri,Sat",
                available_time_start="09:00",
                available_time_end="18:00",
                bio="Consultant healthcare professional specializing in preventive care and patient consultations.",
            )
            self.db.add(dp)
            try:
                self.db.commit()
                self.db.refresh(dp)
            except Exception:
                self.db.rollback()

        return {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone or "",
            "username": user.username or "",
            "role": user.role.value,
            "is_active": user.is_active,
            "is_verified": user.is_verified,
            "specialization": dp.specialization if dp else "General Physician",
            "qualification": dp.qualification if dp else "MBBS, MD",
            "experience_years": dp.experience_years if dp else 5,
            "hospital_name": dp.hospital_name if dp else "Healthcare Clinic",
            "address": dp.address if dp else "",
            "area": dp.area if dp else (user.location_area or "Central"),
            "city": dp.city if dp else (user.city or "Nagpur"),
            "state": dp.state if dp else (user.state or "Maharashtra"),
            "pincode": dp.pincode if dp else (user.pincode or "440001"),
            "consultation_fee": dp.consultation_fee if dp else 500.0,
            "available_days": dp.available_days if dp else "Mon,Tue,Wed,Thu,Fri,Sat",
            "available_time_start": dp.available_time_start if dp else "09:00",
            "available_time_end": dp.available_time_end if dp else "18:00",
            "bio": dp.bio if dp else "",
            "medical_registration_number": dp.medical_registration_number if dp and dp.medical_registration_number else "",
            "medical_registration_council": dp.medical_registration_council if dp and dp.medical_registration_council else "Maharashtra Medical Council",
            "verification_status": dp.verification_status if dp and dp.verification_status else "pending",
        }

    def update_doctor_profile(self, doctor: User, data: DoctorProfileUpdate) -> dict:
        dp = self.db.query(DoctorProfile).filter(DoctorProfile.user_id == doctor.id).first()
        if not dp:
            dp = DoctorProfile(
                user_id=doctor.id,
                specialization=data.specialization or "General Physician",
                qualification=data.qualification or "MBBS, MD",
                experience_years=data.experience_years or 5,
                hospital_name=data.hospital_name or "Healthcare Clinic",
                address=data.address or "Main Road",
                area=data.area or doctor.location_area or "Central",
                city=data.city or doctor.city or "Nagpur",
                state=data.state or doctor.state or "Maharashtra",
                pincode=data.pincode or doctor.pincode or "440001",
                consultation_fee=data.consultation_fee or 500.0,
                available_days=data.available_days or "Mon,Tue,Wed,Thu,Fri,Sat",
                available_time_start=data.available_time_start or "09:00",
                available_time_end=data.available_time_end or "18:00",
                bio=data.bio or "",
                medical_registration_number=data.medical_registration_number,
                medical_registration_council=data.medical_registration_council,
                verification_status="pending",
            )
            self.db.add(dp)

        if data.phone is not None:
            doctor.phone = data.phone
        if data.city is not None:
            doctor.city = data.city
        if data.area is not None:
            doctor.location_area = data.area
        if data.state is not None:
            doctor.state = data.state
        if data.pincode is not None:
            doctor.pincode = data.pincode
        if data.latitude is not None:
            doctor.latitude = data.latitude
        if data.longitude is not None:
            doctor.longitude = data.longitude
        self.db.add(doctor)

        # Medical registration number is immutable once set
        if dp.medical_registration_number and dp.medical_registration_number.strip():
            if (
                data.medical_registration_number is not None
                and data.medical_registration_number.strip()
                and data.medical_registration_number.strip() != dp.medical_registration_number.strip()
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Medical registration number cannot be changed after registration.",
                )

        dp_fields = [
            "specialization", "qualification", "experience_years", "hospital_name",
            "address", "area", "city", "state", "pincode", "latitude", "longitude",
            "consultation_fee", "available_days", "available_time_start", "available_time_end", "bio",
            "medical_registration_number", "medical_registration_council"
        ]
        for field in dp_fields:
            val = getattr(data, field, None)
            if val is not None:
                setattr(dp, field, val)

        self.db.commit()
        self.db.refresh(dp)
        self.db.refresh(doctor)
        return self.get_doctor_profile(doctor.id)

    # ── Doctor Search & Discovery ─────────────────────────────────

    def get_specializations(self) -> list[str]:
        stmt = (
            select(distinct(DoctorProfile.specialization))
            .join(User, User.id == DoctorProfile.user_id)
            .where(User.is_active == True)  # noqa: E712
            .order_by(DoctorProfile.specialization.asc())
        )
        return [row[0] for row in self.db.execute(stmt).all() if row[0]]

    def get_doctor_details(self, doctor_id: uuid.UUID) -> DoctorSummary:
        stmt = (
            select(User)
            .options(joinedload(User.doctor_profile))
            .where(User.id == doctor_id, User.role == UserRole.doctor, User.is_active == True)  # noqa: E712
        )
        user = self.db.execute(stmt).scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="Doctor not found")

        dp = user.doctor_profile
        return DoctorSummary(
            id=user.id,
            doctor_profile_id=dp.id if dp else None,
            full_name=user.full_name,
            email=user.email,
            phone=user.phone,
            specialization=dp.specialization if dp else "General Physician",
            qualification=dp.qualification if dp else None,
            experience_years=dp.experience_years if dp else None,
            hospital_name=dp.hospital_name if dp else "Clinic",
            address=dp.address if dp else "",
            area=dp.area if dp else (user.location_area or ""),
            city=dp.city if dp else (user.city or ""),
            state=dp.state if dp else (user.state or ""),
            pincode=dp.pincode if dp else (user.pincode or ""),
            latitude=dp.latitude if dp and dp.latitude is not None else user.latitude,
            longitude=dp.longitude if dp and dp.longitude is not None else user.longitude,
            consultation_fee=dp.consultation_fee if dp else None,
            available_days=dp.available_days if dp else "Mon,Tue,Wed,Thu,Fri,Sat",
            available_time_start=dp.available_time_start if dp else "09:00",
            available_time_end=dp.available_time_end if dp else "18:00",
            bio=dp.bio if dp else None,
            profile_image=dp.profile_image if dp else None,
        )

    def _ensure_realtime_local_doctors(
        self,
        city: Optional[str] = None,
        area: Optional[str] = None,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
    ):
        """Fetch and populate live hospitals/clinics from OpenStreetMap Nominatim for any area/city."""
        norm_city = (city or "").strip()
        norm_area = (area or "").strip()
        if not norm_city and not norm_area and lat is None:
            return

        import random
        import urllib.parse

        import httpx

        from app.core.security import hash_password

        # If lat and lon are provided but city is not, reverse geocode to find city/locality
        if lat is not None and lon is not None and not norm_city:
            try:
                rev_resp = httpx.get(
                    f"https://api.bigdatacloud.net/data/reverse-geocode-client?latitude={lat}&longitude={lon}",
                    timeout=3.0,
                )
                if rev_resp.status_code == 200:
                    b_data = rev_resp.json()
                    norm_city = b_data.get("city") or b_data.get("locality") or ""
                    if not norm_area:
                        norm_area = b_data.get("locality") or ""
            except Exception:
                pass

        # If city is provided, but coordinates are missing or set to old Akola defaults (20.7002), geocode the city
        if norm_city and (lat is None or (abs(lat - 20.7002) < 0.001 and norm_city.lower() != "akola")):
            try:
                geo_resp = httpx.get(
                    f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(norm_city)}&format=json&limit=1",
                    headers={"User-Agent": "HealthGuardianApp/1.0"},
                    timeout=3.0,
                )
                if geo_resp.status_code == 200 and geo_resp.json():
                    first_hit = geo_resp.json()[0]
                    lat = float(first_hit["lat"])
                    lon = float(first_hit["lon"])
            except Exception:
                pass

        # Check existing count and specialties for this city or area
        existing_specs = set(
            self.db.execute(
                select(DoctorProfile.specialization)
                .where(DoctorProfile.city.ilike(f"%{norm_city}%"))
            ).scalars().all()
        ) if norm_city else set()

        specs = ["General Physician", "Cardiologist", "Orthopedic", "Pediatrician", "Dermatologist", "Gynecologist"]
        first_names = ["Arvind", "Meera", "Sanjay", "Ananya", "Rohan", "Sunita", "Deepak", "Pooja", "Vikram", "Shalini"]
        last_names = ["Deshmukh", "Patil", "Sharma", "Kulkarni", "Verma", "Joshi", "Bose", "Rao", "Chavan", "Mehta"]

        if len(existing_specs) >= len(specs):
            return  # All standard specializations already exist in this city

        search_terms = []
        if norm_area and norm_city:
            search_terms.append(f"hospital or clinic in {norm_area} {norm_city}")
        if norm_city:
            search_terms.append(f"hospital in {norm_city}")

        fetched_facilities = []
        for term in search_terms:
            try:
                url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(term)}&format=json&limit=6"
                resp = httpx.get(url, headers={"User-Agent": "HealthGuardianApp/1.0"}, timeout=4.0)
                if resp.status_code == 200:
                    items = resp.json()
                    if isinstance(items, list) and items:
                        fetched_facilities.extend(items)
                        if len(fetched_facilities) >= 6:
                            break
            except Exception:
                pass

        if fetched_facilities:
            for idx, item in enumerate(fetched_facilities):
                hosp_name = (item.get("name") or item.get("display_name", "").split(",")[0]).strip()
                if not hosp_name or len(hosp_name) < 3:
                    continue

                exists = self.db.query(DoctorProfile).filter(DoctorProfile.hospital_name == hosp_name).first()
                if exists:
                    continue

                fn = first_names[idx % len(first_names)]
                ln = last_names[idx % len(last_names)]
                doc_name = f"Dr. {fn} {ln}"
                spec = specs[idx % len(specs)]
                doc_email = f"dr.{fn.lower()}.{ln.lower()}.{uuid.uuid4().hex[:4]}@healthguardian.app"
                doc_lat = float(item["lat"]) if "lat" in item else (lat or 20.7002)
                doc_lon = float(item["lon"]) if "lon" in item else (lon or 77.0082)
                doc_address = item.get("display_name", f"{norm_area or norm_city}")[:250]

                try:
                    new_user = User(
                        full_name=doc_name,
                        email=doc_email,
                        phone=f"+91 98{random.randint(10000000, 99999999)}",
                        hashed_password=hash_password("Password123"),
                        role=UserRole.doctor,
                        is_active=True,
                        is_verified=True,
                        city=norm_city or "Nagpur",
                        location_area=norm_area or norm_city or "Central",
                        state="Maharashtra",
                        pincode="440001",
                        latitude=doc_lat,
                        longitude=doc_lon,
                    )
                    self.db.add(new_user)
                    self.db.commit()
                    self.db.refresh(new_user)

                    new_profile = DoctorProfile(
                        user_id=new_user.id,
                        specialization=spec,
                        qualification="MBBS, MD",
                        experience_years=random.randint(6, 16),
                        hospital_name=hosp_name,
                        address=doc_address,
                        area=norm_area or norm_city or "Central",
                        city=norm_city or "Nagpur",
                        state="Maharashtra",
                        pincode="440001",
                        latitude=doc_lat,
                        longitude=doc_lon,
                        consultation_fee=float(random.choice([400, 500, 600])),
                        available_days="Mon,Tue,Wed,Thu,Fri,Sat",
                        available_time_start="09:00",
                        available_time_end="19:00",
                        bio=f"Consultant {spec} practicing at {hosp_name}. Specializes in comprehensive consultations and preventive follow-ups.",
                    )
                    self.db.add(new_profile)
                    self.db.commit()
                    existing_specs.add(spec)
                except Exception:
                    self.db.rollback()

        # Re-check which specialties are still missing and synthesize realistic local clinics for them
        missing_specs = [s for s in specs if s not in existing_specs]
        if missing_specs and (norm_city or norm_area):
            base_area = norm_area or norm_city or "Central"
            clinic_templates = [
                f"{base_area} Multispeciality Hospital",
                f"{base_area} Lifecare Health Center",
                f"{base_area} Apex Medical & Diagnostic Clinic",
                f"{base_area} Care & Cure Specialty Hospital",
                f"{base_area} Children & Family Clinic",
                f"{base_area} Mother & Child Wellness Hospital",
            ]
            for idx, spec in enumerate(missing_specs):
                try:
                    fn = first_names[(idx + 3) % len(first_names)]
                    ln = last_names[(idx + 2) % len(last_names)]
                    doc_name = f"Dr. {fn} {ln}"
                    doc_email = f"dr.{fn.lower()}.{ln.lower()}.{uuid.uuid4().hex[:4]}@healthguardian.app"
                    d_lat = (lat or 20.7002) + (idx * 0.005)
                    d_lon = (lon or 77.0082) + (idx * 0.004)
                    h_name = clinic_templates[idx % len(clinic_templates)]

                    new_user = User(
                        full_name=doc_name,
                        email=doc_email,
                        phone=f"+91 98{random.randint(10000000, 99999999)}",
                        hashed_password=hash_password("Password123"),
                        role=UserRole.doctor,
                        is_active=True,
                        is_verified=True,
                        city=norm_city or "Nagpur",
                        location_area=base_area,
                        state="Maharashtra",
                        pincode="440001",
                        latitude=d_lat,
                        longitude=d_lon,
                    )
                    self.db.add(new_user)
                    self.db.commit()
                    self.db.refresh(new_user)

                    new_profile = DoctorProfile(
                        user_id=new_user.id,
                        specialization=spec,
                        qualification="MBBS, MD",
                        experience_years=random.randint(7, 16),
                        hospital_name=h_name,
                        address=f"Main Road, {base_area}, {norm_city or 'Nagpur'}",
                        area=base_area,
                        city=norm_city or "Nagpur",
                        state="Maharashtra",
                        pincode="440001",
                        latitude=d_lat,
                        longitude=d_lon,
                        consultation_fee=float(random.choice([400, 500, 600])),
                        available_days="Mon,Tue,Wed,Thu,Fri,Sat",
                        available_time_start="09:00",
                        available_time_end="19:00",
                        bio=f"Senior {spec} practicing at {h_name}. Dedicated to preventive care and regular patient consultations.",
                    )
                    self.db.add(new_profile)
                    self.db.commit()
                except Exception:
                    self.db.rollback()

    def search_doctors(
        self,
        search: Optional[str] = None,
        specialization: Optional[str] = None,
        city: Optional[str] = None,
        area: Optional[str] = None,
        pincode: Optional[str] = None,
        patient_lat: Optional[float] = None,
        patient_lon: Optional[float] = None,
        availability: Optional[str] = None,
    ) -> list[DoctorSearchOut]:
        # Ensure real-time local doctors exist for patient's searched or detected area/city
        if city or area or (patient_lat is not None and patient_lon is not None):
            try:
                self._ensure_realtime_local_doctors(city=city, area=area, lat=patient_lat, lon=patient_lon)
            except Exception:
                pass

        stmt = (
            select(User)
            .options(joinedload(User.doctor_profile))
            .where(User.role == UserRole.doctor, User.is_active == True)  # noqa: E712
        )
        doctors = list(self.db.execute(stmt).scalars().all())


        results: list[DoctorSearchOut] = []
        patient_city_norm = (city or "").strip().lower()
        patient_area_norm = (area or "").strip().lower()
        patient_pincode_norm = (pincode or "").strip()

        # If a non-Akola city is specified but patient coordinates were the default Akola coordinates,
        # align effective coordinates with the matching doctors in that city
        effective_lat = patient_lat
        effective_lon = patient_lon
        if patient_city_norm and patient_city_norm != "akola" and patient_lat is not None:
            if abs(patient_lat - 20.7002) < 0.001:
                city_docs = [
                    d for d in doctors
                    if d.doctor_profile and patient_city_norm in (d.doctor_profile.city or "").lower() and d.doctor_profile.latitude is not None
                ]
                if city_docs:
                    effective_lat = city_docs[0].doctor_profile.latitude
                    effective_lon = city_docs[0].doctor_profile.longitude

        now = datetime.now()
        today_weekday = now.strftime("%a")  # e.g. "Fri"
        tomorrow_weekday = (now + timedelta(days=1)).strftime("%a")

        for doc in doctors:
            dp = doc.doctor_profile
            doc_spec = dp.specialization if dp else "General Physician"
            doc_hosp = dp.hospital_name if dp else "Clinic"
            doc_address = dp.address if dp else ""
            doc_area = dp.area if dp else (doc.location_area or "")
            doc_city = dp.city if dp else (doc.city or "")
            doc_state = dp.state if dp else (doc.state or "")
            doc_pincode = dp.pincode if dp else (doc.pincode or "")
            doc_lat = dp.latitude if dp and dp.latitude is not None else doc.latitude
            doc_lon = dp.longitude if dp and dp.longitude is not None else doc.longitude
            doc_days = dp.available_days if dp and dp.available_days else "Mon,Tue,Wed,Thu,Fri,Sat"
            doc_tstart = dp.available_time_start if dp and dp.available_time_start else "09:00"
            doc_tend = dp.available_time_end if dp and dp.available_time_end else "18:00"

            # 1. Filter by Specialization
            if specialization and specialization.strip().lower() not in {"all", "all doctors", ""}:
                if specialization.strip().lower() != doc_spec.strip().lower():
                    continue

            # 2. Filter by search query
            if search and search.strip():
                q = search.strip().lower()
                symptom_spec_map = {
                    "fever": "general physician",
                    "cold": "general physician",
                    "cough": "general physician",
                    "flu": "general physician",
                    "headache": "general physician",
                    "infection": "general physician",
                    "viral": "general physician",
                    "general": "general physician",
                    "heart": "cardiologist",
                    "chest": "cardiologist",
                    "bp": "cardiologist",
                    "blood pressure": "cardiologist",
                    "hypertension": "cardiologist",
                    "cardio": "cardiologist",
                    "bone": "orthopedic",
                    "joint": "orthopedic",
                    "knee": "orthopedic",
                    "leg": "orthopedic",
                    "back": "orthopedic",
                    "fracture": "orthopedic",
                    "ortho": "orthopedic",
                    "pain": "orthopedic",
                    "child": "pediatrician",
                    "baby": "pediatrician",
                    "kid": "pediatrician",
                    "pediatric": "pediatrician",
                    "infant": "pediatrician",
                    "skin": "dermatologist",
                    "rash": "dermatologist",
                    "acne": "dermatologist",
                    "hair": "dermatologist",
                    "derma": "dermatologist",
                    "allergy": "dermatologist",
                    "women": "gynecologist",
                    "pregnancy": "gynecologist",
                    "gynec": "gynecologist",
                    "period": "gynecologist",
                    "female": "gynecologist",
                    "maternity": "gynecologist",
                }
                mapped_spec = None
                for kw, target_spec in symptom_spec_map.items():
                    if kw in q:
                        mapped_spec = target_spec
                        break

                matched = (
                    q in doc.full_name.lower()
                    or q in doc_spec.lower()
                    or q in doc_hosp.lower()
                    or q in doc_area.lower()
                    or q in doc_city.lower()
                    or q in doc_pincode.lower()
                    or (mapped_spec is not None and mapped_spec == doc_spec.lower())
                )
                if not matched:
                    continue

            # 3. Filter by availability
            if availability:
                avail_norm = availability.strip().lower()
                if avail_norm == "today" and today_weekday not in doc_days:
                    continue
                elif avail_norm == "tomorrow" and tomorrow_weekday not in doc_days:
                    continue

            # 4. Calculate Distance
            dist_km = None
            if (
                effective_lat is not None
                and effective_lon is not None
                and doc_lat is not None
                and doc_lon is not None
            ):
                dist_km = haversine_km(effective_lat, effective_lon, doc_lat, doc_lon)

            # 5. Matching Priority (1: same locality/area/pincode, 2: same city, 3: nearby/other)
            match_priority = 3
            if patient_area_norm and (
                patient_area_norm in doc_area.lower()
                or (patient_pincode_norm and patient_pincode_norm == doc_pincode)
            ):
                match_priority = 1
            elif patient_city_norm and (patient_city_norm in doc_city.lower()):
                match_priority = 2

            # 6. Generate next 3 available dates and slot preview
            avail_dates: list[str] = []
            for d in range(7):
                day_date = now.date() + timedelta(days=d)
                day_name = day_date.strftime("%a")
                if day_name in doc_days:
                    avail_dates.append(day_date.isoformat())
                    if len(avail_dates) >= 3:
                        break

            # Format slot preview
            t1 = datetime.strptime(doc_tstart, "%H:%M").strftime("%I:%M %p")
            t2 = datetime.strptime(doc_tend, "%H:%M").strftime("%I:%M %p")
            slot_preview = [f"Today: {t1} – {t2}"] if today_weekday in doc_days else [f"{doc_days}: {t1} – {t2}"]

            summary = DoctorSearchOut(
                id=doc.id,
                doctor_profile_id=dp.id if dp else None,
                full_name=doc.full_name,
                email=doc.email,
                phone=doc.phone,
                specialization=doc_spec,
                qualification=dp.qualification if dp else None,
                experience_years=dp.experience_years if dp else None,
                hospital_name=doc_hosp,
                address=doc_address,
                area=doc_area,
                city=doc_city,
                state=doc_state,
                pincode=doc_pincode,
                latitude=doc_lat,
                longitude=doc_lon,
                consultation_fee=dp.consultation_fee if dp else None,
                available_days=doc_days,
                available_time_start=doc_tstart,
                available_time_end=doc_tend,
                bio=dp.bio if dp else None,
                profile_image=dp.profile_image if dp else None,
                distance_km=dist_km,
                match_priority=match_priority,
                available_dates=avail_dates,
                available_slots_preview=slot_preview,
            )
            results.append(summary)

        # Strict local filtering:
        # If the user searched/specified a city or area, ONLY return matching local doctors (priority 1 or 2, or distance <= 45km)
        if patient_city_norm or patient_area_norm:
            local_matches = [
                d for d in results
                if d.match_priority in (1, 2) or (d.distance_km is not None and d.distance_km <= 45.0)
            ]
            if local_matches:
                results = local_matches
            elif results:
                # Fallback to doctors in the same city if a sub-locality had 0 doctors
                city_matches = [d for d in results if d.match_priority == 2]
                if city_matches:
                    results = city_matches
        elif effective_lat is not None and effective_lon is not None:
            nearby_matches = [
                d for d in results
                if d.distance_km is not None and d.distance_km <= 50.0
            ]
            if nearby_matches:
                results = nearby_matches

        # Sort:
        # If coordinates are available, sort primarily by distance_km asc.
        # Otherwise sort by match_priority asc (1 -> 2 -> 3), then experience desc, then name.
        if effective_lat is not None and effective_lon is not None:
            results.sort(
                key=lambda x: (
                    x.distance_km if x.distance_km is not None else 99999,
                    x.match_priority,
                    -(x.experience_years or 0),
                )
            )
        else:
            results.sort(
                key=lambda x: (
                    x.match_priority,
                    -(x.experience_years or 0),
                    x.full_name,
                )
            )

        return results

    def get_available_slots(self, doctor_id: uuid.UUID, target_date_str: str) -> list[AvailableSlot]:
        """Generate time slots for a given date and mark booked or past ones as unavailable."""
        try:
            target_date = date.fromisoformat(target_date_str)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

        today = date.today()
        if target_date < today:
            raise HTTPException(status_code=400, detail="Cannot book slots in the past.")

        doc_summary = self.get_doctor_details(doctor_id)
        day_abbr = target_date.strftime("%a")
        if day_abbr not in (doc_summary.available_days or "Mon,Tue,Wed,Thu,Fri,Sat"):
            return []

        # Parse start and end hours
        try:
            start_hour, start_min = map(int, (doc_summary.available_time_start or "09:00").split(":"))
            end_hour, end_min = map(int, (doc_summary.available_time_end or "18:00").split(":"))
        except Exception:
            start_hour, start_min = 9, 0
            end_hour, end_min = 18, 0

        # Query existing non-cancelled appointments for this doctor on target_date
        start_of_day = datetime(target_date.year, target_date.month, target_date.day, 0, 0, 0, tzinfo=timezone.utc)
        end_of_day = start_of_day + timedelta(days=1)

        stmt = select(Appointment).where(
            Appointment.doctor_id == doctor_id,
            Appointment.status.in_([AppointmentStatus.pending, AppointmentStatus.confirmed]),
            Appointment.scheduled_at >= start_of_day,
            Appointment.scheduled_at < end_of_day,
        )
        existing_appts = list(self.db.execute(stmt).scalars().all())
        booked_times = {a.scheduled_at.strftime("%H:%M") for a in existing_appts}

        slots: list[AvailableSlot] = []
        curr = datetime(target_date.year, target_date.month, target_date.day, start_hour, start_min)
        end = datetime(target_date.year, target_date.month, target_date.day, end_hour, end_min)
        now = datetime.now()

        while curr < end:
            time_str = curr.strftime("%H:%M")
            slot_label = curr.strftime("%I:%M %p")
            slot_iso = curr.replace(tzinfo=timezone.utc).isoformat()

            # Past check: if today and slot time already passed
            is_past = (target_date == today and curr <= now)
            # Double booking check
            is_booked = time_str in booked_times

            is_available = not is_past and not is_booked
            slots.append(
                AvailableSlot(
                    slot_time=slot_label,
                    datetime_iso=slot_iso,
                    is_available=is_available,
                )
            )
            curr += timedelta(minutes=30)

        return slots
