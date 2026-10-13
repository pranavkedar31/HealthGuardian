"""
Medical Knowledge Retrieval (RAG) module for HealthGuardian.
Provides trusted clinical guidelines and medical evidence to ground LLM responses.
"""
from typing import Optional


MEDICAL_KNOWLEDGE_BASE = [
    {
        "id": "diabetes_guidelines",
        "keywords": ["diabetes", "blood sugar", "glucose", "hba1c", "insulin", "मधुमेह", "शुगर"],
        "summary": (
            "Clinical Diabetes Reference:\n"
            "- Normal fasting blood glucose: 70–99 mg/dL. Prediabetes: 100–125 mg/dL. Diabetes: 126 mg/dL or higher on 2 separate tests.\n"
            "- Normal HbA1c: Below 5.7%. Prediabetes: 5.7%–6.4%. Diabetes: 6.5% or higher.\n"
            "- Type 1: Autoimmune destruction of beta cells requiring insulin.\n"
            "- Type 2: Insulin resistance associated with lifestyle, genetics, and visceral adiposity.\n"
            "- Core management: Balanced diet high in complex fiber, regular moderate physical activity, glucose monitoring, and physician consultation."
        ),
    },
    {
        "id": "hypertension_guidelines",
        "keywords": ["blood pressure", "hypertension", "systolic", "diastolic", "high bp", "रक्तचाप", "रक्तदाब"],
        "summary": (
            "Clinical Blood Pressure Reference (AHA/ACC Standards):\n"
            "- Normal: Systolic < 120 mmHg AND Diastolic < 80 mmHg.\n"
            "- Elevated: Systolic 120–129 mmHg AND Diastolic < 80 mmHg.\n"
            "- Stage 1 Hypertension: Systolic 130–139 mmHg OR Diastolic 80–89 mmHg.\n"
            "- Stage 2 Hypertension: Systolic >= 140 mmHg OR Diastolic >= 90 mmHg.\n"
            "- Hypertensive Crisis: Systolic > 180 mmHg and/or Diastolic > 120 mmHg (requires immediate emergency medical attention).\n"
            "- Preventive lifestyle: Sodium restriction (<2,300 mg/day), DASH diet, potassium-rich foods, stress management, 150 mins weekly aerobic exercise."
        ),
    },
    {
        "id": "cardiovascular_risk",
        "keywords": ["heart", "cardio", "cholesterol", "heart disease", "cardiovascular", "हृदय"],
        "summary": (
            "Cardiovascular Wellness Reference:\n"
            "- Major modifiable risk factors: Hypertension, elevated LDL cholesterol, smoking, physical inactivity, obesity, poorly managed blood glucose.\n"
            "- Healthy heart habits: Mediterranean or plant-forward dietary pattern, aerobic movement, adequate sleep (7–9 hours), avoidance of tobacco and excessive alcohol.\n"
            "- Warning signs: Chest discomfort, pressure, or shortness of breath require urgent medical evaluation."
        ),
    },
    {
        "id": "anemia_nutrition",
        "keywords": ["anemia", "iron", "hemoglobin", "fatigue", "pale", "अनीमिया", "लोह"],
        "summary": (
            "Anemia & Iron Nutrition Reference:\n"
            "- Iron-deficiency anemia is characterized by low hemoglobin resulting in insufficient oxygen delivery to tissues.\n"
            "- Symptoms: Fatigue, weakness, pale conjunctiva/skin, shortness of breath on mild exertion, dizziness, cold hands/feet.\n"
            "- Dietary sources of iron: Heme iron (poultry, fish) and non-heme iron (spinach, lentils, beans, fortified grains).\n"
            "- Clinical tip: Pair non-heme iron with Vitamin C (citrus, bell peppers) to boost absorption; avoid tea/coffee with iron-rich meals."
        ),
    },
    {
        "id": "medicine_safety",
        "keywords": ["paracetamol", "acetaminophen", "ibuprofen", "cetirizine", "tablet", "medicine", "pill", "दवा", "औषध"],
        "summary": (
            "Medication Education & Safety Reference:\n"
            "- Paracetamol (Acetaminophen): Analgesic and antipyretic. Safe max dose typically 3,000–4,000 mg/day for adults; excess causes severe liver toxicity. Verify liver disease precautions.\n"
            "- Ibuprofen: Non-steroidal anti-inflammatory drug (NSAID). Should be taken with food/water to reduce gastrointestinal irritation. Caution in kidney disease, hypertension, or active ulcers.\n"
            "- General guideline: Never adjust prescription medications without consulting a licensed physician or pharmacist."
        ),
    },
    {
        "id": "sleep_stress",
        "keywords": ["sleep", "insomnia", "stress", "anxiety", "meditation", "तनाव", "झोप"],
        "summary": (
            "Rest & Mental Wellness Reference:\n"
            "- Sleep hygiene: Regular sleep schedule, dark/cool sleep environment, screen cutoff 60 mins before bedtime, avoiding late caffeine.\n"
            "- Stress reduction: Diaphragmatic breathing (e.g. 4-7-8 technique), progressive muscle relaxation, regular physical activity, and seeking mental health professional support when needed."
        ),
    },
]


def retrieve_medical_context(query: str) -> Optional[str]:
    """
    Retrieves trusted medical evidence chunks matching keywords in user query.
    Returns concatenated reference string, or None if no specific match.
    """
    lowered = query.lower()
    matches = []
    for item in MEDICAL_KNOWLEDGE_BASE:
        for kw in item["keywords"]:
            if kw in lowered:
                matches.append(item["summary"])
                break

    if not matches:
        return None

    combined = "\n\n".join(matches[:2])
    return f"TRUSTED MEDICAL CLINICAL REFERENCE GUIDELINES:\n{combined}"
