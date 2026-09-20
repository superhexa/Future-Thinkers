from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, Form, Request
from pydantic import BaseModel, Field
from bson import ObjectId
from db import db, ser, sers, oid, now_iso
from auth import get_current_user, get_optional_user, require_permission, effective_permissions
from services import award_xp, bump_stat, create_notification, audit_log
from storage import save_file, MAX_SIZE

router = APIRouter(prefix="/api/books")


async def _points(key, default):
    s = await db.settings.find_one({"key": "points_config"})
    return (s or {}).get("value", {}).get(key, default)


def _book_out(b, user_id=None):
    d = ser(b)
    if b.get("external_pdf_url"):
        d["pdf_url"] = b["external_pdf_url"]
    elif b.get("storage_path"):
        d["pdf_url"] = f"/api/files/{b['storage_path']}"
    return d


@router.get("/categories")
async def categories():
    docs = await db.categories.find({}).to_list(100)
    return sers(docs)


@router.get("")
async def list_books(request: Request, category: str | None = None, q: str | None = None,
                     sort: str = "recent", status: str | None = None,
                     page: int = 1, limit: int = 12):
    user = await get_optional_user(request)
    query = {}
    can_moderate = user and "book.approve" in effective_permissions(user)
    if status and can_moderate:
        query["status"] = status
    else:
        query["status"] = "approved"
    if category:
        query["category"] = category
    if q:
        query["$or"] = [{"title": {"$regex": q, "$options": "i"}},
                        {"author": {"$regex": q, "$options": "i"}},
                        {"description": {"$regex": q, "$options": "i"}}]
    sort_map = {"recent": ("created_at", -1), "popular": ("views", -1),
                "rating": ("rating_avg", -1), "title": ("title", 1)}
    sf, sd = sort_map.get(sort, ("created_at", -1))
    total = await db.books.count_documents(query)
    docs = await db.books.find(query).sort(sf, sd).skip((page - 1) * limit).limit(limit).to_list(limit)
    return {"items": [_book_out(b) for b in docs], "total": total, "page": page, "limit": limit}


@router.get("/pending")
async def pending_books(user: dict = Depends(require_permission("book.approve"))):
    docs = await db.books.find({"status": "pending"}).sort("created_at", -1).to_list(100)
    return sers(docs)


@router.get("/me/favorites")
async def my_favorites(user: dict = Depends(get_current_user)):
    favs = await db.favorites.find({"user_id": user["id"]}).to_list(500)
    ids = [oid(f["book_id"]) for f in favs if oid(f["book_id"])]
    docs = await db.books.find({"_id": {"$in": ids}}).to_list(500)
    return [_book_out(b) for b in docs]


@router.get("/me/reading")
async def my_reading(user: dict = Depends(get_current_user)):
    progs = await db.reading_progress.find({"user_id": user["id"]}).sort("updated_at", -1).limit(20).to_list(20)
    out = []
    for p in progs:
        b = await db.books.find_one({"_id": oid(p["book_id"])})
        if b:
            item = _book_out(b)
            item["progress"] = p.get("percent", 0)
            item["last_page"] = p.get("page", 1)
            out.append(item)
    return out


@router.get("/{book_id}")
async def get_book(book_id: str, request: Request):
    b = await db.books.find_one({"_id": oid(book_id)})
    if not b:
        raise HTTPException(status_code=404, detail="الكتاب غير موجود")
    await db.books.update_one({"_id": b["_id"]}, {"$inc": {"views": 1}})
    user = await get_optional_user(request)
    d = _book_out(b)
    if user:
        d["is_favorite"] = bool(await db.favorites.find_one({"user_id": user["id"], "book_id": book_id}))
        prog = await db.reading_progress.find_one({"user_id": user["id"], "book_id": book_id})
        d["my_progress"] = prog.get("percent", 0) if prog else 0
        d["my_last_page"] = prog.get("page", 1) if prog else 1
    return d


