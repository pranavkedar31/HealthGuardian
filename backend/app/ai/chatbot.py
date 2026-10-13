"""
HealthGuardian Multi-Layer AI Pipeline & Chatbot Engine.
Integrates Health Domain Gate, Emergency Detection, Medical RAG,
Dual-Model ML Risk Predictor, AI Provider Manager (Gemini + Groq),
and Clinical Safety Validation.
"""
import logging
import re
from typing import Any, Optional
from urllib.parse import quote_plus

from app.core.config import settings
from app.ai.domain_gate import (
    HealthCategory,
    classify_domain,
    detect_emergency,
)
from app.ai.medical_rag import retrieve_medical_context
from app.ai.provider_manager import get_ai_provider_manager
from app.ai.response_validator import validate_medical_response
from app.ai.risk_predictor import get_risk_predictor

logger = logging.getLogger("healthguardian.ai.chatbot")

HEALTHCARE_SYSTEM_PROMPT = (
    "You are HealthGuardian AI, a healthcare-focused AI assistant and preventive healthcare companion. "
    "Your role is to provide general health information, explain medical concepts, support preventive healthcare, "
    "explain health reports, provide general wellness guidance, and help users understand health-related information. "
    "You are NOT a replacement for a doctor. You must not claim to diagnose a patient. "
    "You must not fabricate medical information. "
    "You must not provide unrelated programming, entertainment, general-purpose, or non-health answers. "
    "For medicines, explain the active ingredient, common uses, common precautions, common side effects, "
    "and what the patient should verify with a doctor or pharmacist. Never tell a patient to start, stop, "
    "or change a prescription medicine based only on chat. "
    "If symptoms may be an emergency, clearly prioritize urgent professional medical care. "
    "You must clearly communicate uncertainty. You must not override structured ML predictions. "
    "Keep answers practical and structured with short headings and bullets. "
    "Do not use markdown tables or decorative formatting."
)

LANGUAGE_INSTRUCTIONS = {
    "English": "Respond in clear, simple English.",
    "Hindi": "हिंदी में उत्तर दें। कठिन चिकित्सा शब्दों को सरल हिंदी में समझाएं।",
    "Marathi": "मराठीत उत्तर द्या. कठीण वैद्यकीय शब्द सोप्या मराठीत समजावून सांगा.",
}


def _search_url(base: str, query: str) -> str:
    return f"{base}{quote_plus(query)}"


def _medicine_term(message: str) -> str:
    common = [
        "paracetamol", "acetaminophen", "ibuprofen", "cetirizine", "amoxicillin",
        "azithromycin", "omeprazole", "metformin", "aspirin", "antacid",
        "पॅरासिटामॉल", "इबुप्रोफेन", "सेटिरीझिन", "अॅमॉक्सिसिलिन", "मेटफॉर्मिन",
        "पैरासिटामोल", "इबुप्रोफेन", "सेटिरीजिन", "एमॉक्सिसिलिन", "मेटफॉर्मिन",
    ]
    low = message.lower()
    for name in common:
        if name.lower() in low:
            return name
    m = re.search(r"(?:medicine|medication|tablet|drug|दवा|गोली|औषध)\s+(?:for|का|की|साठी)?\s*([A-Za-z][A-Za-z0-9 -]{2,40})", message, re.I)
    return m.group(1).strip() if m else message[:50].strip()


