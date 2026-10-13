"""
Tests for risk prediction and BMI calculation endpoints.
"""


class TestRiskPrediction:
    def test_predict_risk_success(self, client, auth_headers):
        payload = {
            "age": 45,
            "bmi": 29.5,
            "blood_pressure_systolic": 135,
            "blood_sugar": 110,
            "smoking": True,
            "alcohol": False,
        }
        response = client.post("/api/v1/predictions/risk", json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "diabetes_risk" in data
        assert "heart_disease_risk" in data
        assert "hypertension_risk" in data
        assert data["risk_level"] in ("low", "moderate", "high")
        for key in ("diabetes_risk", "heart_disease_risk", "hypertension_risk"):
            assert 0 <= data[key] <= 100

    def test_predict_risk_requires_auth(self, client):
        response = client.post(
            "/api/v1/predictions/risk",
            json={
                "age": 40,
                "bmi": 25,
                "blood_pressure_systolic": 120,
                "blood_sugar": 90,
            },
        )
        assert response.status_code == 401

    def test_predict_risk_missing_fields_rejected(self, client, auth_headers):
        response = client.post("/api/v1/predictions/risk", json={"age": 40}, headers=auth_headers)
        assert response.status_code == 422

    def test_higher_risk_factors_increase_risk_level(self, client, auth_headers):
        low_risk_payload = {
            "age": 22,
            "bmi": 21,
            "blood_pressure_systolic": 110,
            "blood_sugar": 85,
            "smoking": False,
            "alcohol": False,
        }
        high_risk_payload = {
            "age": 70,
            "bmi": 38,
            "blood_pressure_systolic": 175,
            "blood_sugar": 230,
            "smoking": True,
            "alcohol": True,
        }
        low = client.post("/api/v1/predictions/risk", json=low_risk_payload, headers=auth_headers).json()
        high = client.post("/api/v1/predictions/risk", json=high_risk_payload, headers=auth_headers).json()

        low_avg = (low["diabetes_risk"] + low["heart_disease_risk"] + low["hypertension_risk"]) / 3
        high_avg = (high["diabetes_risk"] + high["heart_disease_risk"] + high["hypertension_risk"]) / 3
        assert high_avg > low_avg


class TestBMICalculator:
    def test_bmi_calculation_normal(self, client, auth_headers):
        response = client.post(
            "/api/v1/predictions/bmi", json={"height_cm": 175, "weight_kg": 70}, headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["bmi"] == 22.86
        assert data["category"] == "normal"

    def test_bmi_calculation_underweight(self, client, auth_headers):
        response = client.post(
            "/api/v1/predictions/bmi", json={"height_cm": 175, "weight_kg": 45}, headers=auth_headers
        )
        assert response.json()["category"] == "underweight"

    def test_bmi_calculation_obese(self, client, auth_headers):
        response = client.post(
            "/api/v1/predictions/bmi", json={"height_cm": 170, "weight_kg": 100}, headers=auth_headers
        )
        assert response.json()["category"] == "obese"

    def test_bmi_invalid_input_rejected(self, client, auth_headers):
        response = client.post(
            "/api/v1/predictions/bmi", json={"height_cm": -175, "weight_kg": 70}, headers=auth_headers
        )
        assert response.status_code == 422

    def test_bmi_requires_auth(self, client):
        response = client.post("/api/v1/predictions/bmi", json={"height_cm": 175, "weight_kg": 70})
        assert response.status_code == 401


class TestDietAndWorkoutGeneration:
    def test_generate_diet_plan(self, client, auth_headers):
        response = client.post(
            "/api/v1/diet/generate",
            json={"goal": "weight_loss", "dietary_preference": "vegetarian"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["goal"] == "weight_loss"
        assert data["daily_calories"] > 0
        assert "meals" in data

    def test_diet_history(self, client, auth_headers):
        client.post("/api/v1/diet/generate", json={"goal": "maintenance"}, headers=auth_headers)
        response = client.get("/api/v1/diet/history", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()) >= 1

    def test_generate_workout_plan(self, client, auth_headers):
        response = client.post(
            "/api/v1/workout/generate",
            json={"goal": "strength", "difficulty": "intermediate", "days_per_week": 4},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["days_per_week"] == 4
        assert len(data["schedule"]) == 4

    def test_workout_invalid_days_rejected(self, client, auth_headers):
        response = client.post(
            "/api/v1/workout/generate",
            json={"goal": "strength", "days_per_week": 10},
            headers=auth_headers,
        )
        assert response.status_code == 422
