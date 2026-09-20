from fastapi import APIRouter, HTTPException, Depends, Query, Request
from pydantic import BaseModel, Field
from bson import ObjectId
from db import db, ser, sers, oid, now_iso
from auth import get_current_user, get_optional_user, require_permission
from services import award_xp, bump_stat, create_notification, audit_log

router = APIRouter(prefix="/api")

# ---------- Clubs ----------
@router.get("/clubs")
async def list_clubs(request: Request):
    docs = await db.clubs.find({}).to_list(50)
    user = await get_optional_user(request)
    mine = set()
    if user:
        mems = await db.club_members.find({"user_id": user["id"]}).to_list(50)
        mine = {m["club_id"] for m in mems}
    out = []
    for c in docs:
        d = ser(c)
        d["is_member"] = d["id"] in mine
        out.append(d)
    return out


@router.get("/clubs/{slug}")
async def get_club(slug: str, request: Request):
    c = await db.clubs.find_one({"slug": slug})
    if not c:
        raise HTTPException(status_code=404, detail="النادي غير موجود")
    d = ser(c)
    d["members_count"] = await db.club_members.count_documents({"club_id": d["id"]})
    d["discussions_count"] = await db.discussions.count_documents({"club_slug": slug})
    user = await get_optional_user(request)
    d["is_member"] = bool(user and await db.club_members.find_one({"club_id": d["id"], "user_id": user["id"]}))
    return d


@router.post("/clubs/{slug}/join")
async def join_club(slug: str, user: dict = Depends(get_current_user)):
    c = await db.clubs.find_one({"slug": slug})
    if not c:
        raise HTTPException(status_code=404, detail="النادي غير موجود")
    cid = str(c["_id"])
    if await db.club_members.find_one({"club_id": cid, "user_id": user["id"]}):
        return {"joined": True}
    await db.club_members.insert_one({"club_id": cid, "club_slug": slug, "user_id": user["id"], "created_at": now_iso()})
    await db.clubs.update_one({"_id": c["_id"]}, {"$inc": {"members_count": 1}})
    return {"joined": True}


@router.post("/clubs/{slug}/leave")
async def leave_club(slug: str, user: dict = Depends(get_current_user)):
    c = await db.clubs.find_one({"slug": slug})
    if not c:
        raise HTTPException(status_code=404, detail="النادي غير موجود")
    res = await db.club_members.delete_one({"club_id": str(c["_id"]), "user_id": user["id"]})
    if res.deleted_count:
        await db.clubs.update_one({"_id": c["_id"]}, {"$inc": {"members_count": -1}})
    return {"joined": False}


@router.get("/clubs/{slug}/members")
async def club_members(slug: str, limit: int = 50):
    mems = await db.club_members.find({"club_slug": slug}).limit(limit).to_list(limit)
    ids = [oid(m["user_id"]) for m in mems if oid(m["user_id"])]
    users = await db.users.find({"_id": {"$in": ids}}).to_list(limit)
    return [{"id": str(u["_id"]), "name": u["name"], "school_name": u.get("school_name"),
             "xp": u.get("xp", 0), "level": u.get("level", 1), "avatar_url": u.get("avatar_url")} for u in users]


# ---------- Discussions (forum) ----------
DISCUSSION_CATEGORIES = ["علوم", "ثقافة", "تقنية", "كتب", "مجتمع", "فلسفة", "تعليم", "ريادة أعمال"]


