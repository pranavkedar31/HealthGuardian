"""
OTP generation and verification for email/phone confirmation flows.
In-memory store here for simplicity; swap for Redis in production.
"""
import random
import string
import time

_otp_store: dict[str, tuple[str, float]] = {}


def generate_otp(identifier: str, length: int = 6, expire_minutes: int = 10) -> str:
    otp = "".join(random.choices(string.digits, k=length))
    expires_at = time.time() + expire_minutes * 60
    _otp_store[identifier] = (otp, expires_at)
    return otp


def verify_otp(identifier: str, code: str) -> bool:
    record = _otp_store.get(identifier)
    if not record:
        return False
    stored_code, expires_at = record
    if time.time() > expires_at:
        del _otp_store[identifier]
        return False
    if stored_code == code:
        del _otp_store[identifier]
        return True
    return False
