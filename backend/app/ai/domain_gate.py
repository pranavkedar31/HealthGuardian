"""
Health Domain Gate, Prompt Injection Shield, and Emergency Detection for HealthGuardian.
Strictly ensures only health-related interactions reach AI pipelines.
"""
import enum
import re
from typing import Optional


class HealthCategory(str, enum.Enum):
    GENERAL_HEALTH = "GENERAL_HEALTH"
    SYMPTOM = "SYMPTOM"
    DISEASE = "DISEASE"
    MEDICATION = "MEDICATION"
    NUTRITION = "NUTRITION"
    FITNESS = "FITNESS"
    MENTAL_WELLNESS = "MENTAL_WELLNESS"
    PREVENTION = "PREVENTION"
    FIRST_AID = "FIRST_AID"
    MEDICAL_REPORT = "MEDICAL_REPORT"
    LAB_REPORT = "LAB_REPORT"
    HEALTH_RISK = "HEALTH_RISK"
    HEALTHCARE_TECHNOLOGY = "HEALTHCARE_TECHNOLOGY"
    EMERGENCY = "EMERGENCY"
    NON_HEALTH = "NON_HEALTH"


DOMAIN_REJECTION_MESSAGE_EN = (
    "Sorry, I’m HealthGuardian, a healthcare-focused AI assistant. "
    "I can only help with health, wellness, nutrition, fitness, symptoms, "
    "medical information, preventive care, and healthcare-related questions."
)

DOMAIN_REJECTION_MESSAGE_HI = (
    "क्षमा करें, मैं HealthGuardian हूँ, एक स्वास्थ्य-केंद्रित AI सहायक। "
    "मैं केवल स्वास्थ्य, पोषण, फिटनेस, लक्षण, चिकित्सा जानकारी, निवारक देखभाल और स्वास्थ्य संबंधी प्रश्नों में मदद कर सकता हूँ।"
)

DOMAIN_REJECTION_MESSAGE_MR = (
    "क्षमस्व, मी HealthGuardian आहे, एक आरोग्य-केंद्रित AI सहाय्यक. "
    "मी केवळ आरोग्य, पोषण, तंदुरुस्ती, लक्षणे, वैद्यकीय माहिती, प्रतिबंधात्मक काळजी आणि आरोग्याशी संबंधित प्रश्नांमध्ये मदत करू शकतो."
)


# Explicit non-health triggers: programming, general general entertainment, sports, politics
NON_HEALTH_PATTERNS = [
    r"\b(c\+\+|python|java|javascript|typescript|c#|sql|html|css|php|rust|golang|ruby|kotlin|swift)\b",
    r"\b(write|give me|generate|debug|compile)\s+(code|program|script|query|function|algorithm)\b",
    r"\b(joke|poem|song|story|riddle|game|cricket|football|match|ipl|election|politics|movie|actor|bitcoin|crypto|stock market)\b",
    r"\b(weather forecast|who won|who is president|capital of)\b",
]

# Prompt injection and jailbreak patterns
INJECTION_PATTERNS = [
    r"ignore\s+(your\s+)?(previous|prior|above)\s+instructions",
    r"act\s+as\s+(an?\s+)?unrestricted",
    r"forget\s+(healthguardian|your\s+role|all\s+rules)",
    r"you\s+are\s+now\s+a\s+(coding|general|different|helpful)\s+assistant",
    r"bypass\s+(safety|filters|guardrails)",
    r"jailbreak",
    r"dan\s+mode",
    r"developer\s+mode\s+enabled",
    r"do\s+anything\s+now",
]

