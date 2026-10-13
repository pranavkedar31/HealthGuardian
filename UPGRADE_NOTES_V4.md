# HealthGuardian Full AI Upgrade v4

## New features (in addition to existing HealthGuardian features)
1. Hydration Tracker
2. Sleep Tracker
3. Mood & Stress Check
4. Daily Health Check-in
5. Medicine Interaction Checker
6. First-Aid Guide
7. Food Photo Journal
8. Health Goals & Habits
9. Emergency Safety Plan
10. Health Education Library

## Audio improvements
- Slower speech rate (0.76) for clearer listening.
- Automatically prefers female-sounding browser voices when the browser provides one for the selected language.
- Falls back to a matching language voice if a female voice is unavailable.
- Stop/replay behavior remains supported.
- Markdown and URLs are cleaned before speech.

## Appointment removal
- Appointment booking has been removed from the frontend navigation and routes.
- Appointment API router is no longer mounted in the backend API.
- Existing database migration/service files are left intact for compatibility; no destructive database migration is required.

## Installation
Keep your existing backend `.env`, PostgreSQL database and virtual environment.

Backend:
  cd backend
  .\venv\Scripts\Activate.ps1
  pip install -r requirements.txt
  uvicorn app.main:app --reload

Frontend:
  cd frontend
  npm install
  npm run dev

Gemini:
  GEMINI_API_KEY=your_actual_key
  GEMINI_MODEL=gemini-3.1-flash-lite
