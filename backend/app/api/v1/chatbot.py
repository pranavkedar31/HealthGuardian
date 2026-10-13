from fastapi import APIRouter,Depends
from sqlalchemy.orm import Session
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.chat import ChatMessageOut,ChatRequest,ChatResponse
from app.services.chatbot_service import ChatbotService
router=APIRouter(prefix="/chatbot",tags=["Chatbot"])
@router.post("/message",response_model=ChatResponse)
def send_message(data:ChatRequest,current_user:User=Depends(get_current_user),db:Session=Depends(get_db)):
    return ChatbotService(db).send_message(current_user,data.message,data.language)
@router.get("/history",response_model=list[ChatMessageOut])
def chat_history(current_user:User=Depends(get_current_user),db:Session=Depends(get_db)):
    return ChatbotService(db).history(current_user)
