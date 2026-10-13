"""
Tests for Medicine Reminders, WhatsApp Cloud API health check, and Doctor/Patient Authentication separation.
"""
import uuid
import pytest
from app.utils.phone import normalize_phone_number


class TestPhoneNormalization:
    def test_indian_10_digit_numbers(self):
        is_valid, storage, wa, err = normalize_phone_number("9922248081")
        assert is_valid is True
        assert storage == "+919922248081"
        assert wa == "919922248081"
        assert err == ""

    def test_indian_with_zero(self):
        is_valid, storage, wa, err = normalize_phone_number("09922248081")
        assert is_valid is True
        assert storage == "+919922248081"
        assert wa == "919922248081"
        assert err == ""

    def test_indian_with_country_code(self):
        is_valid, storage, wa, err = normalize_phone_number("+919922248081")
        assert is_valid is True
        assert storage == "+919922248081"
        assert wa == "919922248081"
        assert err == ""

    def test_formatted_spaces_and_dashes(self):
        is_valid, storage, wa, err = normalize_phone_number("+91 99222-48081")
        assert is_valid is True
        assert storage == "+919922248081"
        assert wa == "919922248081"
        assert err == ""

    def test_invalid_short_number(self):
        is_valid, storage, wa, err = normalize_phone_number("12345")
        assert is_valid is False
        assert "Invalid phone number length" in err


class TestWhatsAppHealth:
    def test_whatsapp_health_endpoint_public(self, client):
        response = client.get("/api/whatsapp/health")
        assert response.status_code == 200
        data = response.json()
        assert "configured" in data
        assert "credentials_present" in data
        assert "api_reachable" in data
        # Ensure no secrets leaked
        assert "access_token" not in data
        assert "token" not in data


class TestDoctorPatientAuthSeparation:
    def test_patient_registration_flow(self, client):
        email = f"pat_{uuid.uuid4().hex[:8]}@example.com"
        res = client.post("/api/v1/auth/patient/register", json={
            "full_name": "Test Patient",
            "email": email,
            "password": "Password123",
            "phone": "9876543210"
        })
        assert res.status_code == 201
        data = res.json()
        assert data["email"] == email
        assert data["role"] == "patient"
        assert "id" in data

    def test_doctor_registration_wrong_code_fails(self, client):
        email = f"doc_{uuid.uuid4().hex[:8]}@example.com"
        res = client.post("/api/v1/auth/doctor/register", json={
            "full_name": "Dr. Wrong Code",
            "email": email,
            "phone": "9922248081",
            "password": "Password123",
            "specialization": "General Medicine",
            "qualification": "MBBS, MD",
            "experience_years": 10,
            "medical_registration_number": "MMC-12345",
            "medical_registration_council": "Maharashtra Medical Council",
            "hospital_name": "Belokar Hospital",
            "clinic_address": "Shivaji Nagar",
            "city": "Amravati",
            "state": "Maharashtra",
            "pincode": "444603",
            "consultation_fee": 500.0,
            "verification_code": "WRONG_CODE_999"
        })
        assert res.status_code == 400
        assert "verification code" in res.json()["detail"].lower()

    def test_doctor_registration_correct_code_succeeds(self, client):
        email = f"doc_{uuid.uuid4().hex[:8]}@example.com"
        res = client.post("/api/v1/auth/doctor/register", json={
            "full_name": "Dr. Valid Code",
            "email": email,
            "phone": "9922248081",
            "password": "Password123",
            "specialization": "Cardiology",
            "qualification": "MBBS, DM Cardiology",
            "experience_years": 12,
            "medical_registration_number": "MMC-2024-9988",
            "medical_registration_council": "Maharashtra Medical Council",
            "hospital_name": "City Care Hospital",
            "clinic_address": "Civil Lines",
            "city": "Amravati",
            "state": "Maharashtra",
            "pincode": "444601",
            "consultation_fee": 600.0,
            "verification_code": "DOCT2026"
        })
        assert res.status_code == 201
        data = res.json()
        assert data["email"] == email
        assert data["role"] == "doctor"
        assert data["verification_status"] == "pending"

    def test_role_enforcement_doctor_cannot_login_as_patient(self, client):
        email = f"doc_strict_{uuid.uuid4().hex[:8]}@example.com"
        res = client.post("/api/v1/auth/doctor/register", json={
            "full_name": "Dr. Strict",
            "email": email,
            "phone": "9922248081",
            "password": "Password123",
            "specialization": "Neurology",
            "qualification": "MBBS, DM",
            "experience_years": 8,
            "medical_registration_number": "MMC-77665",
            "medical_registration_council": "Maharashtra Medical Council",
            "hospital_name": "Neuro Care",
            "clinic_address": "Station Road",
            "city": "Amravati",
            "state": "Maharashtra",
            "pincode": "444601",
            "consultation_fee": 700.0,
            "verification_code": "DOCT2026"
        })
        assert res.status_code == 201

        # Attempt to login via patient login endpoint
        login_res = client.post("/api/v1/auth/patient/login", json={
            "email": email,
            "password": "Password123"
        })
        assert login_res.status_code in (401, 403)

        # Login via doctor login endpoint succeeds
        doc_login = client.post("/api/v1/auth/doctor/login", json={
            "email": email,
            "password": "Password123"
        })
        assert doc_login.status_code == 200
        assert "access_token" in doc_login.json()


