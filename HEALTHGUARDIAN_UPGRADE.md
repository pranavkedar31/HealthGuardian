# HealthGuardian chatbot upgrade

This version updates the chatbot to Google Gemini (`gemini-3.1-flash-lite`), adds English/Hindi/Marathi selection, automatic language detection, contextual resource cards, medicine information cards, video search links, and browser read-aloud.

## Before running
1. In `backend/.env`, keep your existing PostgreSQL and other settings.
2. Add: `GEMINI_API_KEY=your_key_here` and replace it locally with your own Gemini API key.
3. Do not commit the real API key.
4. Backend: activate the Python 3.11 venv and run `pip install -r requirements.txt`.
5. Start backend with `python -m uvicorn app.main:app --reload` from `backend`.
6. Frontend: run `npm install` once, then `npm run dev`.

No database migration is required for the chatbot changes.
