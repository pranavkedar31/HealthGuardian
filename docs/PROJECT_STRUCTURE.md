# Project Structure

```
HealthGuardian/
├── backend/
│   ├── app/
│   │   ├── ai/                    # 6 AI/ML modules (pure logic, no DB/HTTP)
│   │   │   ├── bmi_calculator.py
│   │   │   ├── symptom_checker.py         # Naive Bayes
│   │   │   ├── risk_predictor.py          # 3x Logistic Regression
│   │   │   ├── diet_workout_generator.py  # rule-based
│   │   │   ├── chatbot.py                 # OpenAI wrapper + offline fallback
│   │   │   ├── ocr_engine.py              # pytesseract wrapper
│   │   │   └── report_analyzer.py         # summarizes OCR output
│   │   ├── api/v1/                # 13 route files + router.py aggregator
│   │   │   ├── auth.py, users.py, health_profile.py, symptoms.py,
│   │   │   │   predictions.py, diet.py, workout.py, chatbot.py,
│   │   │   │   reports.py, reminders.py, appointments.py, doctor.py, admin.py
│   │   │   └── router.py          # combines all routers under one APIRouter
│   │   ├── core/
│   │   │   ├── config.py          # pydantic-settings, reads .env
│   │   │   ├── security.py        # JWT + bcrypt hashing
│   │   │   └── deps.py            # get_current_user, require_role guards
│   │   ├── db/
│   │   │   ├── base_class.py      # Base, UUIDMixin, TimestampMixin
│   │   │   ├── session.py         # engine + SessionLocal + get_db
│   │   │   └── types.py           # GUID / StringArray cross-DB TypeDecorators
│   │   ├── middleware/
│   │   │   ├── rate_limit.py      # Redis sliding-window, fail-open
│   │   │   └── logging_middleware.py
│   │   ├── models/                # 11 SQLAlchemy models + __init__.py aggregator
│   │   │   ├── user.py                (UserRole enum)
│   │   │   ├── health_profile.py
│   │   │   ├── vitals_log.py
│   │   │   ├── symptom_log.py
│   │   │   ├── medical_report.py
│   │   │   ├── diet_plan.py
│   │   │   ├── workout_plan.py
│   │   │   ├── medicine_reminder.py
│   │   │   ├── appointment.py         (AppointmentStatus enum)
│   │   │   ├── chat_message.py
│   │   │   └── ai_log.py
│   │   ├── repositories/          # 11 model repos + base.py generic CRUD
│   │   ├── schemas/                # Pydantic v2 request/response models, 1 file per domain
│   │   ├── services/               # 12 services — business logic layer
│   │   ├── utils/
│   │   │   ├── otp.py             # OTP generation/verification
│   │   │   ├── email_utils.py     # SMTP sender, logs instead if unconfigured
│   │   │   ├── cloud_storage.py   # Cloudinary or local-disk fallback
│   │   │   └── pagination.py
│   │   ├── main.py                 # FastAPI app, middleware, static mount
│   │   └── seed.py                 # sample data seeding script
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/0001_initial.py   # 11 tables + 2 enum types
│   ├── tests/                      # pytest suite (see below)
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── pytest.ini
│   ├── ruff.toml
│   ├── Dockerfile
│   ├── gunicorn.conf.py            # production process config
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/                    # Axios modules, 1:1 with backend routers
│   │   ├── components/             # Navbar, Card, ProtectedRoute
│   │   ├── context/AuthContext.jsx
│   │   ├── pages/                  # Login, Register, Dashboard, + 7 feature pages
│   │   ├── App.jsx                 # route definitions
│   │   └── main.jsx                # entrypoint
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── Dockerfile                  # multi-stage: node build → nginx serve
│   ├── nginx.conf
│   └── vercel.json
├── docs/
│   ├── INSTALLATION.md
│   ├── DEPLOYMENT.md
│   ├── API.md
│   ├── ARCHITECTURE.md
│   └── PROJECT_STRUCTURE.md        # this file
├── .devcontainer/devcontainer.json
├── .github/workflows/ci.yml
├── docker-compose.yml
├── render.yaml
└── README.md
```

## Database Tables (11)

| Table                 | Purpose                                          | Key relationships |
|------------------------|---------------------------------------------------|--------------------|
| `users`                | Accounts; `role` ∈ patient/doctor/admin          | root of most FKs |
| `health_profiles`      | 1:1 per user — age, height, weight, allergies etc | `user_id` unique FK |
| `vitals_logs`          | Time-series vitals (HR, BP, sugar, SpO2, temp)   | `user_id` FK |
| `symptom_logs`         | Symptom checker submissions + AI result          | `user_id` FK |
| `medical_reports`      | Uploaded files + OCR text + AI summary           | `user_id` FK |
| `diet_plans`           | Generated diet plans (JSON meal breakdown)       | `user_id` FK |
| `workout_plans`        | Generated workout schedules (JSON)                | `user_id` FK |
| `medicine_reminders`   | Recurring medicine reminders                      | `user_id` FK |
| `appointments`         | Patient↔doctor bookings; `status` enum            | `patient_id`, `doctor_id` FKs (both → users) |
| `chat_messages`        | Chatbot conversation history                      | `user_id` FK |
| `ai_logs`               | Audit log of AI module calls (input/output/success) | `user_id` FK (nullable) |

## Test Suite (backend/tests/)

| File                    | Coverage |
|--------------------------|-----------|
| `conftest.py`            | SQLite test DB, TestClient, auth fixtures (patient/doctor/admin) |
| `test_auth.py`           | Registration, duplicate email, login, invalid password, JWT validation, protected routes, expired/refresh-token rejection |
| `test_users.py`          | Profile retrieval/update, password update |
| `test_health_profile.py` | Create, update, field validation |
| `test_symptoms.py`       | Symptom checker predictions + history |
| `test_predictions.py`    | Risk prediction, BMI, diet/workout generation |
| `test_chatbot.py`        | Chat messaging + offline fallback + history |
| `test_reports.py`        | Upload (text + image/OCR path), history, PDF generation |
| `test_api.py`            | End-to-end integration flow, general API checks, cross-cutting security/RBAC checks |
