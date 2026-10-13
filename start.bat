@echo off
title HealthGuardian Launcher
echo ========================================================
echo       HealthGuardian - Starting Backend & Frontend
echo ========================================================

REM 1. Start Backend in a separate window
echo Starting FastAPI Backend on http://localhost:8000 ...
start "HealthGuardian Backend" cmd /k "cd /d %~dp0backend && call .\venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

REM 2. Wait a moment for backend to initialize
timeout /t 3 /nobreak >nul

REM 3. Start Frontend in a separate window
echo Starting Vite Frontend on http://localhost:5173 ...
start "HealthGuardian Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================================
echo HealthGuardian is launching!
echo Backend Docs:  http://localhost:8000/docs
echo Frontend Web:  http://localhost:5173
echo ========================================================
echo Press any key to exit this launcher window (servers keep running)...
pause >nul
