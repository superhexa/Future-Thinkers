from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from bson import ObjectId
from db import db, ser, sers, now_iso
from auth import get_current_user, require_role
from services import create_notification, audit_log

router = APIRouter(prefix="/api/geo")


@router.get("/governorates")
async def governorates():
    docs = await db.governorates.find({}).sort("name", 1).to_list(50)
    return sers(docs)


@router.get("/directorates")
async def directorates(governorate_id: str | None = None):
    q = {"governorate_id": governorate_id} if governorate_id else {}
    docs = await db.directorates.find(q).sort("name", 1).to_list(200)
    return sers(docs)


@router.get("/schools")
async def schools(directorate_id: str | None = None, q: str | None = None, limit: int = 50):
    query = {}
    if directorate_id:
        query["directorate_id"] = directorate_id
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    docs = await db.schools.find(query).sort("name", 1).to_list(limit)
    return sers(docs)


class SchoolChangeBody(BaseModel):
    school_id: str
    reason: str = ""


@router.post("/school-change-request")
async def request_school_change(body: SchoolChangeBody, user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(body.school_id):
        raise HTTPException(status_code=400, detail="مدرسة غير صالحة")
    school = await db.schools.find_one({"_id": ObjectId(body.school_id)})
    if not school:
        raise HTTPException(status_code=404, detail="المدرسة غير موجودة")
    existing = await db.school_change_requests.find_one({"user_id": user["id"], "status": "pending"})
    if existing:
        raise HTTPException(status_code=400, detail="لديك طلب قيد المراجعة بالفعل")
    doc = {
        "user_id": user["id"], "user_name": user["name"],
        "from_school_id": user.get("school_id"), "from_school_name": user.get("school_name"),
        "to_school_id": body.school_id, "to_school_name": school["name"],
        "reason": body.reason, "status": "pending", "created_at": now_iso(),
    }
    res = await db.school_change_requests.insert_one(doc)
    return {"id": str(res.inserted_id), "status": "pending"}


@router.get("/school-change-requests")
async def list_change_requests(user: dict = Depends(require_role("school_admin", "directorate_admin", "admin", "super_admin"))):
    q = {"status": "pending"}
    if user["role"] == "school_admin" and user.get("school_id"):
        q["to_school_id"] = user["school_id"]
    docs = await db.school_change_requests.find(q).sort("created_at", -1).to_list(200)
    return sers(docs)


@router.post("/school-change-requests/{req_id}/{action}")
async def act_change_request(req_id: str, action: str,
                             user: dict = Depends(require_role("school_admin", "directorate_admin", "admin", "super_admin"))):
    if action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="إجراء غير صالح")
    req = await db.school_change_requests.find_one({"_id": ObjectId(req_id)})
    if not req or req["status"] != "pending":
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    if action == "approve":
        school = await db.schools.find_one({"_id": ObjectId(req["to_school_id"])})
        await db.users.update_one({"_id": ObjectId(req["user_id"])}, {"$set": {
            "school_id": req["to_school_id"], "school_name": school["name"],
            "directorate_id": school["directorate_id"], "directorate_name": school["directorate_name"],
            "governorate_id": school["governorate_id"], "governorate_name": school["governorate_name"],
        }})
        await create_notification(req["user_id"], "system", "تمت الموافقة على تغيير المدرسة",
                                  f"تم نقلك إلى {req['to_school_name']}")
    else:
        await create_notification(req["user_id"], "system", "تم رفض طلب تغيير المدرسة", "")
    await db.school_change_requests.update_one({"_id": ObjectId(req_id)},
        {"$set": {"status": "approved" if action == "approve" else "rejected", "reviewed_by": user["id"]}})
    await audit_log(user, f"school_change_{action}", "school_change_request", req_id)
    return {"status": action}