def resource_pack(message: str, language: str = "English") -> list[dict]:
    text = message.lower()
    resources = []

    if any(k in text for k in [
        "medicine", "tablet", "drug", "medication", "दवा", "गोली", "औषध",
        "paracetamol", "ibuprofen", "cetirizine", "vitamin", "पॅरासिटामॉल", "पैरासिटामोल",
    ]):
        term = _medicine_term(message)
        resources.append({
            "title": {"English": "Medicine image reference", "Hindi": "दवा की तस्वीर", "Marathi": "औषधाचे चित्र"}.get(language, "Medicine image reference"),
            "description": {
                "English": "Visual reference only. Match the package and active ingredient with a pharmacist before taking it.",
                "Hindi": "यह केवल पहचान में मदद के लिए है। दवा लेने से पहले पैकेट और active ingredient को pharmacist से सत्यापित करें।",
                "Marathi": "हे फक्त ओळखण्यासाठी आहे. औषध घेण्यापूर्वी पॅकेट आणि active ingredient फार्मासिस्टकडून तपासा.",
            }.get(language, "Visual reference only."),
            "url": _search_url("https://commons.wikimedia.org/w/index.php?search=", term + " medicine"),
            "type": "image",
            "searchQuery": term + " medicine",
        })
        video_q = f"{term} medicine information {language.lower()}"
        resources.append({
            "title": {"English": "Medicine information video", "Hindi": "दवा की जानकारी वाला वीडियो", "Marathi": "औषधाची माहिती देणारा व्हिडिओ"}.get(language, "Medicine information video"),
            "description": {
                "English": "Educational video resources in your selected language.",
                "Hindi": "आपकी चुनी हुई भाषा में शैक्षणिक वीडियो संसाधन।",
                "Marathi": "तुमच्या निवडलेल्या भाषेतील शैक्षणिक वीडियो.",
            }.get(language, "Educational video resources."),
            "url": _search_url("https://www.youtube.com/results?search_query=", video_q),
            "type": "video",
        })

    if any(k in text for k in ["meditation", "breathing", "stress", "ध्यान", "तनाव", "श्वास", "मन शांत"]):
        q = {"English": "guided meditation breathing", "Hindi": "हिंदी guided meditation breathing", "Marathi": "मराठी guided meditation breathing"}.get(language, "guided meditation breathing")
        resources.append({
            "title": {"English": "Guided meditation video", "Hindi": "निर्देशित ध्यान वीडियो", "Marathi": "मार्गदर्शित ध्यान व्हिडिओ"}.get(language, "Guided meditation video"),
            "description": {"English": "Guided meditation and breathing resources.", "Hindi": "ध्यान और श्वास अभ्यास के वीडियो.", "Marathi": "ध्यान आणि श्वसन सरावाचे व्हिडिओ."}.get(language, "Meditation resources."),
            "url": _search_url("https://www.youtube.com/results?search_query=", q),
            "type": "video",
        })

    if any(k in text for k in ["exercise", "workout", "walk", "योग", "व्यायाम", "वर्कआउट"]):
        q = {"English": "beginner low impact exercise", "Hindi": "हिंदी beginner exercise", "Marathi": "मराठी beginner exercise"}.get(language, "beginner exercise")
        resources.append({
            "title": {"English": "Beginner exercise video", "Hindi": "शुरुआती व्यायाम वीडियो", "Marathi": "नवशिक्यांसाठी व्यायाम व्हिडिओ"}.get(language, "Beginner exercise video"),
            "description": {"English": "Beginner-friendly movement guidance.", "Hindi": "शुरुआती लोगों के लिए व्यायाम मार्गदर्शन।", "Marathi": "नवशिक्यांसाठी व्यायाम मार्गदर्शन."}.get(language, "Exercise guidance."),
            "url": _search_url("https://www.youtube.com/results?search_query=", q),
            "type": "video",
        })

    if any(k in text for k in ["food", "diet", "nutrition", "meal", "खाना", "आहार", "भोजन", "पोषण"]):
        q = {"English": "healthy food nutrition", "Hindi": "स्वस्थ भोजन पोषण", "Marathi": "निरोगी आहार पोषण"}.get(language, "healthy food nutrition")
        resources.append({
            "title": {"English": "Healthy food video", "Hindi": "स्वस्थ भोजन वीडियो", "Marathi": "निरोगी आहार व्हिडिओ"}.get(language, "Healthy food video"),
            "description": {"English": "Nutrition and healthy meal ideas.", "Hindi": "पोषण और स्वस्थ भोजन के सुझाव।", "Marathi": "पोषण आणि निरोगी आहाराच्या कल्पना."}.get(language, "Nutrition meal ideas."),
            "url": _search_url("https://www.youtube.com/results?search_query=", q),
            "type": "video",
        })

    return resources[:5]


