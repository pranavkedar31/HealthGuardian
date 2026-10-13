from fastapi import APIRouter

from app.api.v1 import (
    admin,
    ai_health,
    appointments,
    auth,
    chatbot,
    diet,
    doctor,
    doctors,
    health_profile,
    integrations,
    notifications,
    predictions,
    reminders,
    reports,
    symptoms,
    users,
    vitals,
    workout,
)

api_router = APIRouter()

# AI Health & ML status
api_router.include_router(ai_health.router)

# Authentication
api_router.include_router(auth.router)

# User
api_router.include_router(users.router)

# Health profile
api_router.include_router(health_profile.router)

# Symptoms
api_router.include_router(symptoms.router)

# Predictions
api_router.include_router(predictions.router)

# Diet & workout
api_router.include_router(diet.router)
api_router.include_router(workout.router)

# Vitals
api_router.include_router(vitals.router)

# AI chatbot
api_router.include_router(chatbot.router)

# Medical reports
api_router.include_router(reports.router)

# Medicine reminders
api_router.include_router(reminders.router)

# Integrations
api_router.include_router(integrations.router)

# Doctor, appointments & admin
api_router.include_router(appointments.router)
api_router.include_router(doctor.router)
api_router.include_router(doctors.router)
api_router.include_router(notifications.router)
api_router.include_router(admin.router)