@router.post("")
async def upload_book(request: Request, title: str = Form(...), author: str = Form(...),
                      description: str = Form(""), category: str = Form("general"),
                      language: str = Form("العربية"), pages: int = Form(0), year: int = Form(0),
                      publisher: str = Form(""), age: str = Form("عام"), tags: str = Form(""),
                      pdf: UploadFile = File(...), cover: UploadFile | None = File(None),
                      user: dict = Depends(get_current_user)):
    pdf_bytes = await pdf.read()
    if len(pdf_bytes) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="حجم الملف يتجاوز الحد المسموح (50MB)")
    if pdf.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="يجب أن يكون الملف بصيغة PDF")
    pdf_meta = await save_file(pdf_bytes, pdf.filename, "application/pdf", user["id"], "books")

    cover_path = None
    cover_url = None
    if cover:
        cbytes = await cover.read()
        if cover.content_type in ("image/png", "image/jpeg", "image/webp"):
            cmeta = await save_file(cbytes, cover.filename, cover.content_type, user["id"], "covers")
            cover_path = cmeta["storage_path"]
    doc = {
        "title": title, "author": author, "description": description, "category": category,
        "language": language, "pages": pages, "year": year, "publisher": publisher, "age": age,
        "tags": [t.strip() for t in tags.split(",") if t.strip()] or [category],
        "cover_url": cover_url, "cover_path": cover_path,
        "storage_path": pdf_meta["storage_path"], "external_pdf_url": None,
        "telegram_file_id": pdf_meta.get("telegram_file_id"),
        "status": "pending", "uploaded_by": user["id"], "uploader_name": user["name"],
        "views": 0, "downloads": 0, "favorites_count": 0, "rating_avg": 0, "rating_count": 0,
        "created_at": now_iso(),
    }
    res = await db.books.insert_one(doc)
    await audit_log(user, "book_upload", "book", str(res.inserted_id), {"title": title}, request)
    mods = await db.users.find({"role": {"$in": ["moderator", "admin", "super_admin"]}}).to_list(100)
    for m in mods:
        await create_notification(str(m["_id"]), "moderation", "كتاب جديد بانتظار المراجعة", title, "/admin/moderation")
    return {"id": str(res.inserted_id), "status": "pending"}


@router.post("/{book_id}/approve")
async def approve_book(book_id: str, request: Request, user: dict = Depends(require_permission("book.approve"))):
    b = await db.books.find_one({"_id": oid(book_id)})
    if not b:
        raise HTTPException(status_code=404, detail="الكتاب غير موجود")
    await db.books.update_one({"_id": b["_id"]}, {"$set": {"status": "approved", "approved_by": user["id"], "approved_at": now_iso()}})
    pts = await _points("upload_book_approved", 40)
    await award_xp(b["uploaded_by"], pts, "الموافقة على كتاب", book_id)
    await create_notification(b["uploaded_by"], "book", "تمت الموافقة على كتابك 🎉", b["title"], f"/books/{book_id}")
    await audit_log(user, "book_approve", "book", book_id)
    return {"status": "approved"}


class RejectBody(BaseModel):
    reason: str = ""


@router.post("/{book_id}/reject")
async def reject_book(book_id: str, body: RejectBody, user: dict = Depends(require_permission("book.reject"))):
    b = await db.books.find_one({"_id": oid(book_id)})
    if not b:
        raise HTTPException(status_code=404, detail="الكتاب غير موجود")
    await db.books.update_one({"_id": b["_id"]}, {"$set": {"status": "rejected", "reject_reason": body.reason, "reviewed_by": user["id"]}})
    await create_notification(b["uploaded_by"], "book", "تم رفض كتابك", body.reason or b["title"])
    await audit_log(user, "book_reject", "book", book_id, {"reason": body.reason})
    return {"status": "rejected"}


