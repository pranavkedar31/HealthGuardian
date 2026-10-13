# HealthGuardian Security + Language Upgrade

## Added

- English / Hindi / Marathi selector on login and registration.
- Selected language is saved in `localStorage` as `hg_language`.
- Forgot-password link on login.
- Random 6-digit OTP password recovery.
- OTP expiry, attempt limit and resend cooldown.
- OTP is hashed in the database; the raw OTP is never stored.
- Brevo transactional email support, with SMTP fallback.
- New password page after successful OTP verification.
- Have I Been Pwned account-breach check in Settings.
- Gemini remains the primary AI provider.
- AI chat resource cards now create language-aware medicine, meditation, exercise and food video/image resources.
- Speech cleanup removes Markdown symbols and URLs before reading.
- Read-aloud can be stopped by clicking the same button again.
- Speech speed selector with slower options and automatic preference for a matching female browser voice when available.
- Appointment booking remains removed from the exposed product.

## Database migration

This upgrade adds:

`backend/alembic/versions/0002_password_reset_tokens.py`

After replacing the files, run:

```powershell
cd C:\Users\user\Desktop\HealthGuardian\backend
.env\Scripts\Activate.ps1
alembic upgrade head
```

Expected result:

```text
Running upgrade 0001_initial -> 0002_password_reset_tokens
```

## Email setup

Recommended:

```env
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=your_verified_sender@example.com
BREVO_SENDER_NAME=HealthGuardian
```

Brevo requires an API key and a registered/verified sender for transactional email.

Alternative SMTP:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
EMAIL_FROM=...
```

For local development only, if no mail provider is configured and `DEBUG=True`, the backend logs the OTP in the terminal. The OTP is not returned by the API.

## HIBP setup

Add:

```env
HIBP_API_KEY=your_hibp_api_key
HIBP_USER_AGENT=HealthGuardian-Security-Checker/1.0
```

Then log in and open **Settings -> Account security -> Check my email security**.

## Important medical-safety boundary

HealthGuardian can provide broad health education, symptom organization, medication information, lifestyle guidance, report explanations and preventive-care suggestions. It should not claim to diagnose, prescribe, or replace a licensed clinician. This is especially important for medication, emergency symptoms and treatment changes.
