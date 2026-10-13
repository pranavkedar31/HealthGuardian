"""
Analyzes extracted medical report text and produces a structured,
patient-friendly clinical summary in the user's selected language.

Uses HealthGuardian's AI Provider Pipeline (Gemini / Groq) with
graceful fallback if offline.
"""
from app.ai.chatbot import get_chat_reply
from app.core.config import settings


def analyze_report_text(extracted_text: str, language: str = "English") -> str:
    if not extracted_text or not extracted_text.strip():
        return "No readable text was found in this report."

    has_ai = bool(
        getattr(settings, "GEMINI_API_KEY", None)
        or getattr(settings, "GROQ_API_KEY", None)
        or getattr(settings, "OPENAI_API_KEY", None)
    )

    if not has_ai:
        snippet = extracted_text.strip()[:1000]
        return (
            "## Report Overview\n"
            "The report was uploaded successfully, but AI analysis is currently "
            "running in offline mode.\n\n"
            "## Extracted Information\n"
            f"{snippet}\n\n"
            "## Important Note\n"
            "Please have the original report reviewed by a qualified healthcare "
            "professional."
        )

    prompt = f"""
You are HealthGuardian's medical report explanation assistant.

Analyze the medical report text below and return a clear, structured,
patient-friendly explanation in {language}.

IMPORTANT CLINICAL SAFETY BOUNDARIES:
- Do not diagnose the patient.
- Do not invent values, conditions, medicines, or findings that are not present.
- Preserve medical terms from the report where appropriate, explaining them simply.
- If a value or reference range is present, mention it accurately.
- If a value is not provided, do not create one.
- Do not change medication names.
- Do not recommend starting, stopping, or changing medication.
- Mention that medication decisions must be confirmed with the treating doctor.

Use EXACTLY these sections with clear headings:

## Report Overview
Give 1–3 short sentences describing what the report appears to contain.

## Main Findings
Use bullet points for the important findings and lab results with units and ranges if present.

## What These Findings Mean
Use short bullet points explaining each important finding in simple language.

## Medicines Mentioned
Use bullet points in this format:
- **Medicine name** — what the report indicates it is for, if this can be determined from the report.
Do not invent a purpose if it is unclear.

## Follow-up
Give a short bullet list of reasonable questions or follow-up points the patient can discuss with their doctor.
Do not provide a diagnosis or treatment plan.

## Safety Note
State that this is an AI-generated explanation and does not replace professional medical advice.

Medical report text:

{extracted_text[:7000]}
"""

    try:
        reply = get_chat_reply(prompt, language=language)
        if reply and reply.strip():
            return reply.strip()
    except Exception:
        pass

    return (
        "## Report Overview\n"
        "The report was uploaded successfully, but the AI summary "
        "could not be generated at this time.\n\n"
        "## Extracted Information\n"
        f"{extracted_text[:2000]}\n\n"
        "## Safety Note\n"
        "Please have the original report reviewed by a qualified "
        "healthcare professional."
    )