"""
Tests for the AI symptom checker endpoint and history.
"""


class TestSymptomChecker:
    def test_check_symptoms_success(self, client, auth_headers):
        response = client.post(
            "/api/v1/symptoms/check",
            json={"symptoms": ["fever", "cough", "sore throat"], "notes": "started yesterday"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "predicted_condition" in data
        assert "confidence" in data
        assert "severity" in data
        assert "recommendation" in data
        assert 0 <= data["confidence"] <= 100

    def test_check_symptoms_empty_list_rejected(self, client, auth_headers):
        response = client.post("/api/v1/symptoms/check", json={"symptoms": []}, headers=auth_headers)
        assert response.status_code == 422

    def test_check_symptoms_requires_auth(self, client):
        response = client.post("/api/v1/symptoms/check", json={"symptoms": ["fever"]})
        assert response.status_code == 401

    def test_check_symptoms_severe_case(self, client, auth_headers):
        response = client.post(
            "/api/v1/symptoms/check",
            json={"symptoms": ["chest pain", "shortness of breath", "sweating"]},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["severity"] in ("mild", "moderate", "severe")

    def test_symptom_history_recorded(self, client, auth_headers):
        client.post("/api/v1/symptoms/check", json={"symptoms": ["headache", "nausea"]}, headers=auth_headers)

        response = client.get("/api/v1/symptoms/history", headers=auth_headers)
        assert response.status_code == 200
        history = response.json()
        assert len(history) >= 1
        assert history[0]["symptoms"] == ["headache", "nausea"]

    def test_symptom_history_requires_auth(self, client):
        response = client.get("/api/v1/symptoms/history")
        assert response.status_code == 401
