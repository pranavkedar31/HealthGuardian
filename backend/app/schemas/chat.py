import uuid
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

class ChatRequest(BaseModel):
    message:str
    language:Literal["English","Hindi","Marathi"]="English"

class ChatResource(BaseModel):
    title:str
    description:str
    url:str
    type:Literal["video","image"]="video"
    searchQuery:Optional[str]=None

class ChatResponse(BaseModel):
    reply:str
    response:str
    language:Literal["English","Hindi","Marathi"]="English"
    safety_level:str="low"
    emergency:bool=False
    intent:str="GENERAL_HEALTH"
    provider:str="gemini"
    model:str=""
    user_message_id:Optional[str]=None
    ai_message_id:Optional[str]=None
    resources:list[ChatResource]=Field(default_factory=list)

class ChatMessageOut(BaseModel):
    model_config=ConfigDict(from_attributes=True)
    id:uuid.UUID; user_id:uuid.UUID; message:str; is_from_user:bool; created_at:datetime