def _extract_patient_risk_features(
    message: str,
    patient_context: Optional[dict[str, Any]] = None,
) -> Optional[dict[str, Any]]:
    """
    Extracts or retrieves features for risk prediction:
    age, bmi, systolic, sugar, smoking, alcohol.
    Combines explicit parameters from user message with stored patient records.
    """
    age = None
    bmi = None
    systolic = None
    sugar = None
    smoking = False
    alcohol = False

    # Pull from patient profile & vitals if provided
    if patient_context:
        age = patient_context.get("age")
        bmi = patient_context.get("bmi")
        systolic = patient_context.get("systolic")
        sugar = patient_context.get("sugar")
        smoking = bool(patient_context.get("smoking", False))
        alcohol = bool(patient_context.get("alcohol", False))

    # Pull / override from message if numbers are specified
    age_match = re.search(r"\b(?:age|years old)\s*[:=]?\s*(\d{1,3})\b", message, re.I)
    if age_match:
        age = float(age_match.group(1))

    bmi_match = re.search(r"\bbmi\s*[:=]?\s*(\d{1,2}(?:\.\d+)?)\b", message, re.I)
    if bmi_match:
        bmi = float(bmi_match.group(1))

    bp_match = re.search(r"\b(?:bp|blood pressure|systolic)\s*[:=]?\s*(\d{2,3})(?:/\d{2,3})?\b", message, re.I)
    if bp_match:
        systolic = float(bp_match.group(1))

    sugar_match = re.search(r"\b(?:sugar|glucose|blood sugar)\s*[:=]?\s*(\d{2,3})\b", message, re.I)
    if sugar_match:
        sugar = float(sugar_match.group(1))

    if re.search(r"\bsmoking\b|\bsmoker\b", message, re.I):
        smoking = True
    if re.search(r"\balcohol\b|\bdrink(?:er|ing)?\b", message, re.I):
        alcohol = True

    # Check completeness
    if age is not None and bmi is not None and systolic is not None and sugar is not None:
        return {
            "age": float(age),
            "bmi": float(bmi),
            "blood_pressure_systolic": float(systolic),
            "blood_sugar": float(sugar),
            "smoking": bool(smoking),
            "alcohol": bool(alcohol),
        }
    return None


def detect_immutable_demographic_change_request(message: str, language: str = "English") -> Optional[str]:
    """
    Detects if the user in chat is asking to alter or update immutable demographic identity fields:
    Full Name, Gender, Date of Birth, or Blood Group.
    Returns an explanatory rejection message if detected, or None otherwise.
    """
    # Guard against internal system / report analyzer prompts
    if message.startswith("You are HealthGuardian") or "Analyze the medical report" in message:
        return None

    low = message.lower().strip()
    patterns = [
        r"\b(?:change|update|modify|edit|alter|set|switch|correct|replace|reset)\s+(?:my\s+)?(?:gender|sex|blood\s*group|blood\s*type|date\s*of\s*birth|dob|birth\s*date|full\s*name|name)\b",
        r"\b(?:can\s+(?:i|you)|how\s+can\s+i|how\s+to|i\s+want\s+to|i\s+need\s+to|please)\s+(?:change|update|modify|edit|alter|switch|correct|replace|reset)\s+(?:my\s+)?(?:gender|sex|blood\s*group|blood\s*type|date\s*of\s*birth|dob|birth\s*date|full\s*name|name)\b",
        r"\b(?:बदलो|बदला|बदलने|बदलणे|अपडेट)\s*(?:माझा|माझे|माझी|मेरा|मेरी|मेरे)?\s*(?:लिंग|रक्त\s*गट|रक्त\s*समूह|जन्मतारीख|जन्म\s*तिथि|नाव|नाम)\b",
        r"\b(?:माझा|माझे|माझी|मेरा|मेरी|मेरे)?\s*(?:लिंग|रक्त\s*गट|रक्त\s*समूह|जन्मतारीख|जन्म\s*तिथि|नाव|नाम)\s*(?:बदला|बदलो|बदलणे|अपडेट)\b",
    ]

    if any(re.search(pat, low, re.I) for pat in patterns):
        if language == "Hindi":
            return (
                "व्यक्तिगत पहचान विवरण (पूरा नाम, जन्म तिथि, लिंग और रक्त समूह) प्रोफ़ाइल पूर्ण होने के बाद बदले नहीं जा सकते हैं, "
                "क्योंकि इनका उपयोग आपके व्यक्तिगत नैदानिक विश्लेषण, दवा सुरक्षा और स्वास्थ्य जोखिम मूल्यांकन के लिए किया जाता है। "
                "यदि आपको किसी त्रुटि के कारण कानूनी सुधार की आवश्यकता है, तो कृपया प्रशासनिक सहायता से संपर्क करें।"
            )
        elif language == "Marathi":
            return (
                "वैयक्तिक ओळख तपशील (पूर्ण नाव, जन्मतारीख, लिंग आणि रक्तगट) प्रोफाइल पूर्ण झाल्यानंतर बदलता येत नाहीत, "
                "कारण त्यांचा वापर तुमच्या वैयक्तिकृत वैद्यकीय विश्लेषण, औषध सुरक्षा आणि आरोग्य जोखीम मूल्यमापनासाठी केला जातो. "
                "तुम्हाला दुरुस्तीची आवश्यकता असल्यास, कृपया प्रशासकीय सहाय्याशी संपर्क साधा."
            )
        else:
            return (
                "Personal identity details (Full Name, Date of Birth, Gender, and Blood Group) cannot be changed after profile completion "
                "because they are permanently used for personalized clinical analysis, medication safety, and health risk calculations. "
                "If you need an official correction due to a clerical error, please contact healthcare administrative support."
            )
    return None


