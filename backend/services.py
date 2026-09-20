"""Shared domain services: gamification (XP/levels/badges/achievements),
notifications, and audit logging. All persist to MongoDB (source of truth)."""
from bson import ObjectId
from db import db, now_iso


def level_for_xp(xp: int) -> int:
    lvl = 1
    while xp >= level_threshold(lvl + 1):
        lvl += 1
    return lvl


def level_threshold(level: int) -> int:
    # cumulative XP required to reach a level (quadratic curve)
    return int(100 * (level - 1) * level / 2)


LEVEL_TITLES = {
    1: "قارئ مبتدئ", 3: "مستكشف معرفي", 5: "مفكر ناشئ",
    8: "باحث متميز", 12: "عقل نيّر", 18: "مفكّر المستقبل",
}


def level_title(level: int) -> str:
    title = "قارئ مبتدئ"
    for lvl, t in sorted(LEVEL_TITLES.items()):
        if level >= lvl:
            title = t
    return title


async def award_xp(user_id: str, amount: int, reason: str, ref: str = None):
    if amount == 0:
        return
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return
    new_xp = max(0, user.get("xp", 0) + amount)
    old_level = user.get("level", 1)
    new_level = level_for_xp(new_xp)
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"xp": new_xp, "level": new_level, "level_title": level_title(new_level)}},
    )
    await db.xp_transactions.insert_one({
        "user_id": user_id, "amount": amount, "reason": reason,
        "ref": ref, "balance": new_xp, "created_at": now_iso(),
    })
    if new_level > old_level:
        await create_notification(
            user_id, "achievement", "🎉 ترقية مستوى!",
            f"وصلت إلى المستوى {new_level} — {level_title(new_level)}",
        )
    await check_achievements(user_id)


async def check_achievements(user_id: str):
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return
    owned = set(user.get("achievements", []))
    stats = user.get("stats", {})
    unlocked = []
    achievements = await db.achievements.find({}).to_list(200)
    for a in achievements:
        key = a["key"]
        if key in owned:
            continue
        metric = a.get("metric")
        threshold = a.get("threshold", 0)
        value = 0
        if metric == "xp":
            value = user.get("xp", 0)
        elif metric == "level":
            value = user.get("level", 1)
        else:
            value = stats.get(metric, 0)
        if value >= threshold:
            unlocked.append(a)
    for a in unlocked:
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$addToSet": {"achievements": a["key"], "badges": a.get("badge", a["key"])}},
        )
        await create_notification(
            user_id, "achievement", f"🏅 إنجاز جديد: {a['title']}", a.get("description", ""),
        )


async def bump_stat(user_id: str, stat: str, delta: int = 1):
    await db.users.update_one(
        {"_id": ObjectId(user_id)}, {"$inc": {f"stats.{stat}": delta}}
    )
    await check_achievements(user_id)


async def create_notification(user_id: str, type_: str, title: str, body: str = "", link: str = None):
    await db.notifications.insert_one({
        "user_id": user_id, "type": type_, "title": title, "body": body,
        "link": link, "read": False, "created_at": now_iso(),
    })


async def broadcast_notification(user_ids, type_, title, body="", link=None):
    if not user_ids:
        return
    docs = [{
        "user_id": uid, "type": type_, "title": title, "body": body,
        "link": link, "read": False, "created_at": now_iso(),
    } for uid in user_ids]
    await db.notifications.insert_many(docs)


async def audit_log(user, action: str, entity: str, entity_id: str = None, meta: dict = None, request=None):
    ip = None
    ua = None
    if request is not None:
        ip = request.client.host if request.client else None
        ua = request.headers.get("user-agent")
    await db.audit_logs.insert_one({
        "user_id": str(user.get("id")) if user else None,
        "user_email": user.get("email") if user else None,
        "action": action, "entity": entity, "entity_id": entity_id,
        "meta": meta or {}, "ip": ip, "user_agent": ua, "created_at": now_iso(),
    })
