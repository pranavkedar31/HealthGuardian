from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.diet import DietPlanOut, DietPlanRequest
from app.services.diet_service import DietService

router = APIRouter(prefix="/diet", tags=["Diet Plans"])


@router.post("/generate", response_model=DietPlanOut)
def generate_diet(
    data: DietPlanRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return DietService(db).generate(current_user, data)


@router.get("/history", response_model=list[DietPlanOut])
def diet_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return DietService(db).history(current_user)
