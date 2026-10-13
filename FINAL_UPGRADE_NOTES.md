# HealthGuardian Final Upgrade Notes

This package is based on the current HealthGuardian project supplied by the user.

## Included fixes

1. Appointment booking is removed from the patient UI and frontend routing. No doctor dashboard is required.
2. Forgot-password flow now waits for confirmed email delivery before moving to OTP verification.
3. Brevo OTP delivery status and resend cooldown are handled more clearly.
4. Existing Brevo configuration remains supported. Do not put API keys in source control.
5. HIBP breach checking remains optional; the application works without an HIBP key.
6. Chatbot speech removes Markdown symbols, URLs and formatting before speaking.
7. Long chatbot answers are split into short speech chunks so browser text-to-speech is easier to understand.
8. Speech defaults to a slower rate and attempts to select a female voice when the operating system/browser provides one for the selected language.
9. Clicking Read aloud again stops the current speech and clears the queued chunks.
10. Chat resource image cards use a backend Wikimedia Commons image lookup so medicine/meditation reference images are more reliable.
11. Video resources remain language-aware YouTube educational-resource links.
12. English, Hindi and Marathi remain available from authentication pages, global navigation and the AI companion.

## Important environment variables

Configure these in `backend/.env` on the local machine. This upgrade package intentionally does not contain the real `.env` file.

- `GEMINI_API_KEY`
- `GEMINI_MODEL=gemini-3.1-flash-lite`
- `BREVO_API_KEY`
- `BREVO_SENDER_EMAIL`
- `BREVO_SENDER_NAME=HealthGuardian`
- `HIBP_API_KEY` (optional)
- `HIBP_USER_AGENT=HealthGuardian-Security-Checker/1.0`

## Run after replacement

Backend:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

The database schema is unchanged by this upgrade, so no new Alembic migration is required.
