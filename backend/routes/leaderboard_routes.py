from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends
from db import db, oid
from auth import get_current_user
from services import award_xp, create_notification, level_title, level_for_xp

router = APIRouter(prefix="/api")


def _period_start(period: str):
    now = datetime.now(timezone.utc)
    if period == "weekly":
        return now - timedelta(days=7)
    if period == "monthly":
        return now - timedelta(days=30)
    if period == "yearly":
        return now - timedelta(days=365)
    return None


async def _period_xp_map(period: str):
    start = _period_start(period)
    if not start:
        return None
    pipeline = [
        {"$match": {"created_at": {"$gte": start.isoformat()}, "amount": {"$gt": 0}}},
        {"$group": {"_id": "$user_id", "xp": {"$sum": "$amount"}}},
    ]
    rows = await db.xp_transactions.aggregate(pipeline).to_list(5000)
    return {r["_id"]: r["xp"] for r in rows}


@router.get("/leaderboard")
async def student_leaderboard(scope: str = "national", scope_id: str | None = None,
                              period: str = "all", limit: int = 50):
    query = {"role": "student"}
    if scope == "school" and scope_id:
        query["school_id"] = scope_id
    elif scope == "directorate" and scope_id:
        query["directorate_id"] = scope_id
    elif scope == "governorate" and scope_id:
        query["governorate_id"] = scope_id

    if period != "all":
        xp_map = await _period_xp_map(period)
        users = await db.users.find(query).to_list(5000)
        ranked = sorted(users, key=lambda u: xp_map.get(str(u["_id"]), 0), reverse=True)[:limit]
        return [_row(u, i, xp_map.get(str(u["_id"]), 0)) for i, u in enumerate(ranked)]

    docs = await db.users.find(query).sort("xp", -1).limit(limit).to_list(limit)
    return [_row(u, i, u.get("xp", 0)) for i, u in enumerate(docs)]


def _row(u, i, xp):
    return {"rank": i + 1, "id": str(u["_id"]), "name": u["name"],
            "school_name": u.get("school_name"), "governorate_name": u.get("governorate_name"),
            "xp": xp, "level": u.get("level", 1), "level_title": u.get("level_title", "قارئ مبتدئ"),
            "avatar_url": u.get("avatar_url"), "streak": u.get("streak", 0)}


async def _group_leaderboard(group_field, name_field, limit):
    pipeline = [
        {"$match": {"role": "student", group_field: {"$ne": None}}},
        {"$group": {"_id": f"${group_field}", "name": {"$first": f"${name_field}"},
                    "total_xp": {"$sum": "$xp"}, "students": {"$sum": 1}}},
        {"$sort": {"total_xp": -1}}, {"$limit": limit},
    ]
    rows = await db.users.aggregate(pipeline).to_list(limit)
    return [{"rank": i + 1, "id": r["_id"], "name": r["name"], "total_xp": r["total_xp"],
             "students": r["students"]} for i, r in enumerate(rows)]


@router.get("/leaderboard/schools")
async def schools_leaderboard(limit: int = 50):
    return await _group_leaderboard("school_id", "school_name", limit)


@router.get("/leaderboard/directorates")
async def directorates_leaderboard(limit: int = 50):
    return await _group_leaderboard("directorate_id", "directorate_name", limit)


@router.get("/leaderboard/governorates")
async def governorates_leaderboard(limit: int = 20):
    return await _group_leaderboard("governorate_id", "governorate_name", limit)


# ---------------- Gamification ----------------
@router.get("/gamification/achievements")
async def all_achievements(user: dict = Depends(get_current_user)):
    docs = await db.achievements.find({}).to_list(200)
    owned = set(user.get("achievements", []))
    return [{"key": a["key"], "title": a["title"], "description": a.get("description", ""),
             "icon": a.get("icon", "Award"), "badge": a.get("badge"), "unlocked": a["key"] in owned}
            for a in docs]


@router.get("/gamification/me")
async def my_gamification(user: dict = Depends(get_current_user)):
    xp = user.get("xp", 0)
    level = user.get("level", 1)
    from services import level_threshold
    cur = level_threshold(level)
    nxt = level_threshold(level + 1)
    return {
        "xp": xp, "level": level, "level_title": user.get("level_title", "قارئ مبتدئ"),
        "level_progress": round((xp - cur) / max(1, nxt - cur) * 100),
        "xp_to_next": max(0, nxt - xp), "streak": user.get("streak", 0),
        "badges": user.get("badges", []), "achievements": user.get("achievements", []),
        "stats": user.get("stats", {}), "chess_rating": user.get("chess_rating", 1200),
    }


@router.post("/gamification/checkin")
async def daily_checkin(user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date().isoformat()
    last = user.get("last_checkin")
    if last == today:
        return {"already": True, "streak": user.get("streak", 0)}
    yesterday = (datetime.now(timezone.utc).date() - timedelta(days=1)).isoformat()
    streak = user.get("streak", 0) + 1 if last == yesterday else 1
    max_streak = max(streak, user.get("stats", {}).get("max_streak", 0))
    await db.users.update_one({"_id": oid(user["id"])},
        {"$set": {"last_checkin": today, "streak": streak, "stats.max_streak": max_streak}})
    s = await db.settings.find_one({"key": "points_config"})
    await award_xp(user["id"], (s or {}).get("value", {}).get("daily_checkin", 5), "تسجيل حضور يومي")
    return {"already": False, "streak": streak}
