"""
BMI calculation — deterministic, no ML needed.
"""


def calculate_bmi(height_cm: float, weight_kg: float) -> dict:
    height_m = height_cm / 100
    bmi = round(weight_kg / (height_m**2), 2)

    if bmi < 18.5:
        category = "underweight"
    elif bmi < 25:
        category = "normal"
    elif bmi < 30:
        category = "overweight"
    else:
        category = "obese"

    return {"bmi": bmi, "category": category}