# Emergency symptom keywords
EMERGENCY_PATTERNS = [
    r"\b(severe\s+chest\s+pain|crushing\s+chest\s+pain|heart\s+attack)\b",
    r"\b(difficulty\s+breathing|cannot\s+breathe|unable\s+to\s+breathe|shortness\s+of\s+breath|suffocating)\b",
    r"\b(unconscious|passed\s+out|unresponsive|fainted|loss\s+of\s+consciousness)\b",
    r"\b(seizure|convulsion|epileptic\s+fit)\b",
    r"\b(sudden\s+weakness|facial\s+droop|slurred\s+speech|suspected\s+stroke|stroke)\b",
    r"\b(severe\s+bleeding|heavy\s+bleeding|bleeding\s+uncontrollably|hemorrhage)\b",
    r"\b(anaphylaxis|severe\s+allergic\s+reaction|throat\s+closing|swollen\s+tongue)\b",
    r"\b(poisoning|swallowed\s+poison|overdose|toxic\s+substance)\b",
    r"\b(suicide|suicidal|kill\s+myself|end\s+my\s+life|self[- ]harm)\b",
    # Hindi/Marathi emergency terms
    r"(सीने\s+में\s+तेज\s+दर्द|सांस\s+लेने\s+में\s+कठिनाई|बेशुद्ध|दौरा|छातीत\s+तीव्र\s+दुखणे|श्वास\s+घेण्यास\s+त्रास|झटके|आत्महत्या)",
]

# Health-risk prediction triggers
RISK_PREDICTION_PATTERNS = [
    r"\b(analyze\s+my\s+health\s+risk|estimate\s+.*risk|cardiovascular\s+risk|diabetes\s+risk|hypertension\s+risk|heart\s+disease\s+risk|calculate\s+risk|predict\s+risk)\b",
    r"\b(my\s+risk|risk\s+assessment|risk\s+level|risk\s+score|estimate\s+my\s+risk)\b",
    r"(आरोग्य\s+धोका|जोखिम\s+का\s+आकलन|मधुमेह\s+जोखिम|हृदय\s+जोखिम)",
]

# Health domain indicator keywords
HEALTH_INDICATORS = [
    "health", "symptom", "pain", "fever", "cough", "headache", "cold", "flu",
    "doctor", "hospital", "clinic", "medicine", "medication", "drug", "tablet", "dose",
    "disease", "diabetes", "blood pressure", "hypertension", "heart", "cardio", "sugar",
    "diet", "nutrition", "food", "calorie", "vitamin", "iron", "protein", "cholesterol",
    "exercise", "workout", "fitness", "yoga", "walk", "stretch", "running",
    "sleep", "insomnia", "stress", "anxiety", "depression", "mental", "wellness",
    "hba1c", "glucose", "bp", "bmi", "spo2", "pulse", "oxygen", "vital", "report", "lab",
    "first aid", "bandage", "burn", "wound", "cut", "infection", "vaccine", "allergy",
    "rash", "nausea", "vomit", "stomach", "liver", "kidney", "lungs", "bone",
    "pregnancy", "pediatric", "elderly", "prevention", "screening",
    # Hindi/Marathi terms
    "स्वास्थ्य", "आरोग्य", "डॉक्टर", "दवा", "औषध", "बीमारी", "आजारी", "रोग", "लक्षण",
    "रक्तचाप", "रक्तदाब", "मधुमेह", "हृदय", "आहार", "पोषण", "व्यायाम", "झोप", "तनाव", "शांत"
]


def check_prompt_injection(message: str) -> bool:
    """Returns True if message contains prompt injection or jailbreak attempts."""
    lowered = message.lower()
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, lowered, re.IGNORECASE):
            return True
    return False


def detect_emergency(message: str) -> tuple[bool, Optional[str]]:
    """Detects life-threatening emergencies."""
    lowered = message.lower()
    for pattern in EMERGENCY_PATTERNS:
        if re.search(pattern, lowered, re.IGNORECASE):
            return True, "EMERGENCY_DETECTED"
    return False, None


