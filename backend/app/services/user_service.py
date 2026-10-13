from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import PasswordUpdate, UserUpdate


class UserService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)

    def update_profile(self, user: User, data: UserUpdate) -> User:
        # Immutable field enforcement: Full Name cannot be changed once set
        if user.full_name and user.full_name.strip():
            if data.full_name is not None and data.full_name.strip() and data.full_name.strip() != user.full_name.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Full name cannot be changed after profile completion.",
                )
        return self.user_repo.update(user, data.model_dump(exclude_unset=True))

    def update_password(self, user: User, data: PasswordUpdate) -> User:
        if not verify_password(data.current_password, user.hashed_password):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
        return self.user_repo.update(user, {"hashed_password": hash_password(data.new_password)})
