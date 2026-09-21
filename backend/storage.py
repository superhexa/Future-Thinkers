"""Deployment-neutral file storage adapter.

Files are stored in the local uploads directory. Configure a durable mounted
volume or replace this module with a Vercel Blob adapter for production.
"""
import os
import uuid
from pathlib import Path

MAX_SIZE = 50 * 1024 * 1024
MIME_EXT = {
    "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg",
    "image/jpg": "jpg", "image/webp": "webp", "video/mp4": "mp4",
}
UPLOAD_ROOT = Path(os.environ.get("UPLOAD_DIR", "uploads"))


def _safe_path(path: str) -> Path:
    candidate = (UPLOAD_ROOT / path).resolve()
    if UPLOAD_ROOT.resolve() not in candidate.parents:
        raise ValueError("Invalid storage path")
    return candidate


def save_file(data: bytes, filename: str, content_type: str, user_id: str, folder: str = "uploads") -> dict:
    if len(data) > MAX_SIZE:
        raise ValueError("File exceeds the 50MB limit")
    ext = MIME_EXT.get(content_type, filename.rsplit(".", 1)[-1] if "." in filename else "bin")
    relative = Path(folder) / str(user_id) / f"{uuid.uuid4().hex}.{ext}"
    destination = _safe_path(str(relative))
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(data)
    return {
        "storage_path": str(relative),
        "size": len(data),
        "content_type": content_type,
        "original_name": filename,
        "provider": "local",
    }


def read_file(path: str):
    file_path = _safe_path(path)
    return file_path.read_bytes(), "application/octet-stream"


async def _mirror_telegram(data: bytes, filename: str, content_type: str) -> dict:
    return {}


def init_storage(force: bool = False):
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    return str(UPLOAD_ROOT)


def _put(path: str, data: bytes, content_type: str) -> dict:
    destination = _safe_path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(data)
    return {"path": path, "size": len(data)}


def _get(path: str):
    return read_file(path)
