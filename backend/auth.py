import os
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from fastapi import Request, HTTPException, Depends
from bson import ObjectId
from db import db

JWT_ALG = "HS256"
ACCESS_TTL = timedelta(days=7)
REFRESH_TTL = timedelta(days=30)

ROLES = [
    "student", "teacher", "school_admin", "directorate_admin",
    "moderator", "admin", "super_admin",
]

ROLE_LABELS = {
    "student": "طالب",
    "teacher": "معلم",
    "school_admin": "مدير مدرسة",
    "directorate_admin": "مدير مديرية",
    "moderator": "مشرف محتوى",
    "admin": "مسؤول المنصة",
    "super_admin": "المسؤول الأعلى",
}

ALL_PERMISSIONS = [
    "book.create", "book.edit", "book.delete", "book.approve", "book.reject",
    "event.create", "event.edit", "event.delete", "event.approve",
    "competition.manage",
    "user.manage", "user.view", "role.manage",
    "school.manage", "school.view",
    "directorate.view",
    "student.view",
    "leaderboard.manage",
    "discussion.moderate", "discussion.create",
    "content.moderate", "report.manage",
    "news.manage", "activity.approve",
    "points.manage", "achievement.manage",
    "notification.broadcast",
    "cms.manage", "analytics.view", "audit.view",
    "club.manage",
]

_STUDENT = {"book.create", "discussion.create", "student.view"}
_TEACHER = _STUDENT | {"discussion.moderate", "event.create"}
_SCHOOL_ADMIN = _TEACHER | {"school.view", "student.view", "event.create", "activity.approve", "notification.broadcast"}
_DIR_ADMIN = _SCHOOL_ADMIN | {"directorate.view", "school.view", "analytics.view"}
_MODERATOR = {"content.moderate", "report.manage", "book.approve", "book.reject",
              "discussion.moderate", "activity.approve", "news.manage"}

ROLE_PERMISSIONS = {
    "student": _STUDENT,
    "teacher": _TEACHER,
    "school_admin": _SCHOOL_ADMIN,
    "directorate_admin": _DIR_ADMIN,
    "moderator": _MODERATOR,
    "admin": set(ALL_PERMISSIONS),
    "super_admin": set(ALL_PERMISSIONS),
}


def get_secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "type": "access",
               "exp": datetime.now(timezone.utc) + ACCESS_TTL}
    return jwt.encode(payload, get_secret(), algorithm=JWT_ALG)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "type": "refresh",
               "exp": datetime.now(timezone.utc) + REFRESH_TTL}
    return jwt.encode(payload, get_secret(), algorithm=JWT_ALG)


def effective_permissions(user: dict) -> set:
    perms = set(ROLE_PERMISSIONS.get(user.get("role", "student"), set()))
    perms |= set(user.get("extra_permissions", []))
    return perms


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="غير مصرح لك بالدخول")
    try:
        payload = jwt.decode(token, get_secret(), algorithms=[JWT_ALG])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="نوع الرمز غير صالح")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="المستخدم غير موجود")
        if user.get("status") == "banned":
            raise HTTPException(status_code=403, detail="تم حظر هذا الحساب")
        user["id"] = str(user["_id"])
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="انتهت صلاحية الجلسة")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="رمز غير صالح")


async def get_optional_user(request: Request):
    try:
        return await get_current_user(request)
    except HTTPException:
        return None


def require_permission(permission: str):
    async def checker(user: dict = Depends(get_current_user)):
        if permission not in effective_permissions(user):
            raise HTTPException(status_code=403, detail="ليس لديك صلاحية للقيام بهذا الإجراء")
        return user
    return checker


def require_role(*roles):
    async def checker(user: dict = Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="ليس لديك صلاحية للوصول")
        return user
    return checker
