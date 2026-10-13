import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.chat_message import ChatMessage
from app.repositories.base import BaseRepository


class ChatRepository(BaseRepository[ChatMessage]):
    def __init__(self, db: Session):
        super().__init__(ChatMessage, db)

    def list_by_user(self, user_id: uuid.UUID, limit: int = 50) -> list[ChatMessage]:
        stmt = (
            select(ChatMessage)
            .where(ChatMessage.user_id == user_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(limit)
        )
        messages = list(self.db.execute(stmt).scalars().all())
        return list(reversed(messages))
