from fastapi import APIRouter, HTTPException, Depends, Request
from db import db, ser, sers, oid, now_iso
from auth import get_current_user, effective_permissions

router = APIRouter(prefix="/api")


# ---------------- Notifications ----------------
@router.get("/notifications")
async def list_notifications(user: dict = Depends(get_current_user), limit: int = 40):
    docs = await db.notifications.find({"user_id": user["id"]}).sort("created_at", -1).limit(limit).to_list(limit)
    return sers(docs)


@router.get("/notifications/unread-count")
async def unread_count(user: dict = Depends(get_current_user)):
    n = await db.notifications.count_documents({"user_id": user["id"], "read": False})
    return {"count": n}


@router.post("/notifications/{nid}/read")
async def read_notification(nid: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"_id": oid(nid), "user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


@router.post("/notifications/read-all")
async def read_all(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"], "read": False}, {"$set": {"read": True}})
    return {"ok": True}


# ---------------- Public stats (landing) ----------------
@router.get("/stats/public")
async def public_stats():
    return {
        "students": await db.users.count_documents({"role": "student"}),
        "schools": await db.schools.count_documents({}),
        "books": await db.books.count_documents({"status": "approved"}),
        "events": await db.events.count_documents({"status": "published"}),
        "discussions": await db.discussions.count_documents({}),
        "directorates": await db.directorates.count_documents({}),
        "governorates": await db.governorates.count_documents({}),
        "chess_games": await db.chess_games.count_documents({}),
        "competitions": await db.competitions.count_documents({}),
    }


@router.get("/landing/cms")
async def landing_cms():
    s = await db.settings.find_one({"key": "landing_cms"})
    return (s or {}).get("value", {})


# ---------------- Global Search ----------------
@router.get("/search")
async def global_search(q: str, request: Request):
    if not q or len(q) < 2:
        return {"books": [], "discussions": [], "events": [], "students": [], "schools": []}
    rx = {"$regex": q, "$options": "i"}
    books = await db.books.find({"status": "approved", "$or": [{"title": rx}, {"author": rx}]}).limit(6).to_list(6)
    discussions = await db.discussions.find({"title": rx}).limit(6).to_list(6)
    events = await db.events.find({"status": "published", "title": rx}).limit(6).to_list(6)
    schools = await db.schools.find({"name": rx}).limit(6).to_list(6)
    students = await db.users.find({"role": "student", "name": rx}).limit(6).to_list(6)
    return {
        "books": [{"id": str(b["_id"]), "title": b["title"], "author": b["author"], "cover_url": b.get("cover_url")} for b in books],
        "discussions": [{"id": str(d["_id"]), "title": d["title"], "category": d.get("category")} for d in discussions],
        "events": [{"id": str(e["_id"]), "title": e["title"], "date": e.get("date")} for e in events],
        "schools": [{"id": str(s["_id"]), "name": s["name"], "governorate_name": s.get("governorate_name")} for s in schools],
        "students": [{"id": str(u["_id"]), "name": u["name"], "school_name": u.get("school_name"), "level": u.get("level", 1)} for u in students],
    }


# ---------------- Public profile ----------------
@router.get("/users/{uid}/profile")
async def public_profile(uid: str):
    u = await db.users.find_one({"_id": oid(uid)})
    if not u:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    privacy = u.get("privacy", {})
    rank = await db.users.count_documents({"role": "student", "xp": {"$gt": u.get("xp", 0)}}) + 1
    achievements = await db.achievements.find({"key": {"$in": u.get("achievements", [])}}).to_list(100)
    return {
        "id": str(u["_id"]), "name": u["name"], "role": u.get("role"),
        "avatar_url": u.get("avatar_url"), "bio": u.get("bio"),
        "school_name": u.get("school_name") if privacy.get("show_school", True) else None,
        "directorate_name": u.get("directorate_name") if privacy.get("show_school", True) else None,
        "governorate_name": u.get("governorate_name"),
        "xp": u.get("xp", 0), "level": u.get("level", 1), "level_title": u.get("level_title"),
        "national_rank": rank, "streak": u.get("streak", 0),
        "chess_rating": u.get("chess_rating", 1200),
        "badges": u.get("badges", []),
        "achievements": [{"key": a["key"], "title": a["title"], "icon": a.get("icon"), "badge": a.get("badge")} for a in achievements],
        "stats": u.get("stats", {}) if privacy.get("show_activity", True) else {},
    }


# ---------------- Student dashboard aggregate ----------------
@router.get("/dashboard")
async def dashboard(user: dict = Depends(get_current_user)):
    uid = user["id"]
    rank = await db.users.count_documents({"role": "student", "xp": {"$gt": user.get("xp", 0)}}) + 1
    school_rank = None
    if user.get("school_id"):
        school_rank = await db.users.count_documents({"role": "student", "school_id": user["school_id"], "xp": {"$gt": user.get("xp", 0)}}) + 1
    reading = await db.reading_progress.find({"user_id": uid}).sort("updated_at", -1).limit(3).to_list(3)
    reading_out = []
    for p in reading:
        b = await db.books.find_one({"_id": oid(p["book_id"])})
        if b:
            reading_out.append({"id": str(b["_id"]), "title": b["title"], "author": b["author"],
                                "cover_url": b.get("cover_url"), "progress": p.get("percent", 0)})
    events = await db.events.find({"status": "published"}).sort("date", 1).limit(3).to_list(3)
    competitions = await db.competitions.find({"status": "open"}).sort("start_at", -1).limit(3).to_list(3)
    chess_challenges = await db.chess_challenges.count_documents({"opponent_id": uid, "status": "pending"})
    unread = await db.notifications.count_documents({"user_id": uid, "read": False})
    return {
        "xp": user.get("xp", 0), "level": user.get("level", 1),
        "level_title": user.get("level_title", "قارئ مبتدئ"), "streak": user.get("streak", 0),
        "national_rank": rank, "school_rank": school_rank,
        "currently_reading": reading_out,
        "upcoming_events": [{"id": str(e["_id"]), "title": e["title"], "date": e.get("date"), "mode": e.get("mode")} for e in events],
        "open_competitions": [{"id": str(c["_id"]), "title": c["title"], "type": c.get("type")} for c in competitions],
        "chess_challenges": chess_challenges,
        "unread_notifications": unread,
        "books_read": user.get("stats", {}).get("books_read", 0),
        "posts": user.get("stats", {}).get("posts", 0),
        "chess_rating": user.get("chess_rating", 1200),
    }
