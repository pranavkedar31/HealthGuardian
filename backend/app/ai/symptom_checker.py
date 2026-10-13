"""
HealthGuardian symptom screening engine.

This is an educational screening tool, NOT a diagnostic system.

The engine:
- normalizes common symptom wording
- corrects minor spelling mistakes
- understands common symptom aliases
- matches multiple symptoms against known patterns
- merges duplicate condition patterns correctly
- avoids forcing weak/unknown input into an unrelated condition
- identifies important emergency symptoms
"""

import difflib
import re
from collections import defaultdict

# -------------------------------------------------------------------
# Symptom patterns
# -------------------------------------------------------------------

_TRAINING_DATA: list[tuple[list[str], str, str]] = [
    (
        ["fever", "cough", "sore throat"],
        "Common Cold",
        "mild",
    ),
    (
        ["fever", "cough", "shortness of breath", "fatigue"],
        "Flu",
        "moderate",
    ),
    (
        ["headache", "nausea", "sensitivity to light"],
        "Migraine",
        "moderate",
    ),
    (
        ["chest pain", "shortness of breath", "sweating"],
        "Possible Cardiac Event",
        "severe",
    ),
    (
        ["abdominal pain", "nausea", "vomiting"],
        "Gastroenteritis",
        "moderate",
    ),
    (
        ["sneezing", "runny nose", "itchy eyes"],
        "Allergic Rhinitis",
        "mild",
    ),
    (
        ["joint pain", "swelling", "stiffness"],
        "Arthritis",
        "moderate",
    ),
    (
        ["frequent urination", "excessive thirst", "fatigue"],
        "Possible Diabetes",
        "moderate",
    ),
    (
        ["rash", "itching", "redness"],
        "Skin Allergy",
        "mild",
    ),
    (
        ["high fever", "chills", "body ache"],
        "Flu",
        "moderate",
    ),
    (
        ["persistent cough", "weight loss", "night sweats"],
        "Possible Tuberculosis",
        "severe",
    ),
    (
        ["dizziness", "blurred vision", "headache"],
        "Hypertension",
        "moderate",
    ),
    (
        ["sore throat", "runny nose", "mild fever"],
        "Common Cold",
        "mild",
    ),
    (
        ["chest pain", "pain radiating to arm", "shortness of breath"],
        "Possible Cardiac Event",
        "severe",
    ),
    (
        ["diarrhea", "abdominal cramps", "fever"],
        "Gastroenteritis",
        "moderate",
    ),
]


# -------------------------------------------------------------------
# Advice
# -------------------------------------------------------------------

_CONDITION_ADVICE = {
    "Common Cold": (
        "Your symptoms may be consistent with a common cold. "
        "Rest, stay hydrated, and monitor how your symptoms change. "
        "Seek medical advice if symptoms become severe or persist."
    ),
    "Flu": (
        "Your symptoms may overlap with influenza-like illness. "
        "Rest, stay hydrated, and monitor your temperature and breathing. "
        "Seek medical care if symptoms become severe."
    ),
    "Migraine": (
        "Your symptoms may overlap with a migraine pattern. "
        "Rest in a quiet environment and monitor the headache. "
        "A new, sudden, or unusually severe headache should be "
        "evaluated by a healthcare professional."
    ),
    "Possible Cardiac Event": (
        "Chest pain together with symptoms such as breathing difficulty "
        "or sweating can require urgent medical evaluation. "
        "Do not rely on an AI screening result in this situation."
    ),
    "Gastroenteritis": (
        "Your symptoms may overlap with a stomach or intestinal illness. "
        "Focus on hydration and monitor for dehydration, persistent "
        "vomiting, diarrhea, or worsening abdominal symptoms."
    ),
    "Allergic Rhinitis": (
        "Your symptoms may overlap with an allergic nasal condition. "
        "Avoid known triggers and discuss persistent symptoms with "
        "a healthcare professional."
    ),
    "Arthritis": (
        "Joint pain, swelling, and stiffness can have several causes. "
        "Persistent or worsening joint symptoms should be evaluated "
        "by a healthcare professional."
    ),
    "Possible Diabetes": (
        "Frequent urination and excessive thirst can have several causes. "
        "Discuss appropriate blood-glucose testing with a healthcare "
        "professional."
    ),
    "Skin Allergy": (
        "Your symptoms may overlap with a skin-allergy pattern. "
        "Avoid suspected irritants and seek medical advice if the "
        "reaction spreads or becomes severe."
    ),
    "Possible Tuberculosis": (
        "A persistent cough together with symptoms such as weight loss "
        "or night sweats requires medical evaluation."
    ),
    "Hypertension": (
        "Symptoms alone cannot establish high blood pressure. "
        "A blood-pressure measurement and professional evaluation "
        "are needed."
    ),
}


