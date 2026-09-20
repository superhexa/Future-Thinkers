from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from bson import ObjectId
from db import db, ser, sers, oid, now_iso
from auth import get_current_user, get_optional_user, require_permission
from services import award_xp, bump_stat, create_notification, audit_log
import secrets

router = APIRouter(prefix="/api")


# ---------------- Events ----------------
class EventBody(BaseModel):
    title: str
    description: str = ""
    cover_url: str = ""
    date: str
    time: str = ""
    location: str = ""
    mode: str = "online"          # online | onsite
    scope: str = "national"       # national | directorate | school
    organizer: str = ""
    audience: str = "الطلاب"
    capacity: int = 100
    club_slug: str | None = None


@router.get("/events")
async def list_events(scope: str | None = None, upcoming: bool | None = None, page: int = 1, limit: int = 12):
    query = {"status": "published"}
    if scope:
        query["scope"] = scope
    total = await db.events.count_documents(query)
    docs = await db.events.find(query).sort("date", 1).skip((page - 1) * limit).limit(limit).to_list(limit)
    out = []
    for e in docs:
        d = ser(e)
        d["registered_count"] = await db.event_registrations.count_documents({"event_id": d["id"]})
        out.append(d)
    return {"items": out, "total": total, "page": page}


@router.post("/events")
async def create_event(body: EventBody, request: Request, user: dict = Depends(require_permission("event.create"))):
    doc = {**body.model_dump(), "status": "published", "organizer_id": user["id"],
           "organizer_name": user["name"], "created_at": now_iso()}
    if not doc["organizer"]:
        doc["organizer"] = user.get("school_name") or "منصة مفكري المستقبل"
    res = await db.events.insert_one(doc)
    await audit_log(user, "event_create", "event", str(res.inserted_id), {"title": body.title}, request)
    return {"id": str(res.inserted_id)}


@router.get("/events/{eid}")
async def get_event(eid: str, request: Request):
    e = await db.events.find_one({"_id": oid(eid)})
    if not e:
        raise HTTPException(status_code=404, detail="الفعالية غير موجودة")
    d = ser(e)
    d["registered_count"] = await db.event_registrations.count_documents({"event_id": eid})
    user = await get_optional_user(request)
    if user:
        reg = await db.event_registrations.find_one({"event_id": eid, "user_id": user["id"]})
        d["is_registered"] = bool(reg)
        d["qr_code"] = reg.get("qr_code") if reg else None
        d["checked_in"] = reg.get("checked_in", False) if reg else False
    return d


@router.post("/events/{eid}/register")
async def register_event(eid: str, user: dict = Depends(get_current_user)):
    e = await db.events.find_one({"_id": oid(eid)})
    if not e:
        raise HTTPException(status_code=404, detail="الفعالية غير موجودة")
    if await db.event_registrations.find_one({"event_id": eid, "user_id": user["id"]}):
        return {"registered": True}
    count = await db.event_registrations.count_documents({"event_id": eid})
    waitlist = count >= e.get("capacity", 100)
    qr = secrets.token_hex(8).upper()
    await db.event_registrations.insert_one({
        "event_id": eid, "event_title": e["title"], "user_id": user["id"], "user_name": user["name"],
        "status": "waitlist" if waitlist else "confirmed", "qr_code": qr,
        "checked_in": False, "created_at": now_iso()})
    if not waitlist:
        await bump_stat(user["id"], "events", 1)
        s = await db.settings.find_one({"key": "points_config"})
        await award_xp(user["id"], (s or {}).get("value", {}).get("join_event", 25), "التسجيل في فعالية", eid)
    await create_notification(user["id"], "event", "تم تسجيلك في الفعالية" + (" (قائمة انتظار)" if waitlist else " ✅"), e["title"])
    return {"registered": True, "waitlist": waitlist, "qr_code": qr}


@router.post("/events/{eid}/unregister")
async def unregister_event(eid: str, user: dict = Depends(get_current_user)):
    await db.event_registrations.delete_one({"event_id": eid, "user_id": user["id"]})
    return {"registered": False}


@router.get("/events/{eid}/participants")
async def event_participants(eid: str, user: dict = Depends(require_permission("event.create"))):
    docs = await db.event_registrations.find({"event_id": eid}).to_list(1000)
    return sers(docs)


class CheckinBody(BaseModel):
    qr_code: str


@router.post("/events/{eid}/checkin")
async def checkin_event(eid: str, body: CheckinBody, user: dict = Depends(require_permission("event.create"))):
    reg = await db.event_registrations.find_one({"event_id": eid, "qr_code": body.qr_code})
    if not reg:
        raise HTTPException(status_code=404, detail="رمز غير صالح")
    await db.event_registrations.update_one({"_id": reg["_id"]}, {"$set": {"checked_in": True, "checkin_at": now_iso()}})
    return {"checked_in": True, "user_name": reg["user_name"]}


# ---------------- Competitions ----------------
class Question(BaseModel):
    text: str
    options: list[str]
    correct: int


