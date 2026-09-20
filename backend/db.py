import os
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime, timezone

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def ser(doc):
    """Serialize a mongo document: _id(ObjectId) -> id(str). Drop sensitive fields."""
    if not doc:
        return doc
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    doc.pop("password_hash", None)
    return doc


def sers(docs):
    return [ser(d) for d in docs]


def oid(id_str):
    try:
        return ObjectId(id_str)
    except Exception:
        return None
