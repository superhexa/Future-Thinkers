"""نادي الابتكار (مشاريع + تصويت) ونادي المناظرات (مواضيع بطرفين + جولات وتصويت)."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from db import db, ser, sers, oid, now_iso
from auth import get_current_user
from services import award_xp, bump_stat, create_notification

router = APIRouter(prefix="/api")


# ---------------- Innovation projects ----------------
class ProjectBody(BaseModel):
    title: str = Field(min_length=3, max_length=140)
    description: str = Field(min_length=1)
    category: str = "ابتكار"


@router.get("/projects")
async def list_projects(sort: str = "votes", user: dict = Depends(get_current_user)):
    sf = ("votes_count", -1) if sort == "votes" else ("created_at", -1)
    docs = await db.projects.find({}).sort(*sf).to_list(100)
    return [{**ser(d), "voted": user["id"] in d.get("votes", [])} for d in docs]


@router.post("/projects")
async def create_project(body: ProjectBody, user: dict = Depends(get_current_user)):
    doc = {**body.model_dump(), "author_id": user["id"], "author_name": user["name"],
           "school_name": user.get("school_name"), "votes": [], "votes_count": 0, "created_at": now_iso()}
    res = await db.projects.insert_one(doc)
    await award_xp(user["id"], 20, "نشر مشروع ابتكاري", str(res.inserted_id))
    return {"id": str(res.inserted_id)}


@router.post("/projects/{pid}/vote")
async def vote_project(pid: str, user: dict = Depends(get_current_user)):
    p = await db.projects.find_one({"_id": oid(pid)})
    if not p:
        raise HTTPException(status_code=404, detail="غير موجود")
    if user["id"] in p.get("votes", []):
        await db.projects.update_one({"_id": p["_id"]}, {"$pull": {"votes": user["id"]}, "$inc": {"votes_count": -1}})
        return {"voted": False}
    await db.projects.update_one({"_id": p["_id"]}, {"$addToSet": {"votes": user["id"]}, "$inc": {"votes_count": 1}})
    if p["author_id"] != user["id"] and user["id"] not in p.get("xp_voters", []):
        await db.projects.update_one({"_id": p["_id"]}, {"$addToSet": {"xp_voters": user["id"]}})
        await award_xp(p["author_id"], 3, "تصويت لمشروعك", pid)
    return {"voted": True}


# ---------------- Debate topics ----------------
class DebateBody(BaseModel):
    title: str = Field(min_length=3, max_length=180)
    description: str = ""
    side_a: str = "مؤيد"
    side_b: str = "معارض"


class ArgumentBody(BaseModel):
    side: str  # 'a' | 'b'
    text: str = Field(min_length=1)


@router.get("/debates")
async def list_debates(user: dict = Depends(get_current_user)):
    docs = await db.debates.find({}).sort("created_at", -1).to_list(100)
    out = []
    for d in docs:
        item = ser(d)
        item["my_vote"] = d.get("voters", {}).get(user["id"])
        item["votes_a"] = d.get("votes_a", 0)
        item["votes_b"] = d.get("votes_b", 0)
        out.append(item)
    return out


@router.post("/debates")
async def create_debate(body: DebateBody, user: dict = Depends(get_current_user)):
    doc = {**body.model_dump(), "author_id": user["id"], "author_name": user["name"],
           "votes_a": 0, "votes_b": 0, "voters": {}, "created_at": now_iso()}
    res = await db.debates.insert_one(doc)
    await award_xp(user["id"], 15, "طرح موضوع مناظرة", str(res.inserted_id))
    return {"id": str(res.inserted_id)}


@router.get("/debates/{did}")
async def get_debate(did: str, user: dict = Depends(get_current_user)):
    d = await db.debates.find_one({"_id": oid(did)})
    if not d:
        raise HTTPException(status_code=404, detail="غير موجود")
    args = await db.debate_arguments.find({"debate_id": did}).sort("created_at", 1).to_list(500)
    item = ser(d)
    item["my_vote"] = d.get("voters", {}).get(user["id"])
    item["arguments"] = sers(args)
    return item


@router.post("/debates/{did}/vote")
async def vote_debate(did: str, side: str, user: dict = Depends(get_current_user)):
    if side not in ("a", "b"):
        raise HTTPException(status_code=400, detail="طرف غير صالح")
    d = await db.debates.find_one({"_id": oid(did)})
    if not d:
        raise HTTPException(status_code=404, detail="غير موجود")
    voters = d.get("voters", {})
    prev = voters.get(user["id"])
    if prev == side:
        return {"my_vote": side, "votes_a": d.get("votes_a", 0), "votes_b": d.get("votes_b", 0)}
    inc = {}
    if prev:
        inc[f"votes_{prev}"] = -1
    inc[f"votes_{side}"] = 1
    voters[user["id"]] = side
    await db.debates.update_one({"_id": d["_id"]}, {"$inc": inc, "$set": {"voters": voters}})
    fresh = await db.debates.find_one({"_id": d["_id"]})
    return {"my_vote": side, "votes_a": fresh.get("votes_a", 0), "votes_b": fresh.get("votes_b", 0)}


@router.post("/debates/{did}/argument")
async def add_argument(did: str, body: ArgumentBody, user: dict = Depends(get_current_user)):
    if body.side not in ("a", "b"):
        raise HTTPException(status_code=400, detail="طرف غير صالح")
    d = await db.debates.find_one({"_id": oid(did)})
    if not d:
        raise HTTPException(status_code=404, detail="غير موجود")
    res = await db.debate_arguments.insert_one({
        "debate_id": did, "side": body.side, "text": body.text,
        "author_id": user["id"], "author_name": user["name"], "created_at": now_iso()})
    await award_xp(user["id"], 8, "حجة في مناظرة", did)
    return {"id": str(res.inserted_id)}
