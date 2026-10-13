"""
Tests for health profile CRUD and validation.
"""


class TestHealthProfileCreate:
    def test_create_profile_success(self, client, auth_headers):
        payload = {
            "age": 30,
            "gender": "female",
            "height_cm": 165.0,
            "weight_kg": 60.0,
            "blood_group": "O+",
            "allergies": ["pollen"],
            "chronic_conditions": [],
            "smoking": False,
            "alcohol": False,
        }
        response = client.post("/api/v1/health-profile", json=payload, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["age"] == 30
        assert data["blood_group"] == "O+"
        assert data["allergies"] == ["pollen"]

    def test_create_profile_duplicate_rejected(self, client, auth_headers):
        payload = {"age": 25}
        first = client.post("/api/v1/health-profile", json=payload, headers=auth_headers)
        assert first.status_code == 201

        second = client.post("/api/v1/health-profile", json=payload, headers=auth_headers)
        assert second.status_code == 409

    def test_create_profile_requires_auth(self, client):
        response = client.post("/api/v1/health-profile", json={"age": 25})
        assert response.status_code == 401


class TestHealthProfileValidation:
    def test_age_out_of_range_rejected(self, client, auth_headers):
        response = client.post("/api/v1/health-profile", json={"age": 200}, headers=auth_headers)
        assert response.status_code == 422

    def test_negative_age_rejected(self, client, auth_headers):
        response = client.post("/api/v1/health-profile", json={"age": -5}, headers=auth_headers)
        assert response.status_code == 422

    def test_invalid_height_rejected(self, client, auth_headers):
        response = client.post("/api/v1/health-profile", json={"height_cm": -10}, headers=auth_headers)
        assert response.status_code == 422

    def test_invalid_weight_rejected(self, client, auth_headers):
        response = client.post("/api/v1/health-profile", json={"weight_kg": 0}, headers=auth_headers)
        assert response.status_code == 422


class TestHealthProfileUpdate:
    def test_get_profile_when_none_exists(self, client, auth_headers):
        response = client.get("/api/v1/health-profile", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() is None

    def test_update_nonexistent_profile_returns_404(self, client, auth_headers):
        response = client.put("/api/v1/health-profile", json={"age": 40}, headers=auth_headers)
        assert response.status_code == 404

    def test_create_then_update(self, client, auth_headers):
        client.post("/api/v1/health-profile", json={"age": 25}, headers=auth_headers)

        response = client.put("/api/v1/health-profile", json={"age": 26}, headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["age"] == 26

    def test_create_then_get(self, client, auth_headers):
        client.post("/api/v1/health-profile", json={"age": 28, "gender": "male"}, headers=auth_headers)

        response = client.get("/api/v1/health-profile", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["age"] == 28
