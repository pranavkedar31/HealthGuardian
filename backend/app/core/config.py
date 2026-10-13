"""Application configuration loaded from environment variables / .env."""
from functools import lru_cache
from typing import List, Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BACKEND_DIR / ".env"

class Settings(BaseSettings):
    model_config=SettingsConfigDict(env_file=str(ENV_PATH) if ENV_PATH.exists() else ".env",env_file_encoding="utf-8",case_sensitive=True,extra="ignore")
    PROJECT_NAME:str="HealthGuardian"; API_V1_PREFIX:str="/api/v1"; ENVIRONMENT:str="development"; DEBUG:bool=True
    SECRET_KEY:str="CHANGE_ME_IN_PRODUCTION_32CHARS_MIN"; ALGORITHM:str="HS256"; ACCESS_TOKEN_EXPIRE_MINUTES:int=1440; REFRESH_TOKEN_EXPIRE_MINUTES:int=10080
    DATABASE_URL:str="postgresql+psycopg2://postgres:postgres@localhost:5432/healthguardian"; DATABASE_URL_SYNC_TEST:str="sqlite:///./test.db"; SQL_ECHO:bool=False
    REDIS_URL:str="redis://localhost:6379/0"; RATE_LIMIT_ENABLED:bool=True; RATE_LIMIT_REQUESTS:int=100; RATE_LIMIT_WINDOW_SECONDS:int=60
    BACKEND_CORS_ORIGINS:List[str]=["http://localhost:5173","http://localhost:3000"]
    @field_validator("BACKEND_CORS_ORIGINS",mode="before")
    @classmethod
    def assemble_cors_origins(cls,v):
        if isinstance(v,str) and not v.startswith("["): return [i.strip() for i in v.split(",")]
        return v
    SMTP_HOST:Optional[str]=None; SMTP_PORT:int=587; SMTP_USER:Optional[str]=None; SMTP_PASSWORD:Optional[str]=None; EMAIL_FROM:str="no-reply@healthguardian.app"
    BREVO_API_KEY:Optional[str]=None; BREVO_SENDER_EMAIL:Optional[str]=None; BREVO_SENDER_NAME:str="HealthGuardian"
    OTP_EXPIRE_MINUTES:int=10; OTP_MAX_ATTEMPTS:int=5; OTP_RESEND_COOLDOWN_SECONDS:int=60
    HIBP_API_KEY:Optional[str]=None; HIBP_USER_AGENT:str="HealthGuardian-Security-Checker/1.0"
    OPENAI_API_KEY:Optional[str]=None; OPENAI_MODEL:str="gpt-4o-mini"
    GEMINI_API_KEY:Optional[str]=None; GEMINI_MODEL:str="gemini-3.1-flash-lite"
    GROQ_API_KEY:Optional[str]=None; GROQ_MODEL:str="llama-3.3-70b-versatile"
    AI_PRIMARY_PROVIDER:str="gemini"; AI_FALLBACK_PROVIDER:str="groq"
    AI_TIMEOUT_SECONDS:int=25; AI_MAX_RETRIES:int=1
    OPENWEATHER_API_KEY:Optional[str]=None; NEWSDATA_API_KEY:Optional[str]=None
    CLOUDINARY_CLOUD_NAME:Optional[str]=None; CLOUDINARY_API_KEY:Optional[str]=None; CLOUDINARY_API_SECRET:Optional[str]=None
    UPLOAD_DIR:str="uploads"; MAX_UPLOAD_SIZE_MB:int=10
    WHATSAPP_ACCESS_TOKEN: Optional[str] = None
    WHATSAPP_PHONE_NUMBER_ID: Optional[str] = None
    WHATSAPP_API_VERSION: str = "v23.0"
    DOCTOR_REGISTRATION_CODE: str = "DOCT2026"

@lru_cache
def get_settings()->"Settings": return Settings()
settings=get_settings()
