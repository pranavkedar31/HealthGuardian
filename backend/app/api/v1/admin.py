import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import require_admin
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserOut
from app.services.admin_service import AdminService

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/users", response_model=list[UserOut])
def list_users(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return AdminService(db).list_users()


@router.get("/doctors", response_model=list[UserOut])
def list_doctors(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return AdminService(db).list_doctors()


@router.put("/users/{user_id}/activate", response_model=UserOut)
def activate_user(
    user_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = AdminService(db).activate_user(user_id)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    return user


@router.put("/users/{user_id}/deactivate", response_model=UserOut)
def deactivate_user(
    user_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = AdminService(db).deactivate_user(user_id)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    return user


@router.get("/statistics")
def get_statistics(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return AdminService(db).get_statistics()
