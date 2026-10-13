import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class MedicalReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    file_url: str
    original_filename: Optional[str] = None
    ai_summary: Optional[str] = None
    report_type: Optional[str] = None
    created_at: datetime


class ReportAnalysisResult(BaseModel):
    extracted_text: str
    ai_summary: str
