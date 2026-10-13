"""
Tests for medical report upload, history, and PDF summary generation.
"""
import io


class TestReportUpload:
    def test_upload_text_document(self, client, auth_headers):
        file_content = b"This is a sample medical report document."
        files = {"file": ("report.txt", io.BytesIO(file_content), "text/plain")}
        response = client.post("/api/v1/reports/upload", files=files, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["original_filename"] == "report.txt"
        assert data["report_type"] == "document"
        assert "file_url" in data

    def test_upload_pdf_document_extracts_text(self, client, auth_headers):
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
        buf = io.BytesIO()
        c = canvas.Canvas(buf, pagesize=letter)
        c.drawString(100, 750, "Complete Blood Count: Hemoglobin 13.0 g/dL, WBC 7000")
        c.save()
        pdf_bytes = buf.getvalue()

        files = {"file": ("blood_test.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
        response = client.post("/api/v1/reports/upload", files=files, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["original_filename"] == "blood_test.pdf"
        assert data["report_type"] == "document"
        assert data["ai_summary"] is not None
        assert data["ai_summary"] != "No text extracted for analysis."
        assert len(data["ai_summary"]) > 20

    def test_upload_requires_auth(self, client):
        files = {"file": ("report.txt", io.BytesIO(b"content"), "text/plain")}
        response = client.post("/api/v1/reports/upload", files=files)
        assert response.status_code == 401

    def test_upload_image_triggers_ocr_path(self, client, auth_headers):
        # Minimal 1x1 PNG bytes
        png_bytes = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
            b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0"
            b"\x00\x00\x03\x01\x01\x00\x18\xdd\x8d\xb0\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        files = {"file": ("scan.png", io.BytesIO(png_bytes), "image/png")}
        response = client.post("/api/v1/reports/upload", files=files, headers=auth_headers)
        assert response.status_code == 201
        assert response.json()["report_type"] == "image"


class TestReportHistory:
    def test_history_empty_initially(self, client, auth_headers):
        response = client.get("/api/v1/reports/history", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_history_after_upload(self, client, auth_headers):
        files = {"file": ("doc.txt", io.BytesIO(b"content"), "text/plain")}
        client.post("/api/v1/reports/upload", files=files, headers=auth_headers)

        response = client.get("/api/v1/reports/history", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()) == 1

    def test_history_requires_auth(self, client):
        response = client.get("/api/v1/reports/history")
        assert response.status_code == 401


class TestReportPDFGeneration:
    def test_generate_pdf_for_existing_report(self, client, auth_headers):
        files = {"file": ("doc.txt", io.BytesIO(b"Blood pressure: 120/80"), "text/plain")}
        upload_response = client.post("/api/v1/reports/upload", files=files, headers=auth_headers)
        report_id = upload_response.json()["id"]

        pdf_response = client.get(f"/api/v1/reports/{report_id}/pdf", headers=auth_headers)
        assert pdf_response.status_code == 200
        assert pdf_response.headers["content-type"] == "application/pdf"
        assert pdf_response.content[:4] == b"%PDF"

    def test_pdf_for_nonexistent_report_404(self, client, auth_headers):
        import uuid

        fake_id = uuid.uuid4()
        response = client.get(f"/api/v1/reports/{fake_id}/pdf", headers=auth_headers)
        assert response.status_code == 404

    def test_pdf_requires_auth(self, client):
        import uuid

        response = client.get(f"/api/v1/reports/{uuid.uuid4()}/pdf")
        assert response.status_code == 401
