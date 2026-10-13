# Architecture

## Overview

HealthGuardian's backend follows **clean architecture / repository pattern**:
each layer only knows about the layer directly below it, so business logic
never touches the ORM directly and route handlers never touch the database
directly.

```
API Router (app/api/v1/*.py)
   │  parses request, calls service, returns response_model
   ▼
Service (app/services/*.py)
   │  business logic, orchestrates repositories + AI modules
   ▼
Repository (app/repositories/*.py)
   │  translates to/from SQLAlchemy queries
   ▼
Model (app/models/*.py)  ←→  PostgreSQL / SQLite
```

Cross-cutting layers used by services:
- **AI modules** (`app/ai/*.py`) — pure functions/classes, no DB or HTTP
  awareness, so they're independently testable and reusable.
- **Schemas** (`app/schemas/*.py`) — Pydantic v2 models for request
  validation and response serialization; never the same objects as the
  SQLAlchemy models.
- **Core** (`app/core/*.py`) — config, security (JWT/hashing), and FastAPI
  dependency wiring (`deps.py`) shared across all routers.

## Why the repository pattern

Every model has a matching repository extending `BaseRepository[ModelType]`
(generic CRUD: `get`, `list`, `create`, `update`, `delete`), with model-specific
query methods added on top (e.g. `UserRepository.get_by_email`,
`SymptomRepository.list_by_user`). Services depend on repositories, never on
`Session` or `select()` directly — this keeps business logic testable without
a real database and keeps query logic in one place per model.

## AI Modules

| Module                     | Type                          | Notes |
|-----------------------------|-------------------------------|-------|
| `bmi_calculator.py`        | Deterministic formula          | No ML — division and thresholds |
| `symptom_checker.py`       | Multinomial Naive Bayes (scikit-learn) | Trained at import time on a small embedded symptom→condition dataset. Advisory only. |
| `risk_predictor.py`        | 3× Logistic Regression (scikit-learn) | Independent models for diabetes/heart disease/hypertension, trained on synthesized data reflecting standard clinical risk-factor directionality. Educational/demo risk scoring, not a diagnostic tool. |
| `diet_workout_generator.py`| Rule-based (Mifflin-St Jeor BMR + heuristics) | No ML — deterministic nutrition/exercise-science formulas |
| `chatbot.py`               | OpenAI API wrapper             | Falls back to a canned, doctor-referral response if `OPENAI_API_KEY` is unset — the app is fully functional/testable without an API key |
| `ocr_engine.py`            | pytesseract + Pillow           | Degrades gracefully (returns a placeholder string) if the Tesseract binary isn't installed on the host |
| `report_analyzer.py`       | OpenAI API wrapper (via chatbot.py) | Same offline fallback behavior as chatbot |

**Every AI module is designed to degrade gracefully rather than throw** —
missing API keys or the OCR binary reduce functionality but never crash a
request. This was a deliberate choice so the app (and its test suite) works
identically in CI, in a sandbox, and in production.

## Cross-Database Portability (`app/db/types.py`)

Production runs on PostgreSQL (Neon) and uses native `UUID` and `ARRAY`
column types. The test suite runs on SQLite for speed and zero external
dependencies — but SQLite has neither type. Rather than maintain two sets of
models, `app/db/types.py` defines `GUID` and `StringArray`
`TypeDecorator`s that detect the SQLAlchemy dialect at bind/result time:
native Postgres types in production, CHAR(36)/JSON fallbacks on SQLite. Every
model uses these instead of importing `sqlalchemy.dialects.postgresql`
directly, so the exact same model definitions produce correct, idiomatic
schemas on both databases.

## Authentication & Authorization

- Passwords hashed with **bcrypt** via **passlib**. `bcrypt` is deliberately
  pinned to `4.0.1` — `passlib==1.7.4` reads bcrypt's internal
  `__about__.__version__` to detect the backend, and `bcrypt>=4.1` removed
  that attribute, breaking passlib's detection. This is a known, real
  compatibility issue, not a theoretical one.
- **JWT** access tokens (24h default) and refresh tokens (7d default), signed
  with `HS256` and a configured `SECRET_KEY`. Access tokens carry a `role`
  claim so route guards don't need a DB round-trip to check role, though the
  current user is still fetched from the DB on every request via
  `get_current_user` to check `is_active`.
- **Role-based access** via `app/core/deps.py`'s `require_role(*roles)`
  factory — `require_doctor` and `require_admin` are pre-built instances used
  directly as route dependencies.

## Database Schema

11 tables, 2 native PostgreSQL enum types (`user_role`, `appointment_status`).
See `alembic/versions/0001_initial.py` for the authoritative DDL, or
[`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md) for a table-by-table summary.

## Middleware

- **Rate limiting** (`app/middleware/rate_limit.py`) — Redis-backed sliding
  window. **Fails open**: if Redis is unreachable or `RATE_LIMIT_ENABLED=false`,
  requests pass through uninterrupted rather than the app breaking because a
  cache is down.
- **Request logging** (`app/middleware/logging_middleware.py`) — structured
  method/path/status/duration logging for every request.

## Frontend Architecture

Standard React SPA: `AuthContext` holds the current user and exposes
`login`/`register`/`logout`; `ProtectedRoute` redirects unauthenticated users
to `/login`; a single Axios instance (`api/client.js`) attaches the JWT to
every request via an interceptor and redirects to `/login` on any `401`.
Feature pages (`SymptomChecker`, `HealthProfile`, `DietWorkout`, etc.) are
each backed by a matching `api/*.js` module mapping 1:1 to a backend router.
