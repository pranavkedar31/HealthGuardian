"""
Tests for immutable demographic profile fields enforcement:
- Full Name
- Gender
- Date of Birth
- Blood Group
- Editable fields verification (height, weight, lifestyle)
- Partial update bypass prevention
- Chatbot demographic change guard
"""
import pytest
from app.models.user import UserRole
from app.services.auth_service import AuthService
from app.schemas.user import PatientRegisterRequest


class TestImmutableProfileFields:
    def test_initial_creation_and_subsequent_gender_lock(self, client, auth_headers):
        # 1. First time profile creation allows setting immutable fields
        payload = {
            "gender": "male",
            "blood_group": "O+",
            "date_of_birth": "1995-05-15",
            "height_cm": 175.0,
            "weight_kg": 70.0,
            "allergies": ["dust"],
        }
        res = client.post("/api/v1/health-profile", json=payload, headers=auth_headers)
        assert res.status_code == 201
        data = res.json()
        assert data["gender"] == "male"
        assert data["blood_group"] == "O+"
        assert data["date_of_birth"] == "1995-05-15"
        assert data["height_cm"] == 175.0

        # 2. Attempting to change Gender must be rejected
        res2 = client.put(
            "/api/v1/health-profile",
            json={"gender": "female"},
            headers=auth_headers,
        )
        assert res2.status_code == 400
        assert "Gender cannot be changed after profile completion." in res2.json()["detail"]

        # 3. Attempting to change Blood Group must be rejected
        res3 = client.put(
            "/api/v1/health-profile",
            json={"blood_group": "AB+"},
            headers=auth_headers,
        )
        assert res3.status_code == 400
        assert "Blood group cannot be changed after profile completion." in res3.json()["detail"]

        # 4. Attempting to change Date of Birth must be rejected
        res4 = client.put(
            "/api/v1/health-profile",
            json={"date_of_birth": "2000-01-01"},
            headers=auth_headers,
        )
        assert res4.status_code == 400
        assert "Date of birth cannot be changed after profile completion." in res4.json()["detail"]

    def test_editable_fields_remain_updateable(self, client, auth_headers):
        # Initial create
        res = client.post(
            "/api/v1/health-profile",
            json={
                "gender": "female",
                "blood_group": "A+",
                "height_cm": 160.0,
                "weight_kg": 55.0,
                "smoking": False,
            },
            headers=auth_headers,
        )
        assert res.status_code == 201

        # Changing height and weight must SUCCEED (physical metrics naturally change)
        res_update = client.put(
            "/api/v1/health-profile",
            json={
                "height_cm": 161.0,
                "weight_kg": 54.0,
                "smoking": True,
                "allergies": ["penicillin"],
            },
            headers=auth_headers,
        )
        assert res_update.status_code == 200
        data = res_update.json()
        assert data["height_cm"] == 161.0
        assert data["weight_kg"] == 54.0
        assert data["smoking"] is True
        assert data["allergies"] == ["penicillin"]
        # Immutable fields remained unchanged
        assert data["gender"] == "female"
        assert data["blood_group"] == "A+"

    def test_partial_update_bypass_prevented(self, client, auth_headers):
        # Create profile
        client.post(
            "/api/v1/health-profile",
            json={"gender": "male", "blood_group": "B+"},
            headers=auth_headers,
        )

        # Malicious client sends partial JSON trying to bypass frontend
        res = client.put(
            "/api/v1/health-profile",
            json={"blood_group": "O-"},
            headers=auth_headers,
        )
        assert res.status_code == 400
        assert "Blood group cannot be changed after profile completion." in res.json()["detail"]

    def test_idempotent_immutable_values_allowed(self, client, auth_headers):
        # Create profile
        client.post(
            "/api/v1/health-profile",
            json={"gender": "male", "blood_group": "B+", "date_of_birth": "1992-04-10"},
            headers=auth_headers,
        )

        # Submitting the same values must succeed without error
        res = client.put(
            "/api/v1/health-profile",
            json={
                "gender": "male",
                "blood_group": "B+",
                "date_of_birth": "1992-04-10",
                "weight_kg": 72.0,
            },
            headers=auth_headers,
        )
        assert res.status_code == 200
        assert res.json()["weight_kg"] == 72.0

    def test_null_fields_can_be_set_once(self, client, auth_headers):
        # Profile initially created with no blood group or DOB
        res = client.post(
            "/api/v1/health-profile",
            json={"gender": "other", "height_cm": 170.0},
            headers=auth_headers,
        )
        assert res.status_code == 201

        # First time setting blood group and DOB succeeds
        res_set = client.put(
            "/api/v1/health-profile",
            json={"blood_group": "O+", "date_of_birth": "1998-08-20"},
            headers=auth_headers,
        )
        assert res_set.status_code == 200
        assert res_set.json()["blood_group"] == "O+"
        assert res_set.json()["date_of_birth"] == "1998-08-20"

        # Now that they are set, modifying them must fail
        res_modify = client.put(
            "/api/v1/health-profile",
            json={"blood_group": "AB-"},
            headers=auth_headers,
        )
        assert res_modify.status_code == 400
        assert "Blood group cannot be changed after profile completion." in res_modify.json()["detail"]

    def test_patient_registration_populates_immutable_fields(self, db_session):
        service = AuthService(db_session)
        req = PatientRegisterRequest(
            full_name="Ananya Sharma",
            email="ananya.sharma@example.com",
            password="StrongPassword1",
            phone="9876543210",
            gender="female",
            blood_group="B+",
            date_of_birth="1996-03-25",
            allergies="nuts, dust",
            medical_conditions="mild asthma",
        )
        res = service.register_patient(req)
        assert res["full_name"] == "Ananya Sharma"

        user = service.user_repo.get_by_email("ananya.sharma@example.com")
        assert user is not None
        assert user.health_profile is not None
        assert user.health_profile.gender == "female"
        assert user.health_profile.blood_group == "B+"
        assert user.health_profile.date_of_birth == "1996-03-25"
        assert user.health_profile.allergies == ["nuts", "dust"]
        assert user.health_profile.chronic_conditions == ["mild asthma"]
        assert user.health_profile.age is not None
        assert user.health_profile.age > 0

    def test_chatbot_guard_blocks_demographic_change_request(self, client, auth_headers):
        chat_req = {
            "message": "Can you please change my gender to female?",
            "language": "English",
        }
        res = client.post("/api/v1/chatbot/message", json=chat_req, headers=auth_headers)
        assert res.status_code == 200
        reply = res.json()["reply"]
        assert "cannot be changed after profile completion" in reply
