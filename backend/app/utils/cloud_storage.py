"""
File storage utility — uses Cloudinary if configured, otherwise falls
back to local disk storage under settings.UPLOAD_DIR.

Paths are resolved relative to this file's location (app/utils/..), so
behavior is identical regardless of the process's current working
directory.
"""
import os
import uuid
from pathlib import Path

from app.core.config import settings

# backend/app/utils/../.. -> backend/
BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent


def _local_upload_dir() -> Path:
    upload_dir = BACKEND_ROOT / settings.UPLOAD_DIR
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir


def upload_file(file_bytes: bytes, filename: str) -> str:
    if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY:
        try:
            import cloudinary
            import cloudinary.uploader

            cloudinary.config(
                cloud_name=settings.CLOUDINARY_CLOUD_NAME,
                api_key=settings.CLOUDINARY_API_KEY,
                api_secret=settings.CLOUDINARY_API_SECRET,
            )
            result = cloudinary.uploader.upload(file_bytes, resource_type="auto")
            return result["secure_url"]
        except Exception:
            pass  # fall through to local storage

    ext = Path(filename).suffix
    unique_name = f"{uuid.uuid4().hex}{ext}"
    dest = _local_upload_dir() / unique_name
    with open(dest, "wb") as f:
        f.write(file_bytes)
    return f"/{settings.UPLOAD_DIR}/{unique_name}"
