"""
Rule-based diet and workout plan generators.

These are deterministic recommendation engines (not ML models) — they
apply standard nutrition/exercise-science heuristics (Mifflin-St Jeor for
calories, goal-based macro splits, and a rotating exercise library).
"""
from typing import Optional


def _bmr_mifflin_st_jeor(weight_kg: float, height_cm: float, age: int, gender: str) -> float:
    base = 10 * weight_kg + 6.25 * height_cm - 5 * age
    return base + 5 if gender.lower().startswith("m") else base - 161


def generate_diet_plan(
    goal: str,
    weight_kg: float = 70,
    height_cm: float = 170,
    age: int = 30,
    gender: str = "male",
    dietary_preference: Optional[str] = None,
) -> dict:
    bmr = _bmr_mifflin_st_jeor(weight_kg, height_cm, age, gender)
    activity_multiplier = 1.375  # light activity default
    maintenance = bmr * activity_multiplier

    goal = goal.lower()
    if goal == "weight_loss":
        calories = round(maintenance - 500)
    elif goal in ("weight_gain", "muscle_gain"):
        calories = round(maintenance + 400)
    else:
        calories = round(maintenance)

    pref = (dietary_preference or "non_vegetarian").lower()
    protein_sources = (
        ["lentils", "tofu", "paneer", "chickpeas", "greek yogurt"]
        if pref in ("vegetarian", "vegan")
        else ["chicken breast", "eggs", "fish", "greek yogurt", "lean beef"]
    )

    meals = {
        "breakfast": {"calories": round(calories * 0.25), "suggestion": f"Oats with fruit and {protein_sources[0]}"},
        "lunch": {"calories": round(calories * 0.35), "suggestion": f"Whole grains, vegetables, and {protein_sources[1]}"},
        "snack": {"calories": round(calories * 0.10), "suggestion": "Nuts, fruit, or a protein shake"},
        "dinner": {"calories": round(calories * 0.30), "suggestion": f"Vegetables and {protein_sources[2]}"},
    }

    return {"goal": goal, "daily_calories": calories, "meals": meals}


_EXERCISE_LIBRARY = {
    "strength": ["Squats", "Deadlifts", "Bench Press", "Rows", "Overhead Press"],
    "cardio": ["Running", "Cycling", "Jump Rope", "Rowing Machine", "Swimming"],
    "flexibility": ["Yoga Flow", "Dynamic Stretching", "Pilates", "Mobility Drills"],
    "weight_loss": ["Circuit Training", "HIIT", "Brisk Walking", "Cycling", "Bodyweight Circuits"],
}


def generate_workout_plan(goal: str, difficulty: str = "beginner", days_per_week: int = 3) -> dict:
    goal_key = goal.lower() if goal.lower() in _EXERCISE_LIBRARY else "strength"
    exercises = _EXERCISE_LIBRARY[goal_key]

    difficulty = difficulty.lower()
    sets_reps = {
        "beginner": "3 sets x 10 reps",
        "intermediate": "4 sets x 12 reps",
        "advanced": "5 sets x 15 reps",
    }.get(difficulty, "3 sets x 10 reps")

    schedule = {}
    for i in range(days_per_week):
        day_name = f"day_{i + 1}"
        exercise = exercises[i % len(exercises)]
        schedule[day_name] = {"focus": goal_key, "exercise": exercise, "prescription": sets_reps}

    return {"goal": goal_key, "difficulty": difficulty, "days_per_week": days_per_week, "schedule": schedule}
