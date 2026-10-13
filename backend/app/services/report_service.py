import io
import logging
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.ocr_engine import extract_text_from_image, extract_text_from_pdf
from app.ai.report_analyzer import analyze_report_text
from app.models.appointment import Appointment
from app.models.medical_report import MedicalReport
from app.models.user import User
from app.repositories.report_repository import ReportRepository
from app.utils.cloud_storage import upload_file

logger = logging.getLogger("healthguardian.reports")


class ReportService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ReportRepository(db)

    def upload_and_analyze(
        self,
        user: User,
        file_bytes: bytes,
        filename: str,
        content_type: str | None,
        language: str = "English",
    ) -> MedicalReport:
        # Save file (Cloudinary if configured, otherwise local storage)
        file_url = upload_file(file_bytes, filename)

        extracted_text = ""
        fn_lower = (filename or "").lower()
        ct_lower = (content_type or "").lower()

        # 1. Digital PDF extraction via pypdf
        if fn_lower.endswith(".pdf") or "pdf" in ct_lower:
            extracted_text = extract_text_from_pdf(file_bytes)
            report_type = "document"

        # 2. Medical image extraction via OCR / Gemini Vision
        elif ct_lower.startswith("image/") or fn_lower.endswith((".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff")):
            extracted_text = extract_text_from_image(file_bytes)
            report_type = "image"

        # 3. Plain text / CSV extraction
        elif ct_lower.startswith("text/") or fn_lower.endswith((".txt", ".csv")):
            try:
                extracted_text = file_bytes.decode("utf-8", errors="ignore").strip()
            except Exception:
                extracted_text = ""
            report_type = "document"

        # 4. Fallback: try PDF first, then image
        else:
            extracted_text = extract_text_from_pdf(file_bytes)
            if not extracted_text:
                extracted_text = extract_text_from_image(file_bytes)
            report_type = "document"

        if extracted_text and extracted_text.strip():
            ai_summary = analyze_report_text(extracted_text.strip(), language=language)
        else:
            ai_summary = (
                "No readable text was found in this report file. "
                "If this is a photo or scan, please ensure good lighting and clear focus."
            )

        return self.repo.create(
            {
                "user_id": user.id,
                "file_url": file_url,
                "original_filename": filename,
                "extracted_text": extracted_text,
                "ai_summary": ai_summary,
                "report_type": report_type,
            }
        )

    def reanalyze_report(
        self,
        user: User,
        report_id: uuid.UUID,
        language: str = "English",
    ) -> MedicalReport | None:
        report = self.repo.get(report_id)
        if not report or report.user_id != user.id:
            return None

        # If extracted text already exists, re-run analyzer with current language
        if report.extracted_text and report.extracted_text.strip():
            report.ai_summary = analyze_report_text(report.extracted_text, language=language)
            self.db.commit()
            self.db.refresh(report)
            return report

        return report

    def history(
        self,
        user: User,
        skip: int = 0,
        limit: int = 100,
    ) -> list[MedicalReport]:
        return self.repo.list_by_user(user.id, skip, limit)

    def patient_reports_for_doctor(
        self,
        doctor_id,
        patient_id,
        skip: int = 0,
        limit: int = 50,
    ):
        assignment = self.db.execute(
            select(Appointment)
            .where(
                Appointment.doctor_id == doctor_id,
                Appointment.patient_id == patient_id,
            )
            .limit(1)
        ).scalar_one_or_none()

        if not assignment:
            return None

        return self.repo.list_by_patient(
            patient_id,
            skip,
            limit,
        )

    def generate_summary_pdf(
        self,
        user: User,
        report_id: uuid.UUID,
    ) -> bytes | None:
        """Render a report's AI summary as a downloadable PDF using reportlab."""
        report = self.repo.get(report_id)
        if not report or report.user_id != user.id:
            return None

        from reportlab.lib import colors
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=54,
            leftMargin=54,
            topMargin=54,
            bottomMargin=54,
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Heading1"],
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#0f766e"),
            spaceAfter=12,
        )
        meta_style = ParagraphStyle(
            "DocMeta",
            parent=styles["Normal"],
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#64748b"),
            spaceAfter=14,
        )
        heading_style = ParagraphStyle(
            "SectionHeading",
            parent=styles["Heading2"],
            fontSize=13,
            leading=17,
            textColor=colors.HexColor("#0f172a"),
            spaceBefore=12,
            spaceAfter=6,
        )
        body_style = ParagraphStyle(
            "Body",
            parent=styles["Normal"],
            fontSize=9.5,
            leading=14.5,
            textColor=colors.HexColor("#334155"),
            spaceAfter=6,
        )

        elements = [
            Paragraph("HealthGuardian &mdash; Medical Report Summary", title_style),
            Paragraph(
                f"File: <b>{report.original_filename}</b> &nbsp;|&nbsp; "
                f"Generated: {report.created_at.strftime('%d %B %Y at %I:%M %p')}",
                meta_style,
            ),
            Spacer(1, 10),
        ]

        summary_text = report.ai_summary or "No summary available."
        for line in summary_text.split("\n"):
            line = line.strip()
            if not line:
                continue
            if line.startswith("## "):
                elements.append(Paragraph(line[3:], heading_style))
            elif line.startswith("# "):
                elements.append(Paragraph(line[2:], heading_style))
            elif line.startswith("- "):
                clean_bullet = line[2:].replace("**", "<b>", 1).replace("**", "</b>", 1)
                elements.append(Paragraph(f"&bull;&nbsp;&nbsp;{clean_bullet}", body_style))
            else:
                clean_text = line.replace("**", "<b>", 1).replace("**", "</b>", 1)
                elements.append(Paragraph(clean_text, body_style))

        elements.append(Spacer(1, 20))
        disclaimer_style = ParagraphStyle(
            "Disclaimer",
            parent=styles["Italic"],
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#94a3b8"),
        )
        elements.append(
            Paragraph(
                "HealthGuardian AI reports are for informational and educational purposes only. "
                "They do not constitute medical diagnosis, clinical judgment, or treatment advice. "
                "Always consult a licensed medical professional for personal healthcare decisions.",
                disclaimer_style,
            )
        )

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()
