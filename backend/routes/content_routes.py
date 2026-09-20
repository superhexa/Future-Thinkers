from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from db import db, ser, sers, oid, now_iso
from auth import get_current_user, get_optional_user, require_permission
from services import create_notification, audit_log, broadcast_notification

router = APIRouter(prefix="/api")


# ---------------- News ----------------
class NewsBody(BaseModel):
    title: str
    body: str
    cover_url: str = ""
    category: str = "منصة"


@router.get("/news")
async def list_news(page: int = 1, limit: int = 9):
    total = await db.news.count_documents({"status": "published"})
    docs = await db.news.find({"status": "published"}).sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    return {"items": sers(docs), "total": total}


@router.post("/news")
async def create_news(body: NewsBody, request: Request, user: dict = Depends(require_permission("news.manage"))):
    doc = {**body.model_dump(), "status": "published", "author_id": user["id"],
           "author_name": user["name"], "created_at": now_iso()}
    res = await db.news.insert_one(doc)
    await audit_log(user, "news_create", "news", str(res.inserted_id), request=request)
    return {"id": str(res.inserted_id)}


@router.get("/news/{nid}")
async def get_news(nid: str):
    n = await db.news.find_one({"_id": oid(nid)})
    if not n:
        raise HTTPException(status_code=404, detail="الخبر غير موجود")
    return ser(n)


# ---------------- Activities gallery ----------------
class ActivityBody(BaseModel):
    title: str
    description: str = ""
    media_url: str = ""
    media_type: str = "image"  # image | video
    club_slug: str | None = None


@router.get("/activities")
async def list_activities(page: int = 1, limit: int = 12):
    total = await db.activities.count_documents({"status": "approved"})
    docs = await db.activities.find({"status": "approved"}).sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    return {"items": sers(docs), "total": total}


@router.post("/activities")
async def create_activity(body: ActivityBody, user: dict = Depends(get_current_user)):
    doc = {**body.model_dump(), "status": "pending", "author_id": user["id"], "author_name": user["name"],
           "school_name": user.get("school_name"), "directorate_name": user.get("directorate_name"),
           "created_at": now_iso()}
    res = await db.activities.insert_one(doc)
    return {"id": str(res.inserted_id), "status": "pending"}


@router.get("/activities/pending")
async def pending_activities(user: dict = Depends(require_permission("activity.approve"))):
    docs = await db.activities.find({"status": "pending"}).sort("created_at", -1).to_list(100)
    return sers(docs)


@router.post("/activities/{aid}/{action}")
async def moderate_activity(aid: str, action: str, user: dict = Depends(require_permission("activity.approve"))):
    if action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="إجراء غير صالح")
    a = await db.activities.find_one({"_id": oid(aid)})
    if not a:
        raise HTTPException(status_code=404, detail="غير موجود")
    await db.activities.update_one({"_id": a["_id"]}, {"$set": {"status": "approved" if action == "approve" else "rejected", "reviewed_by": user["id"]}})
    await create_notification(a["author_id"], "activity", "تحديث حالة نشاطك",
                              "تمت الموافقة على نشاطك" if action == "approve" else "تم رفض نشاطك")
    await audit_log(user, f"activity_{action}", "activity", aid)
    return {"status": action}


# ---------------- Reports ----------------
class ReportBody(BaseModel):
    entity_type: str  # book | discussion | reply | user | event | activity
    entity_id: str
    reason: str
    details: str = ""


@router.post("/reports")
async def create_report(body: ReportBody, user: dict = Depends(get_current_user)):
    doc = {**body.model_dump(), "status": "open", "reporter_id": user["id"],
           "reporter_name": user["name"], "created_at": now_iso()}
    res = await db.reports.insert_one(doc)
    return {"id": str(res.inserted_id), "status": "open"}


@router.get("/reports")
async def list_reports(status: str = "open", user: dict = Depends(require_permission("report.manage"))):
    docs = await db.reports.find({"status": status}).sort("created_at", -1).to_list(200)
    return sers(docs)


class ReportActionBody(BaseModel):
    action: str  # dismiss | warn | hide | delete
    note: str = ""


@router.post("/reports/{rid}/resolve")
async def resolve_report(rid: str, body: ReportActionBody, user: dict = Depends(require_permission("report.manage"))):
    r = await db.reports.find_one({"_id": oid(rid)})
    if not r:
        raise HTTPException(status_code=404, detail="غير موجود")
    if body.action == "delete":
        if r["entity_type"] == "discussion":
            await db.discussions.delete_one({"_id": oid(r["entity_id"])})
        elif r["entity_type"] == "reply":
            await db.discussion_replies.delete_one({"_id": oid(r["entity_id"])})
        elif r["entity_type"] == "activity":
            await db.activities.delete_one({"_id": oid(r["entity_id"])})
    await db.reports.update_one({"_id": r["_id"]}, {"$set": {"status": "resolved", "action": body.action,
                                                             "note": body.note, "resolved_by": user["id"]}})
    await audit_log(user, "report_resolve", "report", rid, {"action": body.action})
    return {"status": "resolved"}
