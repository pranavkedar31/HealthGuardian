# API Documentation

Full interactive docs (auto-generated from the FastAPI schema) are always
available at `/docs` (Swagger UI) and `/redoc` on a running instance. This
file is a stable, human-browsable reference of the same surface.

Base URL: `/api/v1`. All endpoints except `auth/register` and `auth/login`
require `Authorization: Bearer <access_token>`.

## Authentication — `/auth`

| Method | Path              | Auth | Description                          |
|--------|-------------------|------|----------------------------------------|
| POST   | `/auth/register`  | No   | Create a new user account            |
| POST   | `/auth/login`     | No   | Exchange email/password for JWT tokens |
| GET    | `/auth/me`        | Yes  | Get the current authenticated user   |

`POST /auth/register` body: `{full_name, email, password, role?}` (role
defaults to `patient`; password must contain a letter and a digit, 8+ chars).

`POST /auth/login` body: `{email, password}` → `{access_token, refresh_token, token_type}`.
Access tokens expire in 24h, refresh tokens in 7 days (configurable via env).

## Users — `/users`

| Method | Path             | Description                  |
|--------|------------------|--------------------------------|
| GET    | `/users/me`      | Get own profile              |
| PUT    | `/users/me`      | Update `full_name`/`phone`   |
| PUT    | `/users/me/password` | Change password (requires current password) |

## Health Profile — `/health-profile`

| Method | Path              | Description                              |
|--------|-------------------|--------------------------------------------|
| POST   | `/health-profile` | Create (409 if one already exists)       |
| GET    | `/health-profile` | Get own profile (`null` if none created) |
| PUT    | `/health-profile` | Update (404 if none exists)              |

Fields: `age, gender, height_cm, weight_kg, blood_group, allergies[], chronic_conditions[], smoking, alcohol`.

## Symptom Checker — `/symptoms`

| Method | Path               | Description                               |
|--------|--------------------|---------------------------------------------|
| POST   | `/symptoms/check`  | Run the ML symptom checker, logs the result |
| GET    | `/symptoms/history`| List past symptom checks                  |

`POST /symptoms/check` body: `{symptoms: string[], notes?}` → `{predicted_condition, confidence, severity, recommendation}`.

## AI Predictions — `/predictions`

| Method | Path                | Description                                    |
|--------|---------------------|---------------------------------------------------|
| POST   | `/predictions/risk` | Disease risk (diabetes/heart/hypertension)      |
| POST   | `/predictions/bmi`  | BMI calculation                                 |

`POST /predictions/risk` body: `{age, bmi, blood_pressure_systolic, blood_sugar, smoking, alcohol}`
→ `{diabetes_risk, heart_disease_risk, hypertension_risk, risk_level}` (percentages, `risk_level` ∈ low/moderate/high).

`POST /predictions/bmi` body: `{height_cm, weight_kg}` → `{bmi, category}`.

## Diet & Workout — `/diet`, `/workout`

| Method | Path              | Description                                    |
|--------|-------------------|---------------------------------------------------|
| POST   | `/diet/generate`  | Generate a calorie/macro plan from goal + profile |
| GET    | `/diet/history`   | List generated diet plans                       |
| POST   | `/workout/generate` | Generate a weekly exercise schedule           |
| GET    | `/workout/history`  | List generated workout plans                  |

## Chatbot — `/chatbot`

| Method | Path              | Description                                        |
|--------|-------------------|-------------------------------------------------------|
| POST   | `/chatbot/message`| Send a message, get an AI reply (offline fallback if no `OPENAI_API_KEY`) |
| GET    | `/chatbot/history`| List the full conversation history                |

## Medical Reports — `/reports`

| Method | Path                    | Description                                          |
|--------|-------------------------|---------------------------------------------------------|
| POST   | `/reports/upload`       | Upload a file (multipart) — OCR + AI summary for images |
| GET    | `/reports/history`      | List uploaded reports                                |
| GET    | `/reports/{id}/pdf`     | Download a generated PDF summary                     |

## Medicine Reminders — `/reminders`

| Method | Path                  | Description         |
|--------|-----------------------|-------------------------|
| POST   | `/reminders`          | Create a reminder   |
| GET    | `/reminders`          | List own reminders  |
| PUT    | `/reminders/{id}`     | Update a reminder   |
| DELETE | `/reminders/{id}`     | Delete a reminder   |

## Appointments — `/appointments`

| Method | Path                    | Description             |
|--------|-------------------------|----------------------------|
| POST   | `/appointments`         | Book an appointment     |
| GET    | `/appointments`         | List own appointments   |
| PUT    | `/appointments/{id}`    | Update/reschedule/cancel |

## Doctor — `/doctor` (role: doctor/admin)

| Method | Path                    | Description                       |
|--------|-------------------------|--------------------------------------|
| GET    | `/doctor/appointments`  | List appointments assigned to self |

## Admin — `/admin` (role: admin)

| Method | Path                          | Description         |
|--------|-------------------------------|-------------------------|
| GET    | `/admin/users`                | List all users      |
| PUT    | `/admin/users/{id}/deactivate`| Deactivate a user    |

## Error Format

FastAPI's standard shape: `{"detail": "..."}` for most errors, or
`{"detail": [{"loc": [...], "msg": "...", "type": "..."}]}` for 422 validation
errors. Status codes used: `400` (bad request, e.g. wrong password), `401`
(missing/invalid/expired token), `403` (wrong role), `404` (not found), `409`
(conflict, e.g. duplicate email or profile), `422` (validation).
