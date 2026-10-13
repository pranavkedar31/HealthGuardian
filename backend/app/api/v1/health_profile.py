from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.health_profile import HealthProfileCreate, HealthProfileOut, HealthProfileUpdate
from app.services.health_profile_service import HealthProfileService

router = APIRouter(prefix="/health-profile", tags=["Health Profile"])


@router.post("", response_model=HealthProfileOut, status_code=201)
def create_profile(
    data: HealthProfileCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return HealthProfileService(db).create(current_user, data)


@router.get("", response_model=HealthProfileOut | None)
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return HealthProfileService(db).get_or_none(current_user)


@router.put("", response_model=HealthProfileOut)
def update_profile(
    data: HealthProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return HealthProfileService(db).update(current_user, data)
