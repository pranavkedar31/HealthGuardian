import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.report import MedicalReportOut
from app.services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["Medical Reports"])


@router.post("/upload", response_model=MedicalReportOut, status_code=201)
async def upload_report(
    file: UploadFile = File(...),
    language: Optional[str] = Form("English"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    file_bytes = await file.read()
    return ReportService(db).upload_and_analyze(
        current_user,
        file_bytes,
        file.filename or "medical_report.pdf",
        file.content_type,
        language=language or "English",
    )


@router.get("/history", response_model=list[MedicalReportOut])
def report_history(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ReportService(db).history(current_user, skip=skip, limit=limit)


@router.post("/{report_id}/reanalyze", response_model=MedicalReportOut)
def reanalyze_report(
    report_id: uuid.UUID,
    language: str = Query("English"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    updated = ReportService(db).reanalyze_report(current_user, report_id, language=language)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return updated


@router.get("/{report_id}/pdf")
def download_report_pdf(
    report_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    pdf_bytes = ReportService(db).generate_summary_pdf(current_user, report_id)
    if pdf_bytes is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=report_{report_id}.pdf"},
    )
