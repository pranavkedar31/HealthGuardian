# HealthGuardian

**AI-Powered Smart Healthcare & Preventive Care Platform**

HealthGuardian is a full-stack healthcare platform combining a FastAPI backend
(clean architecture / repository pattern), a React + Tailwind frontend, and a
set of lightweight AI/ML modules for symptom checking, disease risk
prediction, diet/workout generation, medical report OCR + summarization, and
a wellness chatbot.

> ⚠️ **Not a medical device.** All AI outputs are advisory only and always
> recommend consulting a licensed healthcare professional. See
> [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for details on the AI
> modules and their limitations.


## Product scope — user-only

HealthGuardian is intentionally a **personal/user-focused preventive healthcare platform**. The user-facing application does not expose a doctor dashboard, doctor login, doctor management portal, patient-management dashboard, or admin workspace. Appointment requests are managed from the user's side only.

The premium frontend includes: Dashboard, My Health, Vitals, Symptom Checker, Diet & Workout, Medical Reports, Reminders, Appointments, AI Health Assistant, Health History, and Settings.

## Stack

| Layer      | Technology                                                        |
|------------|---------------------------------------------------------------------|
| Backend    | Python 3.12, FastAPI, SQLAlchemy 2.x, Alembic, Pydantic v2          |
| Database   | PostgreSQL (Neon in production), SQLite for tests                   |
| Auth       | JWT (python-jose), Passlib + bcrypt                                  |
| AI/ML      | scikit-learn, pandas, numpy, OpenAI API (optional), pytesseract      |
| Frontend   | React 18, Vite, Tailwind CSS, Axios, React Router                    |
| Infra      | Docker, docker-compose, GitHub Actions, Render, Vercel, Neon          |

## Quick Start

```bash
# Clone and configure
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# edit backend/.env — at minimum set SECRET_KEY and DATABASE_URL

# Run everything with Docker
docker-compose up --build
```

- Backend API: http://localhost:8000 (docs at `/docs`)
- Frontend: http://localhost:5173

See [`docs/INSTALLATION.md`](docs/INSTALLATION.md) for local (non-Docker) setup,
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for production deployment (Render +
Neon + Vercel), [`docs/API.md`](docs/API.md) for the API reference, and
[`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md) for a full file-by-file
map of the repository.

## Testing

```bash
cd backend
pytest --cov=app --cov-report=term-missing
```

The suite covers authentication, user management, health profiles, the AI
modules (symptom checker, risk predictor, BMI, diet/workout generation),
medical report upload/OCR/PDF generation, the chatbot, and an end-to-end
integration flow (register → login → health profile → predictions → report).
It runs against an isolated SQLite database — no external services required.

## Repository Layout

```
HealthGuardian/
├── backend/            # FastAPI application
├── frontend/            # React application
├── docs/               # Documentation
├── .devcontainer/       # VS Code Dev Container / Codespaces config
├── .github/workflows/  # CI/CD
├── docker-compose.yml
└── render.yaml
```

## License

Proprietary — internal project scaffold. Adjust before public release.

## Full AI Platform Upgrade v3

This source package includes the redesigned HealthGuardian frontend and Gemini-powered AI companion. See `UPGRADE_GUIDE_V3.md` for the complete feature list and Windows replacement instructions.

Gemini configuration:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.1-flash-lite
```
