from sqlalchemy.orm import Session

from app.models.ai_log import AILog
from app.repositories.base import BaseRepository


class AILogRepository(BaseRepository[AILog]):
    def __init__(self, db: Session):
        super().__init__(AILog, db)
