"""
HealthGuardian FastAPI application entrypoint.
"""
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import settings
from app.middleware.logging_middleware import LoggingMiddleware
from app.middleware.rate_limit import RateLimitMiddleware
from app.services.reminder_scheduler import (
    start_reminder_scheduler,
    stop_reminder_scheduler,
)

logging.basicConfig(level=logging.INFO if not settings.DEBUG else logging.DEBUG)

# Resolve uploads dir as an absolute path regardless of CWD the process is
# launched from (app/main.py -> backend/)
BACKEND_ROOT = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BACKEND_ROOT / settings.UPLOAD_DIR
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    start_reminder_scheduler()

    yield

    stop_reminder_scheduler()
app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan,
    description="AI-Powered Smart Healthcare & Preventive Care Platform",
    version="1.0.0",
    debug=settings.DEBUG,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(LoggingMiddleware)
app.add_middleware(RateLimitMiddleware)

app.mount(f"/{settings.UPLOAD_DIR}", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["Health Check"])
def root():
    return {"status": "ok", "service": settings.PROJECT_NAME, "environment": settings.ENVIRONMENT}


@app.get("/health", tags=["Health Check"])
def health_check():
    return {"status": "healthy"}


@app.get("/api/ai/health", tags=["Health Check"])
def direct_ai_health():
    from app.ai.provider_manager import get_ai_provider_manager
    return get_ai_provider_manager().check_health()


@app.get("/api/whatsapp/health", tags=["Health Check"])
def direct_whatsapp_health():
    from app.services.whatsapp_service import check_whatsapp_health
    return check_whatsapp_health()