# -------------------------------------------------------------------
# Symptom aliases
# -------------------------------------------------------------------

_SYMPTOM_ALIASES = {
    # Fever
    "temperature": "fever",
    "high temperature": "fever",
    "high temp": "fever",
    "hot body": "fever",
    "mild fever": "fever",

    # Cough
    "coughing": "cough",
    "dry cough": "cough",
    "bad cough": "cough",
    "coughing a lot": "cough",

    # Throat
    "throat pain": "sore throat",
    "painful throat": "sore throat",
    "throat irritation": "sore throat",

    # Nose
    "sneeze": "sneezing",
    "sneezing a lot": "sneezing",
    "blocked nose": "nasal congestion",
    "stuffy nose": "nasal congestion",

    # Fatigue / sleep
    "sleepy": "fatigue",
    "sleepiness": "fatigue",
    "drowsy": "fatigue",
    "drowsiness": "fatigue",
    "tired": "fatigue",
    "tiredness": "fatigue",
    "very tired": "fatigue",
    "feeling tired": "fatigue",
    "weak": "fatigue",
    "weakness": "fatigue",
    "feeling weak": "fatigue",
    "excessive sleep": "fatigue",
    "sleeping too much": "fatigue",

    # Headache
    "head pain": "headache",
    "head ache": "headache",
    "pain in head": "headache",

    # Stomach
    "stomach pain": "abdominal pain",
    "belly pain": "abdominal pain",
    "abdominal discomfort": "abdominal pain",

    # Vomiting
    "throwing up": "vomiting",
    "threw up": "vomiting",
    "vomit": "vomiting",

    # Diarrhea
    "loose motion": "diarrhea",
    "loose motions": "diarrhea",
    "loose stool": "diarrhea",
    "loose stools": "diarrhea",

    # Breathing
    "breathlessness": "shortness of breath",
    "difficulty breathing": "shortness of breath",
    "breathing difficulty": "shortness of breath",
    "short breath": "shortness of breath",

    # Joint / body pain
    "joint ache": "joint pain",
    "joints hurt": "joint pain",
    "body pain": "body ache",
    "body pains": "body ache",
    "muscle pain": "body ache",
    "body ache": "body ache",

    # Skin
    "itch": "itching",
    "itchy skin": "itching",
    "skin itching": "itching",

    # Urination
    "urinating frequently": "frequent urination",
    "peeing frequently": "frequent urination",
    "peeing a lot": "frequent urination",

    # Thirst
    "very thirsty": "excessive thirst",
    "extreme thirst": "excessive thirst",
}


# -------------------------------------------------------------------
# Emergency symptoms
# -------------------------------------------------------------------

_EMERGENCY_SYMPTOMS = {
    "chest pain",
    "shortness of breath",
    "severe bleeding",
    "fainting",
    "unconscious",
    "seizure",
    "stroke",
    "vision loss",
}


# -------------------------------------------------------------------
# Text helpers
# -------------------------------------------------------------------

def _normalize_text(value: str) -> str:
    value = value.lower().strip()

    value = re.sub(
        r"[^a-z0-9\s-]",
        " ",
        value,
    )

    value = re.sub(
        r"\s+",
        " ",
        value,
    )

    return value


# -------------------------------------------------------------------
# Known symptoms
# -------------------------------------------------------------------

def _get_known_symptoms() -> set[str]:
    known = set()

    for symptoms, _, _ in _TRAINING_DATA:
        for symptom in symptoms:
            known.add(
                _normalize_text(symptom)
            )

    known.update(
        _normalize_text(value)
        for value in _SYMPTOM_ALIASES.values()
    )

    known.update(
        _normalize_text(key)
        for key in _SYMPTOM_ALIASES.keys()
    )

    return known


