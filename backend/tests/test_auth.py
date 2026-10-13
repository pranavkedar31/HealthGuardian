"""
Tests for authentication: registration, login, JWT validation, protected routes.
"""
import uuid

from app.core.security import create_access_token, decode_token


class TestRegistration:
    def test_register_success(self, client):
        payload = {
            "full_name": "Jane Doe",
            "email": f"jane_{uuid.uuid4().hex[:8]}@example.com",
            "password": "SecurePass1",
        }
        response = client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == payload["email"]
        assert data["full_name"] == payload["full_name"]
        assert data["role"] == "patient"
        assert "hashed_password" not in data
        assert "password" not in data

    def test_register_duplicate_email(self, client):
        email = f"dup_{uuid.uuid4().hex[:8]}@example.com"
        payload = {"full_name": "Dup User", "email": email, "password": "SecurePass1"}

        first = client.post("/api/v1/auth/register", json=payload)
        assert first.status_code == 201

        second = client.post("/api/v1/auth/register", json=payload)
        assert second.status_code == 409
        assert "already registered" in second.json()["detail"].lower()

    def test_register_weak_password_rejected(self, client):
        payload = {
            "full_name": "Weak Pass",
            "email": f"weak_{uuid.uuid4().hex[:8]}@example.com",
            "password": "onlyletters",  # no digit
        }
        response = client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 422

    def test_register_invalid_email_rejected(self, client):
        payload = {"full_name": "Bad Email", "email": "not-an-email", "password": "SecurePass1"}
        response = client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 422

    def test_register_short_password_rejected(self, client):
        payload = {
            "full_name": "Short Pass",
            "email": f"short_{uuid.uuid4().hex[:8]}@example.com",
            "password": "a1",
        }
        response = client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 422


class TestLogin:
    def _register(self, client, email: str, password: str = "SecurePass1"):
        return client.post(
            "/api/v1/auth/register", json={"full_name": "Login User", "email": email, "password": password}
        )

    def test_login_success(self, client):
        email = f"login_{uuid.uuid4().hex[:8]}@example.com"
        self._register(client, email)

        response = client.post("/api/v1/auth/login", json={"email": email, "password": "SecurePass1"})
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_login_invalid_password(self, client):
        email = f"badpass_{uuid.uuid4().hex[:8]}@example.com"
        self._register(client, email)

        response = client.post("/api/v1/auth/login", json={"email": email, "password": "WrongPassword1"})
        assert response.status_code == 401

    def test_login_nonexistent_user(self, client):
        response = client.post(
            "/api/v1/auth/login", json={"email": "doesnotexist@example.com", "password": "SecurePass1"}
        )
        assert response.status_code == 401

    def test_access_token_contains_valid_claims(self, client):
        email = f"claims_{uuid.uuid4().hex[:8]}@example.com"
        self._register(client, email)
        response = client.post("/api/v1/auth/login", json={"email": email, "password": "SecurePass1"})
        token = response.json()["access_token"]

        payload = decode_token(token)
        assert payload["type"] == "access"
        assert "sub" in payload
        assert "role" in payload


class TestProtectedRoutes:
    def test_me_requires_auth(self, client):
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 401

    def test_me_with_valid_token(self, client, test_user, auth_headers):
        response = client.get("/api/v1/auth/me", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["email"] == test_user.email

    def test_me_with_invalid_token(self, client):
        response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not.a.valid.token"})
        assert response.status_code == 401

    def test_me_with_malformed_header(self, client):
        response = client.get("/api/v1/auth/me", headers={"Authorization": "NotBearer sometoken"})
        assert response.status_code == 401

    def test_me_with_expired_token(self, client, test_user):
        from datetime import timedelta

        from app.core import security

        expired_token = security._create_token(
            test_user.id, expires_delta=timedelta(minutes=-5), token_type="access"
        )
        response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
        assert response.status_code == 401

    def test_refresh_token_rejected_on_protected_route(self, client, test_user):
        from app.core.security import create_refresh_token

        refresh_token = create_refresh_token(test_user.id)
        response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {refresh_token}"})
        assert response.status_code == 401
