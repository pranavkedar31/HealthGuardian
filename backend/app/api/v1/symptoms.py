from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.symptom import SymptomCheckRequest, SymptomCheckResult, SymptomLogOut
from app.services.symptom_service import SymptomService

router = APIRouter(prefix="/symptoms", tags=["Symptom Checker"])


@router.post("/check", response_model=SymptomCheckResult)
def check_symptoms(
    data: SymptomCheckRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return SymptomService(db).check_symptoms(current_user, data)


@router.get("/history", response_model=list[SymptomLogOut])
def symptom_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return SymptomService(db).history(current_user)