class DiscussionBody(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    body: str = Field(min_length=1)
    category: str = "مجتمع"
    club_slug: str = "dialogue"


@router.get("/discussions/categories")
async def disc_categories():
    return DISCUSSION_CATEGORIES


@router.get("/discussions")
async def list_discussions(club_slug: str | None = None, category: str | None = None,
                           q: str | None = None, sort: str = "recent", page: int = 1, limit: int = 15):
    query = {}
    if club_slug:
        query["club_slug"] = club_slug
    if category:
        query["category"] = category
    if q:
        query["title"] = {"$regex": q, "$options": "i"}
    sf = {"recent": ("last_activity", -1), "popular": ("likes_count", -1), "replies": ("replies_count", -1)}.get(sort, ("last_activity", -1))
    total = await db.discussions.count_documents(query)
    docs = await db.discussions.find(query).sort(*sf).skip((page - 1) * limit).limit(limit).to_list(limit)
    return {"items": sers(docs), "total": total, "page": page}


@router.post("/discussions")
async def create_discussion(body: DiscussionBody, request: Request, user: dict = Depends(get_current_user)):
    doc = {
        "title": body.title, "body": body.body, "category": body.category, "club_slug": body.club_slug,
        "author_id": user["id"], "author_name": user["name"], "author_school": user.get("school_name"),
        "likes": [], "likes_count": 0, "replies_count": 0, "views": 0,
        "followers": [user["id"]], "status": "published",
        "created_at": now_iso(), "last_activity": now_iso(),
    }
    res = await db.discussions.insert_one(doc)
    await bump_stat(user["id"], "posts", 1)
    s = await db.settings.find_one({"key": "points_config"})
    await award_xp(user["id"], (s or {}).get("value", {}).get("create_discussion", 15), "إنشاء نقاش", str(res.inserted_id))
    await audit_log(user, "discussion_create", "discussion", str(res.inserted_id))
    return {"id": str(res.inserted_id)}


@router.get("/discussions/{disc_id}")
async def get_discussion(disc_id: str, request: Request):
    d = await db.discussions.find_one({"_id": oid(disc_id)})
    if not d:
        raise HTTPException(status_code=404, detail="النقاش غير موجود")
    await db.discussions.update_one({"_id": d["_id"]}, {"$inc": {"views": 1}})
    replies = await db.discussion_replies.find({"discussion_id": disc_id}).sort("created_at", 1).to_list(500)
    user = await get_optional_user(request)
    out = ser(d)
    out["liked"] = bool(user and user["id"] in d.get("likes", []))
    out["following"] = bool(user and user["id"] in d.get("followers", []))
    out["replies"] = [{**ser(r), "liked": bool(user and user["id"] in r.get("likes", []))} for r in replies]
    return out


class ReplyBody(BaseModel):
    body: str = Field(min_length=1)
    parent_id: str | None = None


@router.post("/discussions/{disc_id}/reply")
async def reply_discussion(disc_id: str, body: ReplyBody, user: dict = Depends(get_current_user)):
    d = await db.discussions.find_one({"_id": oid(disc_id)})
    if not d:
        raise HTTPException(status_code=404, detail="النقاش غير موجود")
    doc = {
        "discussion_id": disc_id, "parent_id": body.parent_id, "body": body.body,
        "author_id": user["id"], "author_name": user["name"], "author_school": user.get("school_name"),
        "likes": [], "likes_count": 0, "created_at": now_iso(),
    }
    res = await db.discussion_replies.insert_one(doc)
    await db.discussions.update_one({"_id": d["_id"]}, {"$inc": {"replies_count": 1}, "$set": {"last_activity": now_iso()}})
    await bump_stat(user["id"], "posts", 1)
    s = await db.settings.find_one({"key": "points_config"})
    await award_xp(user["id"], (s or {}).get("value", {}).get("reply_discussion", 8), "رد في نقاش", disc_id)
    for follower in d.get("followers", []):
        if follower != user["id"]:
            await create_notification(follower, "reply", "رد جديد على نقاش تتابعه", d["title"], f"/discussions/{disc_id}")
    return {"id": str(res.inserted_id)}


@router.post("/discussions/{disc_id}/like")
async def like_discussion(disc_id: str, user: dict = Depends(get_current_user)):
    d = await db.discussions.find_one({"_id": oid(disc_id)})
    if not d:
        raise HTTPException(status_code=404, detail="غير موجود")
    if user["id"] in d.get("likes", []):
        await db.discussions.update_one({"_id": d["_id"]}, {"$pull": {"likes": user["id"]}, "$inc": {"likes_count": -1}})
        return {"liked": False}
    await db.discussions.update_one({"_id": d["_id"]}, {"$addToSet": {"likes": user["id"]}, "$inc": {"likes_count": 1}})
    if d["author_id"] != user["id"]:
        s = await db.settings.find_one({"key": "points_config"})
        await award_xp(d["author_id"], (s or {}).get("value", {}).get("receive_like", 3), "إعجاب على نقاش", disc_id)
    return {"liked": True}


@router.post("/replies/{reply_id}/like")
async def like_reply(reply_id: str, user: dict = Depends(get_current_user)):
    r = await db.discussion_replies.find_one({"_id": oid(reply_id)})
    if not r:
        raise HTTPException(status_code=404, detail="غير موجود")
    if user["id"] in r.get("likes", []):
        await db.discussion_replies.update_one({"_id": r["_id"]}, {"$pull": {"likes": user["id"]}, "$inc": {"likes_count": -1}})
        return {"liked": False}
    await db.discussion_replies.update_one({"_id": r["_id"]}, {"$addToSet": {"likes": user["id"]}, "$inc": {"likes_count": 1}})
    return {"liked": True}


@router.post("/discussions/{disc_id}/follow")
async def follow_discussion(disc_id: str, user: dict = Depends(get_current_user)):
    d = await db.discussions.find_one({"_id": oid(disc_id)})
    if not d:
        raise HTTPException(status_code=404, detail="غير موجود")
    if user["id"] in d.get("followers", []):
        await db.discussions.update_one({"_id": d["_id"]}, {"$pull": {"followers": user["id"]}})
        return {"following": False}
    await db.discussions.update_one({"_id": d["_id"]}, {"$addToSet": {"followers": user["id"]}})
    return {"following": True}


@router.delete("/discussions/{disc_id}")
async def delete_discussion(disc_id: str, user: dict = Depends(get_current_user)):
    d = await db.discussions.find_one({"_id": oid(disc_id)})
    if not d:
        raise HTTPException(status_code=404, detail="غير موجود")
    from auth import effective_permissions
    if d["author_id"] != user["id"] and "discussion.moderate" not in effective_permissions(user):
        raise HTTPException(status_code=403, detail="لا تملك صلاحية الحذف")
    await db.discussions.delete_one({"_id": d["_id"]})
    await db.discussion_replies.delete_many({"discussion_id": disc_id})
    return {"ok": True}
