"""
Shared pytest fixtures for the HealthGuardian test suite.

Uses an isolated SQLite database (file-based per test session, dropped
after) so tests run fast and require no external services. The portable
GUID/StringArray types in app/db/types.py make this possible while
production still uses native PostgreSQL types on Neon.
"""
import os

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_healthguardian.db")
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production-use-only")
os.environ.setdefault("RATE_LIMIT_ENABLED", "false")
os.environ.setdefault("ENVIRONMENT", "test")

import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.security import create_access_token, hash_password
from app.db.base_class import Base
from app.db.session import get_db
from app.main import app
from app.models.user import User, UserRole

TEST_DB_PATH = Path(__file__).resolve().parent / "test_healthguardian.db"
TEST_DATABASE_URL = f"sqlite:///{TEST_DB_PATH}"

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def _create_test_database():
    # Make sure all models are registered on Base.metadata
    import app.models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    if TEST_DB_PATH.exists():
        try:
            TEST_DB_PATH.unlink()
        except OSError:
            pass


@pytest.fixture()
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture()
def client(db_session):
    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def _make_user(db_session, email: str, password: str = "Password123", role: UserRole = UserRole.patient) -> User:
    user = User(
        full_name="Test User",
        email=email,
        hashed_password=hash_password(password),
        role=role,
        is_active=True,
        is_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def test_user(db_session) -> User:
    return _make_user(db_session, email=f"user_{uuid.uuid4().hex[:8]}@example.com")


@pytest.fixture()
def test_doctor(db_session) -> User:
    return _make_user(db_session, email=f"doctor_{uuid.uuid4().hex[:8]}@example.com", role=UserRole.doctor)


@pytest.fixture()
def test_admin(db_session) -> User:
    return _make_user(db_session, email=f"admin_{uuid.uuid4().hex[:8]}@example.com", role=UserRole.admin)


@pytest.fixture()
def auth_headers(test_user):
    token = create_access_token(test_user.id, extra_claims={"role": test_user.role.value})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def doctor_auth_headers(test_doctor):
    token = create_access_token(test_doctor.id, extra_claims={"role": test_doctor.role.value})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def admin_auth_headers(test_admin):
    token = create_access_token(test_admin.id, extra_claims={"role": test_admin.role.value})
    return {"Authorization": f"Bearer {token}"}
