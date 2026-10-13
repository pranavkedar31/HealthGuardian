"""
AI Providers Health Check and Doctor/Admin ML Model Performance Endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status

from app.ai.provider_manager import get_ai_provider_manager
from app.ai.risk_predictor import get_risk_predictor
from app.core.deps import get_current_user
from app.models.user import User, UserRole

router = APIRouter(prefix="/ai", tags=["AI Status & ML Performance"])


@router.get("/health")
def ai_health():
    """Health status of configured AI providers (Gemini & Groq) without leaking keys."""
    mgr = get_ai_provider_manager()
    return mgr.check_health()


@router.get("/ml-models")
def ml_model_performance(current_user: User = Depends(get_current_user)):
    """
    Authorized Doctor/Admin endpoint:
    Returns validated model comparison metrics (Accuracy, Precision, Recall, F1, ROC-AUC)
    for Logistic Regression vs Random Forest.
    """
    if current_user.role not in (UserRole.doctor, UserRole.admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only authorized doctors and administrators can view internal ML model performance.",
        )
    predictor = get_risk_predictor()
    return predictor.get_comparison_table()
