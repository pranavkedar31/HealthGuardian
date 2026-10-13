from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import PasswordUpdate, UserOut, UserUpdate
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserOut)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserOut)
def update_profile(
    data: UserUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return UserService(db).update_profile(current_user, data)


@router.put("/me/password", response_model=UserOut)
def update_password(
    data: PasswordUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return UserService(db).update_password(current_user, data)