# -------------------------------------------------------------------
# Fuzzy symptom matching
# -------------------------------------------------------------------

def normalize_symptom(symptom: str) -> str:
    """
    Convert user-entered symptom text into a known symptom.

    Supports:
    - exact matches
    - aliases
    - phrases
    - minor spelling mistakes
    - word-level fuzzy matching
    """

    text = _normalize_text(symptom)

    if not text:
        return ""

    known_symptoms = _get_known_symptoms()

    # ---------------------------------------------------------------
    # Exact alias
    # ---------------------------------------------------------------

    if text in _SYMPTOM_ALIASES:
        return _SYMPTOM_ALIASES[text]

    # ---------------------------------------------------------------
    # Exact known symptom
    # ---------------------------------------------------------------

    if text in known_symptoms:
        return text

    # ---------------------------------------------------------------
    # Phrase alias
    # ---------------------------------------------------------------

    for phrase, normalized in sorted(
        _SYMPTOM_ALIASES.items(),
        key=lambda item: len(item[0]),
        reverse=True,
    ):
        phrase = _normalize_text(phrase)

        if phrase in text:
            return normalized

    # ---------------------------------------------------------------
    # Whole phrase fuzzy match
    # ---------------------------------------------------------------

    candidates = list(
        set(_SYMPTOM_ALIASES.keys())
        | known_symptoms
    )

    matches = difflib.get_close_matches(
        text,
        candidates,
        n=1,
        cutoff=0.72,
    )

    if matches:
        matched = matches[0]

        if matched in _SYMPTOM_ALIASES:
            return _SYMPTOM_ALIASES[matched]

        return matched

    # ---------------------------------------------------------------
    # Word-level fuzzy matching
    # ---------------------------------------------------------------

    words = text.split()

    single_word_candidates = [
        candidate
        for candidate in candidates
        if " " not in candidate
    ]

    corrected_words = []

    for word in words:

        if len(word) <= 2:
            corrected_words.append(word)
            continue

        matches = difflib.get_close_matches(
            word,
            single_word_candidates,
            n=1,
            cutoff=0.78,
        )

        if matches:
            corrected_words.append(
                matches[0]
            )
        else:
            corrected_words.append(
                word
            )

    corrected_phrase = " ".join(
        corrected_words
    )

    if corrected_phrase in _SYMPTOM_ALIASES:
        return _SYMPTOM_ALIASES[
            corrected_phrase
        ]

    if corrected_phrase in known_symptoms:
        return corrected_phrase

    for word in corrected_words:

        if word in _SYMPTOM_ALIASES:
            return _SYMPTOM_ALIASES[word]

        if word in known_symptoms:
            return word

    return text


# -------------------------------------------------------------------
# Symptom checker
# -------------------------------------------------------------------

