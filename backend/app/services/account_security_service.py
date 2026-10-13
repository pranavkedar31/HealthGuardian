"""Password reset, OTP delivery and Have I Been Pwned account checks."""
from __future__ import annotations

import hashlib
import secrets
import smtplib
from urllib.parse import quote
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

import httpx
from fastapi import HTTPException, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.models.password_reset import PasswordResetToken
from app.models.user import User


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _send_brevo(to_email: str, to_name: str, otp: str) -> bool:
    if not settings.BREVO_API_KEY or not settings.BREVO_SENDER_EMAIL:
        return False
    payload = {
        "sender": {"name": settings.BREVO_SENDER_NAME, "email": settings.BREVO_SENDER_EMAIL},
        "to": [{"email": to_email, "name": to_name or to_email}],
        "subject": "HealthGuardian password reset OTP",
        "textContent": (
            f"Your HealthGuardian password reset code is {otp}. "
            f"It expires in {settings.OTP_EXPIRE_MINUTES} minutes. "
            "If you did not request this, ignore this email."
        ),
        "htmlContent": (
            "<div style='font-family:Arial,sans-serif'>"
            "<h2>HealthGuardian password reset</h2>"
            f"<p>Your 6-digit verification code is <b style='font-size:24px'>{otp}</b>.</p>"
            f"<p>This code expires in {settings.OTP_EXPIRE_MINUTES} minutes.</p>"
            "<p>If you did not request a password reset, you can safely ignore this email.</p>"
            "</div>"
        ),
    }
    with httpx.Client(timeout=12) as client:
        r = client.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={"accept": "application/json", "api-key": settings.BREVO_API_KEY, "content-type": "application/json"},
            json=payload,
        )
        r.raise_for_status()
    return True


def _send_smtp(to_email: str, to_name: str, otp: str) -> bool:
    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        return False
    msg = EmailMessage()
    msg["Subject"] = "HealthGuardian password reset OTP"
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to_email
    msg.set_content(
        f"Hello {to_name or 'there'},\n\n"
        f"Your HealthGuardian password reset OTP is: {otp}\n"
        f"It expires in {settings.OTP_EXPIRE_MINUTES} minutes.\n\n"
        "If you did not request this, ignore this email."
    )
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=12) as server:
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(msg)
    return True


def request_password_reset(db: Session, email: str) -> dict:
    user = db.query(User).filter(User.email == email).first()
    # Do not reveal whether an account exists.
    generic = {
        "message": "If an account exists for this email, a 6-digit OTP has been sent.",
        "email_sent": False,
    }
    if not user:
        return generic

    now = datetime.now(timezone.utc)
    recent = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.user_id == user.id)
        .order_by(desc(PasswordResetToken.created_at))
        .first()
    )
    if recent and recent.created_at:
        created = recent.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        if (now - created).total_seconds() < settings.OTP_RESEND_COOLDOWN_SECONDS:
            retry_after = max(1, int(settings.OTP_RESEND_COOLDOWN_SECONDS - (now - created).total_seconds()))
            return {**generic, "retry_after_seconds": retry_after}

    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id, PasswordResetToken.used.is_(False)
    ).update({"used": True}, synchronize_session=False)

    otp = _otp()
    row = PasswordResetToken(
        user_id=user.id,
        otp_hash=_sha256(otp),
        expires_at=now + timedelta(minutes=settings.OTP_EXPIRE_MINUTES),
        used=False,
        attempts=0,
    )
    db.add(row)
    db.commit()

    delivered = False
    try:
        delivered = _send_brevo(user.email, user.full_name, otp)
    except Exception as exc:
        print(f"Brevo password reset email failed: {exc}")
    if not delivered:
        try:
            delivered = _send_smtp(user.email, user.full_name, otp)
        except Exception as exc:
            print(f"SMTP password reset email failed: {exc}")

    # Development-only fallback. Never expose the OTP in production responses.
    if not delivered and settings.DEBUG:
        print(f"[DEV ONLY] HealthGuardian password reset OTP for {user.email}: {otp}")

    return {**generic, "email_sent": bool(delivered), "development_otp_available": bool((not delivered) and settings.DEBUG)}


def verify_password_reset_otp(db: Session, email: str, otp: str) -> dict:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")

    now = datetime.now(timezone.utc)
    row = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.user_id == user.id, PasswordResetToken.used.is_(False))
        .order_by(desc(PasswordResetToken.created_at))
        .first()
    )
    if not row or row.expires_at < now:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")
    if row.attempts >= settings.OTP_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many OTP attempts. Request a new OTP.")

    if _sha256(otp) != row.otp_hash:
        row.attempts += 1
        db.commit()
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")

    reset_token = secrets.token_urlsafe(32)
    row.reset_token_hash = _sha256(reset_token)
    row.used = True
    db.commit()
    return {"reset_token": reset_token, "message": "OTP verified. You can now set a new password."}


def reset_password(db: Session, email: str, reset_token: str, new_password: str) -> dict:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid password reset session.")

    row = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.reset_token_hash == _sha256(reset_token),
            PasswordResetToken.used.is_(True),
        )
        .order_by(desc(PasswordResetToken.created_at))
        .first()
    )
    if not row:
        raise HTTPException(status_code=400, detail="Invalid password reset session.")

    now = datetime.now(timezone.utc)
    if row.expires_at < now:
        raise HTTPException(status_code=400, detail="Password reset session has expired.")

    user.hashed_password = hash_password(new_password)
    row.reset_token_hash = None
    db.commit()
    return {"message": "Password updated successfully. You can now sign in."}


def check_email_breaches(email: str) -> dict:
    if not settings.HIBP_API_KEY:
        return {
            "configured": False,
            "breached": None,
            "count": None,
            "message": "Have I Been Pwned checking is not configured. Add HIBP_API_KEY to enable it.",
        }

    headers = {
        "hibp-api-key": settings.HIBP_API_KEY,
        "user-agent": settings.HIBP_USER_AGENT,
    }
    url = "https://haveibeenpwned.com/api/v3/breachedaccount/" + quote(email, safe="")
    with httpx.Client(timeout=12) as client:
        r = client.get(url, headers=headers, params={"truncateResponse": "false"})
    if r.status_code == 404:
        return {"configured": True, "breached": False, "count": 0, "breaches": [], "message": "No breaches found for this email."}
    if r.status_code == 429:
        raise HTTPException(status_code=429, detail="Security provider rate limit reached. Try again later.")
    r.raise_for_status()
    breaches = r.json()
    return {
        "configured": True,
        "breached": bool(breaches),
        "count": len(breaches),
        "breaches": [{"name": b.get("Name"), "title": b.get("Title"), "domain": b.get("Domain")} for b in breaches],
        "message": f"This email appears in {len(breaches)} known breach record(s)." if breaches else "No breaches found for this email.",
    }
