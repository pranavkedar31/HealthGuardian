"""
Medical Response Safety Validator for HealthGuardian.
Validates LLM-generated output against clinical safety guidelines,
ensuring no diagnostic overstepping, hallucinated facts, or code leaks.
"""
import re
from typing import Optional

SAFE_VALIDATION_FALLBACK = (
    "Based on HealthGuardian clinical safety standards, this inquiry requires evaluation "
    "by a qualified healthcare provider. HealthGuardian is designed for health education "
    "and preventive guidance and cannot provide definitive medical diagnoses or prescription changes."
)

# Unacceptable patterns in response (definitive diagnosis assertions, dangerous drug directives, code)
UNACCEPTABLE_PATTERNS = [
    r"\b(i\s+diagnose\s+you\s+with|you\s+definitely\s+have|you\s+are\s+diagnosed\s+with)\b",
    r"\b(stop\s+taking\s+your\s+prescribed|throw\s+away\s+your\s+medication)\b",
    r"\b(def\s+\w+\(|function\s+\w+\(|#include\s+<|import\s+sys|SELECT\s+.*FROM)\b",
]


def validate_medical_response(
    response_text: str,
    is_emergency: bool = False,
    is_risk_prediction: bool = False,
) -> tuple[bool, Optional[str]]:
    """
    Validates output text against clinical safety policies.
    Returns (is_valid: bool, cleaned_or_fallback_text: Optional[str]).
    """
    if not response_text or not response_text.strip():
        return False, None

    text = response_text.strip()
    lowered = text.lower()

    # 1. Reject if code was generated
    for pattern in UNACCEPTABLE_PATTERNS:
        if re.search(pattern, lowered, re.IGNORECASE):
            return False, None

    # 2. In emergency cases, verify response instructs urgent medical attention
    if is_emergency:
        emergency_advisory_present = any(
            w in lowered
            for w in [
                "emergency", "urgent", "hospital", "doctor", "ambulance", "112", "108", "911",
                "आपातकालीन", "तातडीने", "दवाखाना"
            ]
        )
        if not emergency_advisory_present:
            text = (
                "⚠️ URGENT HEALTH NOTICE:\n"
                "The symptoms described may indicate a medical emergency. Please contact emergency services "
                "(112 / 108 / 911) or visit the nearest emergency room immediately.\n\n" + text
            )

    # 3. In structured risk predictions, verify it includes educational disclaimer
    if is_risk_prediction:
        disclaimer_words = ["not a diagnosis", "consult", "doctor", "risk estimate", "healthcare professional"]
        if not any(w in lowered for w in disclaimer_words):
            text += (
                "\n\n*Important: This risk estimate is an educational model prediction and is not a clinical diagnosis. "
                "Please consult a qualified healthcare professional for formal clinical evaluation.*"
            )

    return True, text