def execute_chatbot_pipeline(
    message: str,
    history: Optional[list[dict]] = None,
    language: str = "English",
    patient_context: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """
    Full HealthGuardian response pipeline:
    1. Immutable Demographic Change Guard
    2. Health Domain Gate
    3. Emergency Detection
    4. Intent Routing
    5. General Health RAG vs Structured ML Risk Prediction
    6. AI Provider Execution (Gemini -> Groq fallback)
    7. Medical Safety Validation
    """
    lang_instruction = LANGUAGE_INSTRUCTIONS.get(language, LANGUAGE_INSTRUCTIONS["English"])

    # ----------------------------------------------------
    # 0. Immutable Demographic Change Guard
    # ----------------------------------------------------
    demographic_rejection = detect_immutable_demographic_change_request(message, language=language)
    if demographic_rejection:
        logger.info("[AI] Chatbot Guard: Immutable demographic change request intercepted.")
        return {
            "reply": demographic_rejection,
            "response": demographic_rejection,
            "language": language,
            "safety_level": "low",
            "emergency": False,
            "intent": "IMMUTABLE_PROFILE_GUARD",
            "provider": "profile_guard",
            "model": "rule_based_guard",
            "resources": [],
        }

    # ----------------------------------------------------
    # 1. Health Domain Classification & Injection Defense
    # ----------------------------------------------------
    domain_category, rejection_msg = classify_domain(message, language=language)
    if domain_category == HealthCategory.NON_HEALTH:
        logger.info("[AI] Health Domain Gate: NON_HEALTH query rejected without calling LLM.")
        return {
            "reply": rejection_msg,
            "response": rejection_msg,
            "language": language,
            "safety_level": "low",
            "emergency": False,
            "intent": "NON_HEALTH",
            "provider": "domain_gate",
            "model": "rule_based_gate",
            "resources": [],
        }

    # ----------------------------------------------------
    # 2. Emergency Detection
    # ----------------------------------------------------
    is_emergency, _ = detect_emergency(message)
    safety_level = "high" if is_emergency else "low"

    # ----------------------------------------------------
    # 3. Intent Detection: Structured Health Risk Prediction vs General Health
    # ----------------------------------------------------
    provider_mgr = get_ai_provider_manager()

    if domain_category == HealthCategory.HEALTH_RISK:
        # Check patient features
        features = _extract_patient_risk_features(message, patient_context)
        if not features:
            msg = (
                "I don't have enough validated information to generate a reliable risk estimate. "
                "To evaluate your risk with our validated machine learning models (Logistic Regression and Random Forest), "
                "please provide or log your: Age, BMI (or height & weight), Blood Pressure (systolic), "
                "and Fasting Blood Sugar level."
            )
            return {
                "reply": msg,
                "response": msg,
                "language": language,
                "safety_level": "low",
                "emergency": False,
                "intent": "HEALTH_RISK",
                "provider": "risk_validator",
                "model": "feature_validation",
                "resources": resource_pack(message, language),
            }

        # Run dual-model ML comparison & selection
        risk_predictor = get_risk_predictor()
        ml_result = risk_predictor.predict(
            age=features["age"],
            bmi=features["bmi"],
            blood_pressure_systolic=features["blood_pressure_systolic"],
            blood_sugar=features["blood_sugar"],
            smoking=features["smoking"],
            alcohol=features["alcohol"],
        )

        models_used = ml_result["models_used"]
        explanation_prompt = (
            f"{lang_instruction}\n\n"
            f"You are explaining structured machine learning predictions for a patient.\n"
            f"The best validated model ({models_used['diabetes']}) estimated:\n"
            f"- Diabetes risk: {ml_result['diabetes_risk']}%\n"
            f"- Heart disease risk: {ml_result['heart_disease_risk']}%\n"
            f"- Hypertension risk: {ml_result['hypertension_risk']}%\n"
            f"- Overall Risk Level: {ml_result['risk_level'].upper()}\n\n"
            f"Patient Data Used: Age {features['age']}, BMI {features['bmi']}, "
            f"Systolic BP {features['blood_pressure_systolic']}, Blood Sugar {features['blood_sugar']}.\n\n"
            f"TASK FOR YOU (LLM):\n"
            f"Explain these specific risk percentages clearly and educationally to the patient in {language}.\n"
            f"Highlight which lifestyle factors (diet, activity, BP control) are relevant.\n"
            f"IMPORTANT MEDICAL BOUNDARIES:\n"
            f"- DO NOT contradict or change the prediction percentages above.\n"
            f"- Clearly state that this is an educational risk prediction and NOT a medical diagnosis.\n"
            f"- Encourage discussing the findings with a qualified doctor for clinical evaluation.\n"
            f"- Use short, easy-to-read sections."
        )

        ai_resp = provider_mgr.generate(
            prompt=explanation_prompt,
            system_instruction=HEALTHCARE_SYSTEM_PROMPT,
            temperature=0.3,
            domain="HEALTH",
            intent="HEALTH_RISK",
        )

        final_text = ai_resp.text or ""
        valid, validated_text = validate_medical_response(
            final_text, is_emergency=is_emergency, is_risk_prediction=True
        )

        reply = validated_text or final_text
        return {
            "reply": reply,
            "response": reply,
            "language": language,
            "safety_level": "moderate" if ml_result["risk_level"] in ("moderate", "high") else "low",
            "emergency": False,
            "intent": "HEALTH_RISK",
            "provider": ai_resp.provider,
            "model": ai_resp.model,
            "resources": resource_pack(message, language),
            "ml_prediction": ml_result,
        }

    # ----------------------------------------------------
    # 4. General Health Question Pipeline (RAG + AI Provider)
    # ----------------------------------------------------
    medical_evidence = retrieve_medical_context(message)
    history_text = ""
    if history:
        history_text = "\n\n".join(
            f"{x.get('role', 'user').upper()}: {x.get('content', '')}" for x in history[-8:]
        )

    evidence_block = f"\n\n{medical_evidence}\n\n" if medical_evidence else ""

    demo_parts = []
    if patient_context:
        if patient_context.get("full_name"):
            demo_parts.append(f"Name: {patient_context['full_name']}")
        if patient_context.get("gender"):
            demo_parts.append(f"Gender: {patient_context['gender']}")
        if patient_context.get("age"):
            demo_parts.append(f"Age: {patient_context['age']}")
        elif patient_context.get("date_of_birth"):
            demo_parts.append(f"DOB: {patient_context['date_of_birth']}")
        if patient_context.get("blood_group"):
            demo_parts.append(f"Blood Group: {patient_context['blood_group']}")
    patient_demo_block = f"Patient Demographics (Verified & Locked): {', '.join(demo_parts)}\n\n" if demo_parts else ""

    prompt = (
        f"{lang_instruction}\n\n"
        f"Conversation Context:\n{history_text}\n\n"
        f"{patient_demo_block}"
        f"{evidence_block}"
        f"USER HEALTH QUESTION:\n{message}\n\n"
        "Provide a clear, practical, and empathetic educational response. "
        "Use plain-text headings and concise bullets. Never provide a formal medical diagnosis."
    )

    ai_resp = provider_mgr.generate(
        prompt=prompt,
        system_instruction=HEALTHCARE_SYSTEM_PROMPT,
        temperature=0.35,
        domain="HEALTH",
        intent=domain_category.value,
    )

    raw_text = ai_resp.text or ""
    valid, validated_text = validate_medical_response(
        raw_text, is_emergency=is_emergency, is_risk_prediction=False
    )

    final_reply = validated_text if valid and validated_text else raw_text
    resources = resource_pack(message, language)

    return {
        "reply": final_reply,
        "response": final_reply,
        "language": language,
        "safety_level": safety_level,
        "emergency": is_emergency,
        "intent": domain_category.value,
        "provider": ai_resp.provider,
        "model": ai_resp.model,
        "resources": resources,
    }


def get_chat_reply(message: str, history=None, language: str = "English", patient_context=None) -> str:
    """Backward compatibility helper for tests or direct calls."""
    res = execute_chatbot_pipeline(message, history=history, language=language, patient_context=patient_context)
    return res["reply"]
