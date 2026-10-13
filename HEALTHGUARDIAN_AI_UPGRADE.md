# HealthGuardian AI Upgrade

This package upgrades the existing HealthGuardian project without replacing the PostgreSQL database or the user's `.env` file.

## Included

- Gemini multilingual assistant using `GEMINI_API_KEY` from backend settings.
- English, Hindi and Marathi responses.
- Emergency-symptom escalation banner and safety level metadata.
- Medicine reference cards with Wikimedia image thumbnails when available and Google Images fallback.
- YouTube health-resource cards for meditation, exercise, nutrition and sleep.
- Medicine safety guidance and visual-reference disclaimer.
- Robust Read Aloud: Markdown cleanup, sentence chunking, Stop button, automatic cancellation before a new message, and cleanup when leaving the page.
- Browser voice input using Web Speech API when supported.
- New Health Insights page with a non-clinical wellness score, BMI screening, latest vitals, action suggestions and AI shortcuts.
- Navigation entry for Health Insights.
- Backend output schema extended with `safety_level` and `emergency`.

## Files changed

- `backend/app/ai/chatbot.py`
- `backend/app/api/v1/chatbot.py`
- `backend/app/schemas/chat.py`
- `backend/app/services/chatbot_service.py`
- `frontend/src/pages/Chatbot.jsx`
- `frontend/src/pages/HealthInsights.jsx` (new)
- `frontend/src/App.jsx`
- `frontend/src/components/Navbar.jsx`

## Important

Keep the existing backend `.env` and replace only the placeholder API key value if needed:

```env
GEMINI_API_KEY=your_actual_key
GEMINI_MODEL=gemini-3.1-flash-lite
```

The application is intentionally designed as a healthcare companion. It provides educational and preventive guidance and escalates serious situations; it does not claim to replace emergency care, diagnosis or individualized prescribing.

## Run

Backend:

```powershell
cd C:\Users\user\Desktop\HealthGuardian\backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

Frontend:

```powershell
cd C:\Users\user\Desktop\HealthGuardian\frontend
npm run dev
```

Then open `/chatbot` and `/health-insights`.

## Verification

Backend Python files were syntax-checked with `python -m compileall`. The frontend build was not run in the packaging environment because `frontend/node_modules` is not present there; run `npm install` followed by `npm run build` on the development machine.
