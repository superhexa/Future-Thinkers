"""نادي البرمجة — code judge. Runs submitted Python against test cases in an
isolated subprocess (no network, cwd temp, wall-clock timeout). Real verdicts."""
import asyncio
import os
import tempfile
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from db import db, ser, sers, oid, now_iso
from auth import get_current_user
from services import award_xp, bump_stat, create_notification

router = APIRouter(prefix="/api/coding")

TIME_LIMIT = 5


@router.get("/problems")
async def list_problems(user: dict = Depends(get_current_user)):
    docs = await db.coding_problems.find({}).sort("difficulty", 1).to_list(100)
    solved = {s["problem_id"] for s in await db.coding_submissions.find(
        {"user_id": user["id"], "verdict": "accepted"}).to_list(500)}
    out = []
    for p in docs:
        d = ser(p)
        d.pop("tests", None)
        d["solved"] = d["id"] in solved
        d["solved_count"] = await db.coding_submissions.count_documents({"problem_id": d["id"], "verdict": "accepted"})
        out.append(d)
    return out


@router.get("/problems/{pid}")
async def get_problem(pid: str, user: dict = Depends(get_current_user)):
    p = await db.coding_problems.find_one({"_id": oid(pid)})
    if not p:
        raise HTTPException(status_code=404, detail="المسألة غير موجودة")
    d = ser(p)
    d["sample_tests"] = [{"input": t["input"], "output": t["output"]} for t in p.get("tests", [])[:2]]
    d.pop("tests", None)
    sub = await db.coding_submissions.find_one({"user_id": user["id"], "problem_id": pid, "verdict": "accepted"})
    d["solved"] = bool(sub)
    return d


class SubmitBody(BaseModel):
    code: str


async def _run(code: str, stdin: str) -> tuple[bool, str]:
    with tempfile.TemporaryDirectory() as tmp:
        path = os.path.join(tmp, "sol.py")
        with open(path, "w") as f:
            f.write(code)
        try:
            proc = await asyncio.create_subprocess_exec(
                "python3", path, cwd=tmp,
                stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE, env={"PATH": "/usr/bin:/bin"},
            )
            out, err = await asyncio.wait_for(proc.communicate(stdin.encode()), timeout=TIME_LIMIT)
            if proc.returncode != 0:
                return False, (err.decode()[:400] or "خطأ في التنفيذ")
            return True, out.decode()
        except asyncio.TimeoutError:
            try:
                proc.kill()
            except Exception:
                pass
            return False, "تجاوز الوقت المسموح"
        except Exception as e:
            return False, str(e)[:300]


@router.post("/problems/{pid}/submit")
async def submit(pid: str, body: SubmitBody, user: dict = Depends(get_current_user)):
    p = await db.coding_problems.find_one({"_id": oid(pid)})
    if not p:
        raise HTTPException(status_code=404, detail="المسألة غير موجودة")
    if len(body.code) > 20000:
        raise HTTPException(status_code=400, detail="الكود طويل جداً")
    tests = p.get("tests", [])
    passed = 0
    detail = ""
    verdict = "accepted"
    for i, t in enumerate(tests):
        ok, output = await _run(body.code, t["input"])
        if not ok:
            verdict = "error"
            detail = f"اختبار {i + 1}: {output}"
            break
        if output.strip() != t["output"].strip():
            verdict = "wrong_answer"
            detail = f"اختبار {i + 1}: نتيجة غير صحيحة"
            break
        passed += 1
    already = await db.coding_submissions.find_one({"user_id": user["id"], "problem_id": pid, "verdict": "accepted"})
    await db.coding_submissions.insert_one({
        "user_id": user["id"], "user_name": user["name"], "problem_id": pid,
        "problem_title": p["title"], "verdict": verdict, "passed": passed,
        "total": len(tests), "created_at": now_iso(),
    })
    if verdict == "accepted" and not already:
        await bump_stat(user["id"], "coding_solved", 1)
        await award_xp(user["id"], p.get("xp", 30), "حل مسألة برمجية", pid)
        await create_notification(user["id"], "achievement", "حل مقبول! 💻", f"{p['title']} — +{p.get('xp', 30)} خبرة")
    return {"verdict": verdict, "passed": passed, "total": len(tests), "detail": detail}


@router.get("/leaderboard")
async def coding_leaderboard(limit: int = 30):
    pipeline = [
        {"$match": {"verdict": "accepted"}},
        {"$group": {"_id": {"u": "$user_id", "p": "$problem_id"}, "name": {"$first": "$user_name"}}},
        {"$group": {"_id": "$_id.u", "name": {"$first": "$name"}, "solved": {"$sum": 1}}},
        {"$sort": {"solved": -1}}, {"$limit": limit},
    ]
    rows = await db.coding_submissions.aggregate(pipeline).to_list(limit)
    return [{"rank": i + 1, "id": r["_id"], "name": r["name"], "solved": r["solved"]} for i, r in enumerate(rows)]
