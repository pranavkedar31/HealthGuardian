# HealthGuardian — Full AI Platform Upgrade v3

This version upgrades the **entire existing HealthGuardian application**, not only the chatbot. The original backend/API/database structure is preserved so the existing PostgreSQL + Alembic setup can continue to be used.

## Major UI/feature upgrades

- New HealthGuardian visual system across dashboard, profile, vitals, symptoms, diet/workout, reports, reminders, appointments, history and settings.
- New **Health Insights** page with wellness-oriented score, BMI snapshot, vitals summary and risk-screening workflow.
- New **Medicine Guide** page with Gemini-powered general medicine education, visual reference search and video resources.
- Expanded dashboard with health pulse, quick actions, reminders and preventive focus.
- Expanded health profile with allergies and chronic-condition context.
- Vitals trend visualization and summary cards.
- Symptom triage-style presentation and emergency warning flow.
- Report library redesigned for upload, summary and PDF download.
- Reminder activation/deactivation controls.
- Appointment preparation section.
- Health timeline now includes vitals, symptoms, reports, diet and workout activity.
- Settings now include English/Hindi/Marathi preference.
- AI companion supports English, Hindi and Marathi selection.
- Read-aloud cleans Markdown symbols and supports Stop on second click.
- AI chatbot can return video/image resource cards; medicine image references use Wikimedia Commons search and videos use YouTube search pages.

## Gemini configuration

Keep your existing `backend/.env` and replace only the key/model values if needed:

```env
GEMINI_API_KEY=YOUR_ACTUAL_KEY
GEMINI_MODEL=gemini-3.1-flash-lite
```

The project no longer hardcodes the old Gemini model in the chatbot.

## Important

This package intentionally does **not** include:

- your private `backend/.env`
- Python `venv`
- frontend `node_modules`
- Python bytecode caches

Run dependency installation on your Windows machine using your existing environment.

Backend:

```powershell
cd C:\Users\user\Desktop\HealthGuardian\backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:

```powershell
cd C:\Users\user\Desktop\HealthGuardian\frontend
npm install
npm run dev
```

## Database

Do not delete your PostgreSQL database. The existing project migration history is preserved. Since the UI upgrade is mostly presentation and uses existing endpoints, there is no destructive database reset required.

## Medical safety

HealthGuardian is designed as an AI preventive-health companion. It can explain health information, organize symptoms, summarize reports, discuss general medicine information and generate lifestyle guidance, but it should not be presented as a replacement for a licensed clinician or as a system that issues personalized prescriptions.
