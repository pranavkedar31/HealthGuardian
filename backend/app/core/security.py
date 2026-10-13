"""
Security core: password hashing (passlib/bcrypt) and JWT creation/verification.

NOTE: bcrypt is pinned to 4.0.1 in requirements.txt. passlib==1.7.4 reads
bcrypt's internal __about__.__version__ attribute to detect the backend;
bcrypt>=4.1 removed that attribute and breaks passlib's version sniffing,
causing a spurious "password cannot be longer than 72 bytes" / backend
detection error on first hash. Pinning bcrypt==4.0.1 avoids this entirely.
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str | int, extra_claims: Optional[dict[str, Any]] = None) -> str:
    return _create_token(
        subject,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        token_type="access",
        extra_claims=extra_claims,
    )


def create_refresh_token(subject: str | int) -> str:
    return _create_token(
        subject,
        expires_delta=timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES),
        token_type="refresh",
    )


def _create_token(
    subject: str | int,
    expires_delta: timedelta,
    token_type: str,
    extra_claims: Optional[dict[str, Any]] = None,
) -> str:
    now = datetime.now(timezone.utc)
    to_encode: dict[str, Any] = {
        "sub": str(subject),
        "iat": now,
        "exp": now + expires_delta,
        "type": token_type,
    }
    if extra_claims:
        to_encode.update(extra_claims)
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


class TokenPayloadError(Exception):
    pass


def decode_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError as exc:
        raise TokenPayloadError(str(exc)) from exc
