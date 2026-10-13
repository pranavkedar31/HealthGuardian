# HealthGuardian API integrations

This build keeps API keys on the FastAPI backend and adds two useful integrations from the reference list.

## Recommended APIs for this project

| API | Use in HealthGuardian | Key required? |
|---|---|---|
| Gemini | Main multilingual AI health companion | Yes |
| Brevo | 6-digit OTP emails for forgot-password flow | Yes |
| Have I Been Pwned | Signed-in account email breach/security check | Yes |
| Wikipedia REST | Public educational lookup | No |
| DuckDuckGo Instant Answer | Public knowledge lookup | No |
| OpenWeather | Optional weather context | Yes |
| NewsData.io | Optional current health/wellness news | Yes |

Brevo is used for transactional password-reset email. HIBP is only called for the currently signed-in user's own email.

## Environment variables

Put these in `backend/.env`:

```env
GEMINI_API_KEY=your_existing_gemini_key
GEMINI_MODEL=gemini-3.1-flash-lite

# Password reset OTP
BREVO_API_KEY=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NAME=HealthGuardian

# Optional SMTP fallback
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=no-reply@healthguardian.app

OTP_EXPIRE_MINUTES=10
OTP_MAX_ATTEMPTS=5
OTP_RESEND_COOLDOWN_SECONDS=60

# Optional account-security check
HIBP_API_KEY=
HIBP_USER_AGENT=HealthGuardian-Security-Checker/1.0

# Optional project integrations
OPENWEATHER_API_KEY=
NEWSDATA_API_KEY=
```

Never put these keys in React/Vite files or commit them to GitHub.

## Password recovery flow

1. User opens **Forgot password?** on the login page.
2. User selects English, Hindi or Marathi.
3. User enters the registered email.
4. Backend creates a random 6-digit OTP and stores only its hash.
5. Brevo sends the OTP to the email (SMTP can be used as fallback).
6. User enters the OTP.
7. Backend verifies the OTP and issues a short-lived reset session token.
8. User creates a new password.
9. The reset session is invalidated and the user can log in with the new password.

The endpoint intentionally returns a generic message so it does not reveal whether an email address is registered.

## Have I Been Pwned

The Settings page includes **Check my email security**. It checks only the authenticated user's email and shows whether known breach records exist. It does not send or store the user's password.

Authenticated HIBP breach-by-account requests require the `hibp-api-key` and `user-agent` headers.

## Appointment feature

Appointment booking is intentionally not exposed in this build. The existing appointment database/model files are retained only for compatibility with an already-created database and are not mounted in the API router or shown in the user navigation.