def classify_domain(
    message: str, language: str = "English"
) -> tuple[HealthCategory, Optional[str]]:
    """
    Classifies user message into a HealthCategory.
    Returns (Category, RejectionMessageIfNonHealth).
    """
    clean_msg = message.strip()
    if not clean_msg:
        return HealthCategory.GENERAL_HEALTH, None

    # 1. Prompt Injection Shield
    if check_prompt_injection(clean_msg):
        msg = (
            DOMAIN_REJECTION_MESSAGE_HI
            if language == "Hindi"
            else DOMAIN_REJECTION_MESSAGE_MR
            if language == "Marathi"
            else DOMAIN_REJECTION_MESSAGE_EN
        )
        return HealthCategory.NON_HEALTH, msg

    # 2. Explicit Non-Health Check (C++, programming, entertainment, etc.)
    lowered = clean_msg.lower()
    for pattern in NON_HEALTH_PATTERNS:
        if re.search(pattern, lowered, re.IGNORECASE):
            # Check if this isn't legitimately medical
            has_health_context = any(w in lowered for w in ["heart", "diabetes", "blood", "medical", "patient"])
            if not has_health_context:
                msg = (
                    DOMAIN_REJECTION_MESSAGE_HI
                    if language == "Hindi"
                    else DOMAIN_REJECTION_MESSAGE_MR
                    if language == "Marathi"
                    else DOMAIN_REJECTION_MESSAGE_EN
                )
                return HealthCategory.NON_HEALTH, msg

    # 3. Emergency detection
    is_emergency, _ = detect_emergency(clean_msg)
    if is_emergency:
        return HealthCategory.EMERGENCY, None

    # 4. Structured Risk Prediction Detection
    for pattern in RISK_PREDICTION_PATTERNS:
        if re.search(pattern, lowered, re.IGNORECASE):
            return HealthCategory.HEALTH_RISK, None

    # 5. Specialized Health Categories
    if any(k in lowered for k in ["tablet", "medicine", "pill", "syrup", "dosage", "side effect", "amoxicillin", "paracetamol", "ibuprofen", "metformin", "aspirin", "दवा", "औषध"]):
        return HealthCategory.MEDICATION, None
    if any(k in lowered for k in ["diet", "food", "nutrition", "eat", "meal", "calorie", "protein", "carbs", "iron", "पोषण", "आहार", "भोजन"]):
        return HealthCategory.NUTRITION, None
    if any(k in lowered for k in ["workout", "exercise", "walk", "gym", "stretch", "cardio", "व्यायाम", "योग"]):
        return HealthCategory.FITNESS, None
    if any(k in lowered for k in ["mental", "stress", "anxiety", "depression", "meditation", "sleep", "insomnia", "तनाव", "ध्यान", "झोप"]):
        return HealthCategory.MENTAL_WELLNESS, None
    if any(k in lowered for k in ["report", "lab", "test result", "blood test", "cbc", "lipid", "mri", "x-ray", "रिपोर्ट"]):
        return HealthCategory.LAB_REPORT, None
    if any(k in lowered for k in ["symptom", "pain", "fever", "cough", "ache", "swelling", "vomit", "लक्षण", "वेदना", "ताप"]):
        return HealthCategory.SYMPTOM, None
    if any(k in lowered for k in ["diabetes", "hypertension", "asthma", "cancer", "arthritis", "anemia", "मधुमेह", "रक्तदाब"]):
        return HealthCategory.DISEASE, None

    # 6. Check generic health indicators
    if any(k in lowered for k in HEALTH_INDICATORS):
        return HealthCategory.GENERAL_HEALTH, None

    # 7. Check if greeting or short conversational courtesy
    courtesies = ["hi", "hello", "hey", "namaste", "good morning", "good evening", "how are you", "help", "नमस्ते", "नमस्कार", "मदत"]
    if clean_msg.lower().strip("!?. ") in courtesies:
        return HealthCategory.GENERAL_HEALTH, None

    # If it has no health indicator and looks like unrelated query
    # E.g. "Who wrote Hamlet?", "Who won the cricket match?", "Solve 2+2"
    words = clean_msg.split()
    if len(words) > 2 and not any(k in lowered for k in HEALTH_INDICATORS):
        msg = (
            DOMAIN_REJECTION_MESSAGE_HI
            if language == "Hindi"
            else DOMAIN_REJECTION_MESSAGE_MR
            if language == "Marathi"
            else DOMAIN_REJECTION_MESSAGE_EN
        )
        return HealthCategory.NON_HEALTH, msg

    return HealthCategory.GENERAL_HEALTH, None
