from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.repositories.vitals_repository import VitalsRepository
from app.schemas.vitals import VitalsLogCreate, VitalsLogOut

router = APIRouter(prefix="/vitals", tags=["Vitals"])

@router.get("", response_model=list[VitalsLogOut])
def list_vitals(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return VitalsRepository(db).list_by_user(current_user.id)

@router.post("", response_model=VitalsLogOut, status_code=201)
def create_vital(data: VitalsLogCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    payload = data.model_dump(exclude_none=True)
    payload["user_id"] = current_user.id
    return VitalsRepository(db).create(payload)