class CompetitionBody(BaseModel):
    title: str
    description: str = ""
    type: str = "quiz"  # quiz | chess | programming | reading | writing | science | debate
    club_slug: str | None = None
    start_at: str
    end_at: str
    duration_minutes: int = 30
    questions: list[Question] = Field(default_factory=list)


@router.get("/competitions")
async def list_competitions(type: str | None = None, page: int = 1, limit: int = 12):
    query = {}
    if type:
        query["type"] = type
    total = await db.competitions.count_documents(query)
    docs = await db.competitions.find(query).sort("start_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    out = []
    for c in docs:
        d = ser(c)
        d.pop("questions", None)
        d["participants_count"] = await db.competition_entries.count_documents({"competition_id": d["id"]})
        out.append(d)
    return {"items": out, "total": total, "page": page}


@router.post("/competitions")
async def create_competition(body: CompetitionBody, request: Request, user: dict = Depends(require_permission("competition.manage"))):
    doc = {**body.model_dump(), "status": "open", "created_by": user["id"], "created_at": now_iso()}
    res = await db.competitions.insert_one(doc)
    await audit_log(user, "competition_create", "competition", str(res.inserted_id), {"title": body.title}, request)
    return {"id": str(res.inserted_id)}


@router.get("/competitions/{cid}")
async def get_competition(cid: str, request: Request):
    c = await db.competitions.find_one({"_id": oid(cid)})
    if not c:
        raise HTTPException(status_code=404, detail="المسابقة غير موجودة")
    d = ser(c)
    d["participants_count"] = await db.competition_entries.count_documents({"competition_id": cid})
    d["question_count"] = len(c.get("questions", []))
    user = await get_optional_user(request)
    entry = None
    if user:
        entry = await db.competition_entries.find_one({"competition_id": cid, "user_id": user["id"]})
    d["my_entry"] = ser(entry) if entry else None
    # strip correct answers unless already submitted or manager
    from auth import effective_permissions
    can_manage = user and "competition.manage" in effective_permissions(user)
    if not can_manage:
        d["questions"] = [{"text": q["text"], "options": q["options"]} for q in c.get("questions", [])]
    return d


@router.post("/competitions/{cid}/register")
async def register_competition(cid: str, user: dict = Depends(get_current_user)):
    c = await db.competitions.find_one({"_id": oid(cid)})
    if not c:
        raise HTTPException(status_code=404, detail="غير موجودة")
    if await db.competition_entries.find_one({"competition_id": cid, "user_id": user["id"]}):
        return {"registered": True}
    await db.competition_entries.insert_one({
        "competition_id": cid, "competition_title": c["title"], "user_id": user["id"],
        "user_name": user["name"], "school_name": user.get("school_name"),
        "status": "registered", "score": None, "submitted": False, "created_at": now_iso()})
    await bump_stat(user["id"], "competitions", 1)
    s = await db.settings.find_one({"key": "points_config"})
    await award_xp(user["id"], (s or {}).get("value", {}).get("join_competition", 20), "التسجيل في مسابقة", cid)
    return {"registered": True}


class SubmitBody(BaseModel):
    answers: list[int]


@router.post("/competitions/{cid}/submit")
async def submit_competition(cid: str, body: SubmitBody, user: dict = Depends(get_current_user)):
    c = await db.competitions.find_one({"_id": oid(cid)})
    if not c:
        raise HTTPException(status_code=404, detail="غير موجودة")
    entry = await db.competition_entries.find_one({"competition_id": cid, "user_id": user["id"]})
    if not entry:
        raise HTTPException(status_code=400, detail="سجّل في المسابقة أولاً")
    if entry.get("submitted"):
        raise HTTPException(status_code=400, detail="لقد أرسلت إجاباتك مسبقاً")
    questions = c.get("questions", [])
    correct = sum(1 for i, q in enumerate(questions) if i < len(body.answers) and body.answers[i] == q["correct"])
    total = len(questions) or 1
    score = round(correct / total * 100)
    await db.competition_entries.update_one({"_id": entry["_id"]},
        {"$set": {"submitted": True, "score": score, "correct": correct, "total": total,
                  "answers": body.answers, "submitted_at": now_iso(), "status": "completed"}})
    xp = 20 + correct * 5
    await award_xp(user["id"], xp, "إكمال مسابقة", cid)
    await create_notification(user["id"], "competition", "نتيجة المسابقة", f"{c['title']}: {score}% ({correct}/{total})")
    return {"score": score, "correct": correct, "total": total}


@router.get("/competitions/{cid}/leaderboard")
async def competition_leaderboard(cid: str):
    docs = await db.competition_entries.find({"competition_id": cid, "submitted": True}).sort([("score", -1), ("submitted_at", 1)]).to_list(200)
    out = []
    for i, e in enumerate(docs):
        out.append({"rank": i + 1, "user_name": e["user_name"], "school_name": e.get("school_name"),
                    "score": e.get("score", 0), "correct": e.get("correct", 0), "total": e.get("total", 0)})
    return out
