from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import (
    DoctorRegisterRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    PasswordResetVerify,
    PatientRegisterRequest,
    Token,
    UserCreate,
    UserLogin,
    UserOut,
)
from app.services.account_security_service import (
    check_email_breaches,
    request_password_reset,
    reset_password,
    verify_password_reset_otp,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ── Generic Endpoints (Backward Compatible) ───────────────────

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    service = AuthService(db)
    return service.register(user_in)


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    service = AuthService(db)
    user = service.authenticate(credentials)
    return service.issue_tokens(user)


# ── Dedicated Doctor Authentication & Registration ────────────

@router.post("/doctor/register", status_code=status.HTTP_201_CREATED)
def doctor_register(data: DoctorRegisterRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    return service.register_doctor(data)


@router.post("/doctor/login", response_model=Token)
def doctor_login(credentials: UserLogin, db: Session = Depends(get_db)):
    service = AuthService(db)
    user = service.authenticate(credentials, expected_role="doctor")
    return service.issue_tokens(user)


# ── Dedicated Patient Authentication & Registration ───────────

@router.post("/patient/register", status_code=status.HTTP_201_CREATED)
def patient_register(data: PatientRegisterRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    return service.register_patient(data)


@router.post("/patient/login", response_model=Token)
def patient_login(credentials: UserLogin, db: Session = Depends(get_db)):
    service = AuthService(db)
    user = service.authenticate(credentials, expected_role="patient")
    return service.issue_tokens(user)


# ── Profile & Password Reset ──────────────────────────────────

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/forgot-password")
def forgot_password(data: PasswordResetRequest, db: Session = Depends(get_db)):
    return request_password_reset(db, data.email)


@router.post("/verify-reset-otp")
def verify_reset_otp(data: PasswordResetVerify, db: Session = Depends(get_db)):
    return verify_password_reset_otp(db, data.email, data.otp)


@router.post("/reset-password")
def reset_password_route(data: PasswordResetConfirm, db: Session = Depends(get_db)):
    return reset_password(db, data.email, data.reset_token, data.new_password)


@router.get("/security/breach-check")
def breach_check(current_user: User = Depends(get_current_user)):
    return check_email_breaches(current_user.email)
