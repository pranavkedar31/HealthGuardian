from typing import Optional

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.base import BaseRepository
from app.utils.phone import normalize_phone_number


class UserRepository(BaseRepository[User]):
    def __init__(self, db: Session):
        super().__init__(User, db)

    def get_by_email(self, email: str) -> Optional[User]:
        if not email:
            return None
        cleaned = email.strip()
        stmt = select(User).where(User.email.ilike(cleaned))
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_username(self, username: str) -> Optional[User]:
        if not username:
            return None
        cleaned = username.strip()
        stmt = select(User).where(User.username.ilike(cleaned))
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_email_or_username(self, identifier: str) -> Optional[User]:
        if not identifier:
            return None
        cleaned = identifier.strip()
        stmt = select(User).where(
            or_(
                User.email.ilike(cleaned),
                User.username.ilike(cleaned),
            )
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_phone(self, phone: str) -> Optional[User]:
        if not phone:
            return None
        is_valid, stored, _, _ = normalize_phone_number(phone)
        search_phone = stored if is_valid else phone.strip()
        # Also check without leading plus or spaces
        clean_digits = ''.join(filter(str.isdigit, phone))
        stmt = select(User).where(
            or_(
                User.phone == search_phone,
                User.phone == phone.strip(),
                User.phone.like(f"%{clean_digits[-10:]}%") if len(clean_digits) >= 10 else False,
            )
        )
        return self.db.execute(stmt).scalars().first()
