"""
Tests for user profile management.
"""


class TestUserProfile:
    def test_get_profile(self, client, test_user, auth_headers):
        response = client.get("/api/v1/users/me", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["email"] == test_user.email

    def test_get_profile_requires_auth(self, client):
        response = client.get("/api/v1/users/me")
        assert response.status_code == 401

    def test_update_profile_locked_full_name_rejected(self, client, auth_headers):
        response = client.put(
            "/api/v1/users/me", json={"full_name": "Updated Name"}, headers=auth_headers
        )
        assert response.status_code == 400
        assert "Full name cannot be changed after profile completion." in response.json()["detail"]

    def test_update_profile_idempotent_full_name_allowed(self, client, auth_headers):
        response = client.put(
            "/api/v1/users/me", json={"full_name": "Test User"}, headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["full_name"] == "Test User"

    def test_update_profile_partial(self, client, auth_headers):
        response = client.put("/api/v1/users/me", json={"phone": "+1234567890"}, headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["phone"] == "+1234567890"


class TestPasswordUpdate:
    def test_update_password_success(self, client, auth_headers):
        response = client.put(
            "/api/v1/users/me/password",
            json={"current_password": "Password123", "new_password": "NewPassword456"},
            headers=auth_headers,
        )
        assert response.status_code == 200

    def test_update_password_wrong_current(self, client, auth_headers):
        response = client.put(
            "/api/v1/users/me/password",
            json={"current_password": "WrongCurrent1", "new_password": "NewPassword456"},
            headers=auth_headers,
        )
        assert response.status_code == 400

    def test_update_password_weak_new_password(self, client, auth_headers):
        response = client.put(
            "/api/v1/users/me/password",
            json={"current_password": "Password123", "new_password": "weak"},
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_new_password_actually_works_for_login(self, client, test_user, auth_headers):
        client.put(
            "/api/v1/users/me/password",
            json={"current_password": "Password123", "new_password": "BrandNewPass1"},
            headers=auth_headers,
        )
        login_response = client.post(
            "/api/v1/auth/login", json={"email": test_user.email, "password": "BrandNewPass1"}
        )
        assert login_response.status_code == 200
