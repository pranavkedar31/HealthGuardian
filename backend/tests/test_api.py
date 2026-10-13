"""
Integration tests exercising complete user flows across multiple
endpoints, plus general API-level and security checks.
"""
import io
import uuid


class TestFullUserFlow:
    def test_register_login_profile_predict_report_flow(self, client):
        email = f"flow_{uuid.uuid4().hex[:8]}@example.com"
        password = "FlowPass123"

        # 1. Register
        register_response = client.post(
            "/api/v1/auth/register",
            json={"full_name": "Flow User", "email": email, "password": password},
        )
        assert register_response.status_code == 201
        user_id = register_response.json()["id"]

        # 2. Login
        login_response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 3. Confirm identity via /me
        me_response = client.get("/api/v1/auth/me", headers=headers)
        assert me_response.status_code == 200
        assert me_response.json()["id"] == user_id

        # 4. Create Health Profile
        profile_response = client.post(
            "/api/v1/health-profile",
            json={"age": 35, "gender": "male", "height_cm": 178, "weight_kg": 82, "smoking": False, "alcohol": False},
            headers=headers,
        )
        assert profile_response.status_code == 201

        # 5. Predict Disease Risk (using the health profile's implied vitals)
        risk_response = client.post(
            "/api/v1/predictions/risk",
            json={
                "age": 35,
                "bmi": 25.9,
                "blood_pressure_systolic": 128,
                "blood_sugar": 105,
                "smoking": False,
                "alcohol": False,
            },
            headers=headers,
        )
        assert risk_response.status_code == 200
        assert "risk_level" in risk_response.json()

        # 5b. Also run the symptom checker (disease prediction from symptoms)
        symptom_response = client.post(
            "/api/v1/symptoms/check", json={"symptoms": ["fever", "cough"]}, headers=headers
        )
        assert symptom_response.status_code == 200

        # 6. Generate Report (upload + AI summary) and download as PDF
        files = {"file": ("checkup.txt", io.BytesIO(b"Routine checkup notes."), "text/plain")}
        report_response = client.post("/api/v1/reports/upload", files=files, headers=headers)
        assert report_response.status_code == 201
        report_id = report_response.json()["id"]

        pdf_response = client.get(f"/api/v1/reports/{report_id}/pdf", headers=headers)
        assert pdf_response.status_code == 200
        assert pdf_response.content.startswith(b"%PDF")

        # Sanity: all records show up in their respective histories
        assert len(client.get("/api/v1/health-profile", headers=headers).json() or {}) > 0
        assert len(client.get("/api/v1/symptoms/history", headers=headers).json()) == 1
        assert len(client.get("/api/v1/reports/history", headers=headers).json()) == 1

    def test_diet_and_workout_flow_uses_health_profile(self, client):
        email = f"diet_flow_{uuid.uuid4().hex[:8]}@example.com"
        client.post(
            "/api/v1/auth/register", json={"full_name": "Diet Flow", "email": email, "password": "FlowPass123"}
        )
        login = client.post("/api/v1/auth/login", json={"email": email, "password": "FlowPass123"})
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

        client.post(
            "/api/v1/health-profile",
            json={"age": 28, "gender": "female", "height_cm": 162, "weight_kg": 58},
            headers=headers,
        )

        diet_response = client.post(
            "/api/v1/diet/generate", json={"goal": "muscle_gain"}, headers=headers
        )
        assert diet_response.status_code == 200
        assert diet_response.json()["daily_calories"] > 0

        workout_response = client.post(
            "/api/v1/workout/generate", json={"goal": "cardio", "days_per_week": 5}, headers=headers
        )
        assert workout_response.status_code == 200
        assert len(workout_response.json()["schedule"]) == 5


class TestAPIGeneral:
    def test_root_health_check(self, client):
        response = client.get("/")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    def test_health_endpoint(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

    def test_openapi_schema_available(self, client):
        response = client.get("/openapi.json")
        assert response.status_code == 200
        schema = response.json()
        assert schema["info"]["title"] == "HealthGuardian"

    def test_nonexistent_route_returns_404(self, client):
        response = client.get("/api/v1/does-not-exist")
        assert response.status_code == 404

    def test_docs_available(self, client):
        response = client.get("/docs")
        assert response.status_code == 200


class TestSecurity:
    def test_unauthorized_access_across_all_protected_endpoints(self, client):
        protected_get_endpoints = [
            "/api/v1/auth/me",
            "/api/v1/users/me",
            "/api/v1/health-profile",
            "/api/v1/symptoms/history",
            "/api/v1/diet/history",
            "/api/v1/workout/history",
            "/api/v1/chatbot/history",
            "/api/v1/reports/history",
            "/api/v1/reminders",
            "/api/v1/appointments",
        ]
        for endpoint in protected_get_endpoints:
            response = client.get(endpoint)
            assert response.status_code == 401, f"{endpoint} should require auth"

    def test_invalid_jwt_rejected(self, client):
        response = client.get("/api/v1/users/me", headers={"Authorization": "Bearer garbage.token.value"})
        assert response.status_code == 401

    def test_tampered_jwt_rejected(self, client, auth_headers):
        tampered = auth_headers["Authorization"][:-2] + "xx"
        response = client.get("/api/v1/users/me", headers={"Authorization": tampered})
        assert response.status_code == 401

    def test_patient_cannot_access_admin_routes(self, client, auth_headers):
        response = client.get("/api/v1/admin/users", headers=auth_headers)
        assert response.status_code == 403

    def test_patient_cannot_access_doctor_routes(self, client, auth_headers):
        response = client.get("/api/v1/doctor/appointments", headers=auth_headers)
        assert response.status_code == 403

    def test_admin_can_access_admin_routes(self, client, admin_auth_headers):
        response = client.get("/api/v1/admin/users", headers=admin_auth_headers)
        assert response.status_code == 200

    def test_doctor_can_access_doctor_routes(self, client, doctor_auth_headers):
        response = client.get("/api/v1/doctor/appointments", headers=doctor_auth_headers)
        assert response.status_code == 200
