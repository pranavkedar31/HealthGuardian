# Installation Guide

## Prerequisites

- Python 3.12+
- Node.js 20+ and npm
- PostgreSQL 16 (or a Neon account) — or Docker, which provisions it for you
- (Optional) Redis — for rate limiting; the app runs fine without it (fail-open)
- (Optional) Tesseract OCR binary — for medical report OCR (`sudo apt install tesseract-ocr` / `brew install tesseract`)

## Option A — Docker (recommended)

```bash
git clone <repo-url> HealthGuardian
cd HealthGuardian
cp backend/.env.example backend/.env   # edit SECRET_KEY at minimum
docker-compose up --build
```

This starts Postgres, Redis, the backend (with migrations run automatically),
and the frontend, all networked together. Backend: http://localhost:8000,
Frontend: http://localhost:5173.

## Option B — Manual local setup

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env:
#   - Set SECRET_KEY (generate with: python -c "import secrets; print(secrets.token_urlsafe(48))")
#   - Set DATABASE_URL to your local Postgres or a Neon connection string

# Run migrations
alembic upgrade head

# (Optional) seed sample data
python -m app.seed

# Start the dev server
uvicorn app.main:app --reload
```

The API is now live at http://localhost:8000, interactive docs at
http://localhost:8000/docs.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # set VITE_API_BASE_URL if not using the default
npm run dev
```

Frontend dev server: http://localhost:5173.

## Running Tests

```bash
cd backend
pytest                                    # full suite
pytest tests/test_auth.py -v              # a single file
pytest --cov=app --cov-report=term-missing  # with coverage
```

Tests run against an isolated SQLite database created fresh per session — no
external services required, and your development Postgres database is never
touched.

## Common Issues

**`passlib`/`bcrypt` error on first password hash**
This project pins `bcrypt==4.0.1` in `requirements.txt` specifically because
`passlib==1.7.4` reads bcrypt's internal version attribute to detect the
backend, and `bcrypt>=4.1` removed that attribute. If you see a "password
cannot be longer than 72 bytes" or backend-detection error, check that
`bcrypt==4.0.1` is actually installed (`pip show bcrypt`) and not overridden
by another dependency.

**`ARRAY`/`UUID` errors when testing against SQLite**
The models use `app/db/types.py`'s `GUID`/`StringArray` TypeDecorators
specifically so this doesn't happen — they transparently use native
PostgreSQL types in production and CHAR(36)/JSON fallbacks on SQLite. If
you're extending the schema, use these types (not `sqlalchemy.dialects.postgresql.UUID`/`ARRAY`
directly) for any new columns you want covered by the test suite.

**OCR returns an "OCR unavailable" message**
Install the Tesseract binary on your OS (it's a separate system package from
the `pytesseract` Python wrapper). The app degrades gracefully without it —
uploads still work, just without extracted text.
