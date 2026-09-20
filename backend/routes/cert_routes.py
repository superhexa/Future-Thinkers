"""شهادات PDF للفائزين في المسابقات (والفعاليات) — عربية مُشكَّلة عبر Amiri."""
import io
from pathlib import Path
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from db import db, oid
from auth import get_current_user
import arabic_reshaper
from bidi.algorithm import get_display
from reportlab.lib.pagesizes import landscape, A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors

router = APIRouter(prefix="/api/certificates")

ASSETS = Path(__file__).parent.parent / "assets"
_REG = False


def _fonts():
    global _REG
    if not _REG:
        pdfmetrics.registerFont(TTFont("Amiri", str(ASSETS / "Amiri-Regular.ttf")))
        pdfmetrics.registerFont(TTFont("Amiri-Bold", str(ASSETS / "Amiri-Bold.ttf")))
        _REG = True


def ar(text: str) -> str:
    return get_display(arabic_reshaper.reshape(str(text)))


def _build(name, title_line, subtitle, meta_lines):
    _fonts()
    buf = io.BytesIO()
    W, H = landscape(A4)
    c = canvas.Canvas(buf, pagesize=(W, H))
    # background + border
    c.setFillColor(colors.HexColor("#F6FBF9"))
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setStrokeColor(colors.HexColor("#059669"))
    c.setLineWidth(6)
    c.rect(18, 18, W - 36, H - 36)
    c.setStrokeColor(colors.HexColor("#0A192F"))
    c.setLineWidth(1.5)
    c.rect(30, 30, W - 60, H - 60)

    cx = W / 2
    c.setFillColor(colors.HexColor("#059669"))
    c.setFont("Amiri-Bold", 20)
    c.drawCentredString(cx, H - 80, ar("منصة مفكري المستقبل"))
    c.setFillColor(colors.HexColor("#64748B"))
    c.setFont("Amiri", 12)
    c.drawCentredString(cx, H - 100, ar("المملكة الأردنية الهاشمية"))

    c.setFillColor(colors.HexColor("#0A192F"))
    c.setFont("Amiri-Bold", 34)
    c.drawCentredString(cx, H - 165, ar("شهادة تقدير"))

    c.setFillColor(colors.HexColor("#475569"))
    c.setFont("Amiri", 14)
    c.drawCentredString(cx, H - 205, ar("تُمنح هذه الشهادة إلى"))

    c.setFillColor(colors.HexColor("#059669"))
    c.setFont("Amiri-Bold", 30)
    c.drawCentredString(cx, H - 250, ar(name))

    c.setFillColor(colors.HexColor("#334155"))
    c.setFont("Amiri", 15)
    c.drawCentredString(cx, H - 288, ar(title_line))
    if subtitle:
        c.setFont("Amiri-Bold", 16)
        c.setFillColor(colors.HexColor("#0A192F"))
        c.drawCentredString(cx, H - 315, ar(subtitle))

    y = 120
    c.setFont("Amiri", 12)
    c.setFillColor(colors.HexColor("#64748B"))
    for line in meta_lines:
        c.drawCentredString(cx, y, ar(line))
        y -= 20

    c.setFont("Amiri", 11)
    c.drawString(60, 55, ar(datetime.now().strftime("%Y-%m-%d")))
    c.drawRightString(W - 60, 55, ar("منصة مفكري المستقبل"))
    c.showPage()
    c.save()
    buf.seek(0)
    return buf


@router.get("/competition/{cid}")
async def competition_certificate(cid: str, user: dict = Depends(get_current_user)):
    comp = await db.competitions.find_one({"_id": oid(cid)})
    if not comp:
        raise HTTPException(status_code=404, detail="المسابقة غير موجودة")
    entry = await db.competition_entries.find_one({"competition_id": cid, "user_id": user["id"], "submitted": True})
    if not entry:
        raise HTTPException(status_code=403, detail="أكمل المسابقة أولاً للحصول على الشهادة")
    # compute rank
    higher = await db.competition_entries.count_documents(
        {"competition_id": cid, "submitted": True, "score": {"$gt": entry.get("score", 0)}})
    rank = higher + 1
    buf = _build(
        user["name"],
        f"لمشاركته المتميزة في مسابقة",
        comp["title"],
        [f"النتيجة: {entry.get('score', 0)}%  •  الترتيب: {rank}",
         f"الإجابات الصحيحة: {entry.get('correct', 0)} من {entry.get('total', 0)}"],
    )
    return StreamingResponse(buf, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=certificate-{cid}.pdf"})


@router.get("/event/{eid}")
async def event_certificate(eid: str, user: dict = Depends(get_current_user)):
    ev = await db.events.find_one({"_id": oid(eid)})
    if not ev:
        raise HTTPException(status_code=404, detail="الفعالية غير موجودة")
    reg = await db.event_registrations.find_one({"event_id": eid, "user_id": user["id"]})
    if not reg:
        raise HTTPException(status_code=403, detail="يجب التسجيل في الفعالية")
    buf = _build(user["name"], "لحضوره ومشاركته في فعالية", ev["title"],
                 [f"بتاريخ {ev.get('date', '')}", "شكراً لمساهمتك في مجتمع مفكري المستقبل"])
    return StreamingResponse(buf, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=event-{eid}.pdf"})