class SymptomChecker:

    def __init__(self):

        self._severity_map = {}

        for _, condition, severity in _TRAINING_DATA:
            self._severity_map[condition] = severity

        # IMPORTANT:
        # Multiple training patterns can belong to the same
        # condition. We MERGE their symptoms instead of overwriting
        # the previous condition entry.
        self._condition_symptoms = {}

        for symptoms, condition, _ in _TRAINING_DATA:

            if condition not in self._condition_symptoms:
                self._condition_symptoms[condition] = set()

            self._condition_symptoms[condition].update(
                normalize_symptom(symptom)
                for symptom in symptoms
            )

    # ----------------------------------------------------------------
    # Score conditions
    # ----------------------------------------------------------------

    def _score_conditions(
        self,
        normalized_symptoms: list[str],
    ):

        scores = defaultdict(float)
        matched = defaultdict(list)

        for condition, condition_symptoms in (
            self._condition_symptoms.items()
        ):

            for symptom in normalized_symptoms:

                if symptom in condition_symptoms:

                    scores[condition] += 1.0

                    matched[condition].append(
                        symptom
                    )

        return scores, matched

    # ----------------------------------------------------------------
    # Prediction
    # ----------------------------------------------------------------

    def predict(
        self,
        symptoms: list[str],
    ) -> dict:

        normalized_symptoms = []

        for symptom in symptoms:

            if not symptom:
                continue

            normalized = normalize_symptom(
                symptom
            )

            if normalized:
                normalized_symptoms.append(
                    normalized
                )

        # Remove duplicate symptoms
        normalized_symptoms = list(
            dict.fromkeys(
                normalized_symptoms
            )
        )

        # ------------------------------------------------------------
        # No symptoms
        # ------------------------------------------------------------

        if not normalized_symptoms:

            return {
                "predicted_condition": (
                    "Insufficient information"
                ),
                "confidence": 0.0,
                "severity": "advisory",
                "recommendation": (
                    "Please enter one or more symptoms "
                    "so HealthGuardian can provide "
                    "educational guidance."
                ),
            }

        # ------------------------------------------------------------
        # Emergency check
        # ------------------------------------------------------------

        emergency_matches = [
            symptom
            for symptom in normalized_symptoms
            if symptom in _EMERGENCY_SYMPTOMS
        ]

        if emergency_matches:

            return {
                "predicted_condition": (
                    "Urgent medical evaluation recommended"
                ),
                "confidence": 100.0,
                "severity": "severe",
                "recommendation": (
                    "One or more symptoms entered can be "
                    "associated with a medical emergency. "
                    "Do not rely on an AI screening result. "
                    "Seek urgent professional medical attention, "
                    "especially if symptoms are sudden, severe, "
                    "or getting worse."
                ),
            }

        # ------------------------------------------------------------
        # Score conditions
        # ------------------------------------------------------------

        scores, matched = self._score_conditions(
            normalized_symptoms
        )

        if not scores:

            return {
                "predicted_condition": (
                    "More information needed"
                ),
                "confidence": 0.0,
                "severity": "advisory",
                "recommendation": (
                    "The symptoms entered do not match "
                    "the current screening patterns closely "
                    "enough to suggest a specific condition. "
                    "Try adding other symptoms, duration, "
                    "severity, or recent changes."
                ),
            }

        # ------------------------------------------------------------
        # Rank conditions
        # ------------------------------------------------------------

        ranked = sorted(
            scores.items(),
            key=lambda item: (
                item[1],
                len(matched[item[0]]),
            ),
            reverse=True,
        )

        best_condition = ranked[0][0]

        best_matches = list(
            dict.fromkeys(
                matched[best_condition]
            )
        )

        matched_count = len(
            best_matches
        )

        # ------------------------------------------------------------
        # Confidence
        # ------------------------------------------------------------

        if matched_count >= 3:
            confidence = min(
                90.0,
                50.0 + (
                    matched_count * 12.0
                ),
            )

        elif matched_count == 2:
            confidence = 45.0

        else:
            confidence = 20.0

        # ------------------------------------------------------------
        # One symptom is not enough
        # ------------------------------------------------------------

        if matched_count == 1:

            return {
                "predicted_condition": (
                    "More information needed"
                ),
                "confidence": confidence,
                "severity": "advisory",
                "recommendation": (
                    f"We recognized "
                    f"'{best_matches[0]}', but a single "
                    "symptom is not enough to suggest a "
                    "specific condition reliably. "
                    "Add other symptoms or relevant details "
                    "such as duration, severity, fever, pain, "
                    "or recent changes."
                ),
            }

        # ------------------------------------------------------------
        # Multiple matching symptoms
        # ------------------------------------------------------------

        severity = self._severity_map.get(
            best_condition,
            "moderate",
        )

        recommendation = _CONDITION_ADVICE.get(
            best_condition,
            (
                "Please consult a healthcare professional "
                "for an appropriate evaluation."
            ),
        )

        return {
            "predicted_condition": best_condition,
            "confidence": round(
                confidence,
                2,
            ),
            "severity": severity,
            "recommendation": recommendation,
        }


# -------------------------------------------------------------------
# Singleton
# -------------------------------------------------------------------

_checker_instance: SymptomChecker | None = None


def get_symptom_checker() -> SymptomChecker:

    global _checker_instance

    if _checker_instance is None:
        _checker_instance = SymptomChecker()

    return _checker_instance
