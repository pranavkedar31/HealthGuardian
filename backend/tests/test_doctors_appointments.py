"""
Tests for local doctor discovery, proximity ranking, appointment booking,
double-booking prevention, and status synchronization.
"""
import uuid
from datetime import date, datetime, timedelta, timezone

from app.core.security import create_access_token, hash_password
from app.models.appointment import Appointment, AppointmentStatus
from app.models.doctor_profile import DoctorProfile
from app.models.user import User, UserRole


def _create_doctor_with_profile(
    db_session,
    full_name: str,
    email: str,
    specialization: str,
    hospital_name: str,
    area: str,
    city: str = "Akola",
    pincode: str = "444001",
    lat: float = 20.7002,
    lon: float = 77.0082,
    available_days: str = "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
) -> User:
    doc = User(
        full_name=full_name,
        email=email,
        hashed_password=hash_password("Password123"),
        role=UserRole.doctor,
        is_active=True,
        is_verified=True,
        city=city,
        location_area=area,
        pincode=pincode,
        latitude=lat,
        longitude=lon,
    )
    db_session.add(doc)
    db_session.commit()
    db_session.refresh(doc)

    dp = DoctorProfile(
        user_id=doc.id,
        specialization=specialization,
        qualification="MBBS, MD",
        experience_years=10,
        hospital_name=hospital_name,
        address=f"Main Road, {area}",
        area=area,
        city=city,
        state="Maharashtra",
        pincode=pincode,
        latitude=lat,
        longitude=lon,
        consultation_fee=500.0,
        available_days=available_days,
        available_time_start="09:00",
        available_time_end="18:00",
    )
    db_session.add(dp)
    db_session.commit()
    return doc