@router.post("/{book_id}/favorite")
async def toggle_favorite(book_id: str, user: dict = Depends(get_current_user)):
    existing = await db.favorites.find_one({"user_id": user["id"], "book_id": book_id})
    if existing:
        await db.favorites.delete_one({"_id": existing["_id"]})
        await db.books.update_one({"_id": oid(book_id)}, {"$inc": {"favorites_count": -1}})
        return {"favorite": False}
    await db.favorites.insert_one({"user_id": user["id"], "book_id": book_id, "created_at": now_iso()})
    await db.books.update_one({"_id": oid(book_id)}, {"$inc": {"favorites_count": 1}})
    return {"favorite": True}


class ProgressBody(BaseModel):
    page: int = 1
    percent: float = 0


@router.post("/{book_id}/progress")
async def save_progress(book_id: str, body: ProgressBody, user: dict = Depends(get_current_user)):
    existing = await db.reading_progress.find_one({"user_id": user["id"], "book_id": book_id})
    completed_before = existing and existing.get("percent", 0) >= 95
    await db.reading_progress.update_one(
        {"user_id": user["id"], "book_id": book_id},
        {"$set": {"page": body.page, "percent": body.percent, "updated_at": now_iso()},
         "$setOnInsert": {"created_at": now_iso()}}, upsert=True)
    if body.percent >= 95 and not completed_before:
        await bump_stat(user["id"], "books_read", 1)
        await award_xp(user["id"], await _points("read_book", 50), "إكمال قراءة كتاب", book_id)
        await create_notification(user["id"], "achievement", "أكملت كتاباً! 📚", "+نقاط خبرة")
    return {"ok": True}


class ReviewBody(BaseModel):
    rating: int = Field(ge=1, le=5)
    text: str = ""


@router.post("/{book_id}/review")
async def add_review(book_id: str, body: ReviewBody, user: dict = Depends(get_current_user)):
    b = await db.books.find_one({"_id": oid(book_id)})
    if not b:
        raise HTTPException(status_code=404, detail="الكتاب غير موجود")
    existing = await db.reviews.find_one({"user_id": user["id"], "book_id": book_id})
    await db.reviews.update_one({"user_id": user["id"], "book_id": book_id},
        {"$set": {"rating": body.rating, "text": body.text, "user_name": user["name"], "updated_at": now_iso()},
         "$setOnInsert": {"created_at": now_iso()}}, upsert=True)
    agg = await db.reviews.aggregate([{"$match": {"book_id": book_id}},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}}]).to_list(1)
    if agg:
        await db.books.update_one({"_id": oid(book_id)},
            {"$set": {"rating_avg": round(agg[0]["avg"], 1), "rating_count": agg[0]["count"]}})
    if not existing:
        await award_xp(user["id"], await _points("review_book", 20), "تقييم كتاب", book_id)
    return {"ok": True}


@router.get("/{book_id}/reviews")
async def list_reviews(book_id: str):
    docs = await db.reviews.find({"book_id": book_id}).sort("created_at", -1).to_list(100)
    return sers(docs)


@router.get("/me/recommendations")
async def recommendations(user: dict = Depends(get_current_user)):
    # interest-based: categories from favorites + reading progress
    favs = await db.favorites.find({"user_id": user["id"]}).to_list(200)
    progs = await db.reading_progress.find({"user_id": user["id"]}).to_list(200)
    read_ids = set([f["book_id"] for f in favs] + [p["book_id"] for p in progs])
    cats = {}
    for bid in read_ids:
        b = await db.books.find_one({"_id": oid(bid)})
        if b:
            cats[b["category"]] = cats.get(b["category"], 0) + 1
    query = {"status": "approved"}
    if read_ids:
        query["_id"] = {"$nin": [oid(x) for x in read_ids if oid(x)]}
    if cats:
        top = sorted(cats, key=cats.get, reverse=True)[:3]
        query["category"] = {"$in": top}
    docs = await db.books.find(query).sort("rating_avg", -1).limit(8).to_list(8)
    if len(docs) < 4:
        more = await db.books.find({"status": "approved"}).sort("views", -1).limit(8).to_list(8)
        seen = {str(d["_id"]) for d in docs}
        docs += [m for m in more if str(m["_id"]) not in seen]
    return [_book_out(b) for b in docs[:8]]
