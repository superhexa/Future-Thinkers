"""Storage abstraction over Emergent Object Storage (deployment-safe).
DB is the source of truth for metadata. If TELEGRAM_BOT_TOKEN + TELEGRAM_GROUP_ID
are set, files are additionally mirrored to a Telegram group for durable off-site
backup. Providers can be swapped without touching the rest of the app."""
import os
import uuid
import logging
import requests

logger = logging.getLogger(__name__)

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "future-thinkers"

MAX_SIZE = 50 * 1024 * 1024  # 50MB
MIME_EXT = {
    "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg",
    "image/jpg": "jpg", "image/webp": "webp", "video/mp4": "mp4",
}

_storage_key = None


def init_storage(force: bool = False):
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def _put(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def _get(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


async def _mirror_telegram(data: bytes, filename: str, content_type: str) -> dict:
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat = os.environ.get("TELEGRAM_GROUP_ID")
    if not token or not chat:
        return {}
    try:
        url = f"https://api.telegram.org/bot{token}/sendDocument"
        files = {"document": (filename, data, content_type)}
        res = requests.post(url, data={"chat_id": chat}, files=files, timeout=120).json()
        if res.get("ok"):
            result = res["result"]
            doc = result.get("document") or {}
            return {"telegram_file_id": doc.get("file_id"), "telegram_message_id": result.get("message_id")}
        return {"telegram_error": str(res)}
    except Exception as e:
        return {"telegram_error": str(e)}


async def save_file(data: bytes, filename: str, content_type: str, user_id: str, folder: str = "uploads") -> dict:
    ext = MIME_EXT.get(content_type, (filename.rsplit(".", 1)[-1] if "." in filename else "bin"))
    path = f"{APP_NAME}/{folder}/{user_id}/{uuid.uuid4().hex}.{ext}"
    result = _put(path, data, content_type)
    meta = {
        "storage_path": result["path"],
        "size": result.get("size", len(data)),
        "content_type": content_type,
        "original_name": filename,
        "provider": "emergent",
    }
    meta.update(await _mirror_telegram(data, filename, content_type))
    return meta


def read_file(path: str):
    return _get(path)
