"""
OCR & Document Extraction Engine for medical reports (PDF and images).
Supports pypdf for digital lab reports, Pillow + Tesseract for OCR,
and Gemini Vision multimodal fallback.
"""
import io
import logging
from typing import Optional

from PIL import Image, ImageEnhance, ImageFilter
import pytesseract

from app.core.config import settings

logger = logging.getLogger("healthguardian.ai.ocr")

# Optional Windows Tesseract installation path
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """
    Extracts text from a PDF document using pypdf.
    Iterates over pages, extracting embedded text streams.
    If digital text is found, returns the concatenated text.
    """
    if not pdf_bytes:
        return ""

    try:
        import pypdf

        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        pages_text = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if text and text.strip():
                pages_text.append(text.strip())

        extracted = "\n\n".join(pages_text).strip()
        if extracted:
            logger.info("Successfully extracted %d characters from PDF using pypdf", len(extracted))
            return extracted

        # If digital text was empty, try embedded images in the PDF pages
        for page in reader.pages:
            for img in getattr(page, "images", []):
                img_text = extract_text_from_image(img.data)
                if img_text and not img_text.startswith("[OCR unavailable"):
                    pages_text.append(img_text)

        return "\n\n".join(pages_text).strip()
    except Exception as exc:
        logger.warning("pypdf extraction error: %s", exc)
        return ""


def extract_text_from_image(image_bytes: bytes) -> str:
    """
    Extracts text from medical report images.
    1. Tries Tesseract OCR if installed and available.
    2. Falls back to Gemini Vision API if configured.
    """
    if not image_bytes:
        return ""

    # 1. Try local Tesseract OCR
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("L")
        image = ImageEnhance.Contrast(image).enhance(2.0)
        image = image.filter(ImageFilter.SHARPEN)
        text = pytesseract.image_to_string(image, config="--psm 6")
        if text and text.strip():
            logger.info("Tesseract extracted %d characters from image", len(text.strip()))
            return text.strip()
    except Exception as exc:
        logger.debug("Local Tesseract OCR bypassed: %s", exc)

    # 2. Multimodal Fallback using Gemini Vision
    try:
        if settings.GEMINI_API_KEY:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            resp = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                    "Extract and transcribe all readable clinical, laboratory, test results, and patient text verbatim from this medical report image. Output only the extracted text without introductory commentary.",
                ],
            )
            if resp.text and resp.text.strip():
                logger.info("Gemini Vision extracted %d characters from image", len(resp.text.strip()))
                return resp.text.strip()
    except Exception as exc:
        logger.warning("Gemini Vision image extraction failed: %s", exc)

    return ""