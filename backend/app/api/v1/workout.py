from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.workout import WorkoutPlanOut, WorkoutPlanRequest
from app.services.workout_service import WorkoutService

router = APIRouter(prefix="/workout", tags=["Workout Plans"])


@router.post("/generate", response_model=WorkoutPlanOut)
def generate_workout(
    data: WorkoutPlanRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return WorkoutService(db).generate(current_user, data)


@router.get("/history", response_model=list[WorkoutPlanOut])
def workout_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return WorkoutService(db).history(current_user)