class TestMedicineReminders:
    def test_create_reminder_with_phone_normalization(self, client, auth_headers):
        payload = {
            "medicine_name": "Metformin",
            "dosage": "500mg",
            "frequency": "twice_daily",
            "reminder_time": "08:00:00",
            "days_of_week": ["monday", "tuesday", "wednesday", "thursday", "friday"],
            "title": "Morning Diabetes Med",
            "notification_method": "both",
            "whatsapp_number": "9922248081",
            "note": "Take with breakfast"
        }
        res = client.post("/api/v1/reminders/", json=payload, headers=auth_headers)
        assert res.status_code == 201
        data = res.json()
        assert data["medicine_name"] == "Metformin"
        assert data["title"] == "Morning Diabetes Med"
        assert data["notification_method"] == "both"
        assert data["whatsapp_number"] == "+919922248081"
        assert data["delivery_status"] in ("PENDING", "SENT", "FAILED")
        assert data["next_trigger_at"] is not None

        reminder_id = data["id"]

        # Snooze reminder
        snooze_res = client.post(f"/api/v1/reminders/{reminder_id}/snooze?minutes=10", headers=auth_headers)
        assert snooze_res.status_code == 200
        assert snooze_res.json()["snooze_until"] is not None

        # Mark taken
        take_res = client.post(f"/api/v1/reminders/{reminder_id}/take", headers=auth_headers)
        assert take_res.status_code == 200
        assert take_res.json()["completed_at"] is not None

    def test_create_reminder_with_flexible_dot_time_format(self, client, auth_headers):
        payload = {
            "medicine_name": "Thyroxine",
            "dosage": "50mcg",
            "frequency": "daily",
            "reminder_time": "9.35",
            "notification_method": "browser",
        }
        res = client.post("/api/v1/reminders/", json=payload, headers=auth_headers)
        assert res.status_code == 201
        data = res.json()
        assert data["reminder_time"] == "09:35:00"
        assert data["medicine_name"] == "Thyroxine"

    def test_whatsapp_test_returns_502_not_401_on_token_expiration(self, client, auth_headers, monkeypatch):
        from app.services import reminder_service

        def mock_send_wa(phone, message):
            return {
                "success": False,
                "status_code": 401,
                "error_code": "190",
                "detail": "WhatsApp Cloud API access token is invalid or expired. Please update WHATSAPP_ACCESS_TOKEN in Meta App Dashboard."
            }

        monkeypatch.setattr(reminder_service, "send_whatsapp_message", mock_send_wa)

        res = client.post(
            "/api/v1/reminders/test-whatsapp",
            json={"phone_number": "9922248081"},
            headers=auth_headers,
        )
        # MUST be 502 Bad Gateway so patient session is not logged out!
        assert res.status_code == 502
        assert res.status_code != 401
        assert "access token is invalid or expired" in res.json()["detail"]