class TestDoctorDiscovery:
    def test_search_doctors_proximity_and_filters(self, client, db_session):
        _create_doctor_with_profile(
            db_session,
            full_name="Dr. Amit Sharma",
            email=f"amit_{uuid.uuid4().hex[:6]}@test.com",
            specialization="Cardiologist",
            hospital_name="ABC Multispeciality Hospital",
            area="Ramdas Peth",
            city="Akola",
            pincode="444001",
            lat=20.7002,
            lon=77.0082,
        )
        _create_doctor_with_profile(
            db_session,
            full_name="Dr. Priya Deshmukh",
            email=f"priya_{uuid.uuid4().hex[:6]}@test.com",
            specialization="General Physician",
            hospital_name="Civil Hospital",
            area="Civil Lines",
            city="Akola",
            pincode="444001",
            lat=20.7090,
            lon=77.0020,
        )

        # 1. Search by area "Ramdas Peth" with patient coordinates
        resp = client.get(
            "/api/v1/doctors",
            params={"area": "Ramdas Peth", "city": "Akola", "latitude": 20.7002, "longitude": 77.0082},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 2
        # Ramdas Peth doctor should be closest (distance ~ 0 km) and prioritized first
        assert data[0]["full_name"] == "Dr. Amit Sharma"
        assert data[0]["match_priority"] == 1
        assert data[0]["distance_km"] == 0.0

        # 2. Filter by specialization
        resp_spec = client.get("/api/v1/doctors", params={"specialization": "Cardiologist"})
        assert resp_spec.status_code == 200
        cardio_doctors = resp_spec.json()
        assert all(d["specialization"] == "Cardiologist" for d in cardio_doctors)

        # 3. Get distinct specializations
        resp_specs = client.get("/api/v1/doctors/specializations")
        assert resp_specs.status_code == 200
        specs = resp_specs.json()
        assert "Cardiologist" in specs
        assert "General Physician" in specs

    def test_available_slots_endpoint(self, client, db_session):
        doc = _create_doctor_with_profile(
            db_session,
            full_name="Dr. Slot Test",
            email=f"slots_{uuid.uuid4().hex[:6]}@test.com",
            specialization="Dermatologist",
            hospital_name="Skin Clinic",
            area="Ramdas Peth",
            city="Akola",
        )
        target_date = (date.today() + timedelta(days=2)).isoformat()
        resp = client.get(f"/api/v1/doctors/{doc.id}/available-slots", params={"date": target_date})
        assert resp.status_code == 200
        slots = resp.json()
        assert len(slots) > 0
        assert all("slot_time" in s and "is_available" in s for s in slots)

    def test_slots_reject_past_date(self, client, db_session):
        doc = _create_doctor_with_profile(
            db_session,
            full_name="Dr. Past Slot",
            email=f"past_{uuid.uuid4().hex[:6]}@test.com",
            specialization="Pediatrician",
            hospital_name="Kids Clinic",
            area="Ramdas Peth",
            city="Akola",
        )
        past_date = (date.today() - timedelta(days=1)).isoformat()
        resp = client.get(f"/api/v1/doctors/{doc.id}/available-slots", params={"date": past_date})
        assert resp.status_code == 400


class TestAppointmentBookingAndSync:
    def test_booking_flow_and_double_booking_prevention(self, client, db_session, test_user, auth_headers):
        doc = _create_doctor_with_profile(
            db_session,
            full_name="Dr. Booking Test",
            email=f"book_{uuid.uuid4().hex[:6]}@test.com",
            specialization="Orthopedic",
            hospital_name="Joint Care Hospital",
            area="Ramdas Peth",
            city="Akola",
        )

        future_slot = (datetime.now(timezone.utc) + timedelta(days=2)).replace(
            hour=10, minute=30, second=0, microsecond=0
        )

        # 1. Book appointment
        booking_payload = {
            "doctor_id": str(doc.id),
            "scheduled_at": future_slot.isoformat(),
            "reason": "Knee pain consultation",
        }
        resp = client.post("/api/v1/appointments", json=booking_payload, headers=auth_headers)
        assert resp.status_code == 201
        appt_data = resp.json()
        assert appt_data["status"] == "pending"
        assert appt_data["doctor"]["full_name"] == "Dr. Booking Test"
        assert appt_data["doctor"]["hospital_name"] == "Joint Care Hospital"
        assert appt_data["doctor"]["area"] == "Ramdas Peth"

        # 2. Attempt double booking for the exact same slot -> should reject with 409
        resp_conflict = client.post("/api/v1/appointments", json=booking_payload, headers=auth_headers)
        assert resp_conflict.status_code == 409
        assert "already has an appointment" in resp_conflict.json()["detail"]

        # 3. Patient sees the appointment in list
        resp_list = client.get("/api/v1/appointments", headers=auth_headers)
        assert resp_list.status_code == 200
        patient_appts = resp_list.json()
        assert any(a["id"] == appt_data["id"] for a in patient_appts)

        # 4. Doctor sees appointment and confirms it
        doc_token = create_access_token(doc.id, extra_claims={"role": doc.role.value})
        doc_headers = {"Authorization": f"Bearer {doc_token}"}

        resp_doc_list = client.get("/api/v1/doctor/appointments", headers=doc_headers)
        assert resp_doc_list.status_code == 200
        doc_appts = resp_doc_list.json()
        assert any(a["id"] == appt_data["id"] for a in doc_appts)

        # Doctor updates status to "confirmed"
        resp_confirm = client.put(
            f"/api/v1/doctor/appointments/{appt_data['id']}",
            json={"status": "confirmed"},
            headers=doc_headers,
        )
        assert resp_confirm.status_code == 200
        assert resp_confirm.json()["status"] == "confirmed"

        # 5. Patient sees status updated to "confirmed"
        resp_check = client.get("/api/v1/appointments", headers=auth_headers)
        updated_appt = next(a for a in resp_check.json() if a["id"] == appt_data["id"])
        assert updated_appt["status"] == "confirmed"

        # 6. Patient received confirmation and reminder notifications
        resp_notifs = client.get("/api/v1/notifications", headers=auth_headers)
        assert resp_notifs.status_code == 200
        notifs = resp_notifs.json()
        assert any("Confirmed ✓" in n["title"] for n in notifs)

    def test_booking_rejects_past_date(self, client, auth_headers):
        past_time = datetime.now(timezone.utc) - timedelta(hours=2)
        resp = client.post(
            "/api/v1/appointments",
            json={"scheduled_at": past_time.isoformat(), "reason": "Past visit"},
            headers=auth_headers,
        )
        assert resp.status_code == 400

    def test_doctor_stats_and_profile_endpoints(self, client, doctor_auth_headers):
        # 1. Stats endpoint
        resp_stats = client.get("/api/v1/doctor/appointments/stats", headers=doctor_auth_headers)
        assert resp_stats.status_code == 200
        stats = resp_stats.json()
        assert "total" in stats
        assert "pending" in stats
        assert "approved" in stats
        assert "rejected" in stats
        assert "canceled" in stats
        assert "completed" in stats

        # 2. Get profile
        resp_prof = client.get("/api/v1/doctor/profile", headers=doctor_auth_headers)
        assert resp_prof.status_code == 200
        prof = resp_prof.json()
        assert prof["role"] == "doctor"
        assert "specialization" in prof

        # 3. Update profile
        resp_up = client.put(
            "/api/v1/doctor/profile",
            json={"consultation_fee": 650.0, "bio": "Updated clinical bio."},
            headers=doctor_auth_headers,
        )
        assert resp_up.status_code == 200
        up_data = resp_up.json()
        assert up_data["consultation_fee"] == 650.0
        assert up_data["bio"] == "Updated clinical bio."

