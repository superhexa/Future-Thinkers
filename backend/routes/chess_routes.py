from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from bson import ObjectId
from db import db, ser, sers, oid, now_iso
from auth import get_current_user
from services import award_xp, bump_stat, create_notification

router = APIRouter(prefix="/api/chess")

START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
K = 32


def expected(a, b):
    return 1 / (1 + 10 ** ((b - a) / 400))


class ChallengeBody(BaseModel):
    opponent_id: str | None = None  # None => open challenge (quick match)


def _game_out(g):
    d = ser(g)
    return d


@router.post("/challenge")
async def create_challenge(body: ChallengeBody, user: dict = Depends(get_current_user)):
    if body.opponent_id:
        if body.opponent_id == user["id"]:
            raise HTTPException(status_code=400, detail="لا يمكنك تحدي نفسك")
        opp = await db.users.find_one({"_id": oid(body.opponent_id)})
        if not opp:
            raise HTTPException(status_code=404, detail="اللاعب غير موجود")
        doc = {"challenger_id": user["id"], "challenger_name": user["name"],
               "opponent_id": body.opponent_id, "opponent_name": opp["name"],
               "status": "pending", "open": False, "created_at": now_iso()}
        res = await db.chess_challenges.insert_one(doc)
        await create_notification(body.opponent_id, "chess", "تحدي شطرنج جديد ♟️",
                                  f"{user['name']} يتحداك في مباراة", "/clubs/chess")
        return {"id": str(res.inserted_id), "status": "pending"}
    # open challenge: try to match an existing open one from someone else
    open_ch = await db.chess_challenges.find_one({"status": "pending", "open": True, "challenger_id": {"$ne": user["id"]}})
    if open_ch:
        return await _start_game(open_ch, user)
    doc = {"challenger_id": user["id"], "challenger_name": user["name"],
           "opponent_id": None, "opponent_name": None, "status": "pending", "open": True, "created_at": now_iso()}
    res = await db.chess_challenges.insert_one(doc)
    return {"id": str(res.inserted_id), "status": "waiting"}


async def _start_game(challenge, accepter):
    white = challenge["challenger_id"]
    black = accepter["id"]
    wu = await db.users.find_one({"_id": oid(white)})
    doc = {
        "white_id": white, "white_name": challenge["challenger_name"],
        "black_id": black, "black_name": accepter["name"],
        "white_rating": wu.get("chess_rating", 1200) if wu else 1200,
        "black_rating": accepter.get("chess_rating", 1200),
        "fen": START_FEN, "pgn": "", "moves": [], "turn": "w",
        "status": "active", "result": None, "winner_id": None,
        "created_at": now_iso(), "updated_at": now_iso(),
    }
    res = await db.chess_games.insert_one(doc)
    gid = str(res.inserted_id)
    await db.chess_challenges.update_one({"_id": challenge["_id"]}, {"$set": {"status": "accepted", "game_id": gid}})
    await create_notification(white, "chess", "بدأت مباراة الشطرنج ♟️", f"ضد {accepter['name']}", f"/chess/{gid}")
    return {"game_id": gid, "status": "started"}


@router.get("/challenges")
async def my_challenges(user: dict = Depends(get_current_user)):
    incoming = await db.chess_challenges.find({"opponent_id": user["id"], "status": "pending"}).to_list(50)
    outgoing = await db.chess_challenges.find({"challenger_id": user["id"], "status": "pending"}).to_list(50)
    return {"incoming": sers(incoming), "outgoing": sers(outgoing)}


@router.post("/challenges/{cid}/accept")
async def accept_challenge(cid: str, user: dict = Depends(get_current_user)):
    ch = await db.chess_challenges.find_one({"_id": oid(cid)})
    if not ch or ch["status"] != "pending":
        raise HTTPException(status_code=404, detail="التحدي غير موجود")
    if ch.get("opponent_id") and ch["opponent_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="هذا التحدي ليس لك")
    return await _start_game(ch, user)


@router.post("/challenges/{cid}/decline")
async def decline_challenge(cid: str, user: dict = Depends(get_current_user)):
    await db.chess_challenges.update_one({"_id": oid(cid)}, {"$set": {"status": "declined"}})
    return {"status": "declined"}


@router.get("/games")
async def my_games(user: dict = Depends(get_current_user)):
    docs = await db.chess_games.find({"$or": [{"white_id": user["id"]}, {"black_id": user["id"]}]}).sort("updated_at", -1).limit(30).to_list(30)
    return sers(docs)


@router.get("/games/{gid}")
async def get_game(gid: str, user: dict = Depends(get_current_user)):
    g = await db.chess_games.find_one({"_id": oid(gid)})
    if not g:
        raise HTTPException(status_code=404, detail="المباراة غير موجودة")
    d = _game_out(g)
    d["my_color"] = "w" if g["white_id"] == user["id"] else ("b" if g["black_id"] == user["id"] else None)
    return d


class MoveBody(BaseModel):
    fen: str
    san: str
    pgn: str = ""
    turn: str  # next turn after move: 'w' or 'b'


@router.post("/games/{gid}/move")
async def make_move(gid: str, body: MoveBody, user: dict = Depends(get_current_user)):
    g = await db.chess_games.find_one({"_id": oid(gid)})
    if not g or g["status"] != "active":
        raise HTTPException(status_code=400, detail="المباراة غير نشطة")
    my_color = "w" if g["white_id"] == user["id"] else ("b" if g["black_id"] == user["id"] else None)
    if my_color is None:
        raise HTTPException(status_code=403, detail="لست لاعباً في هذه المباراة")
    if g["turn"] != my_color:
        raise HTTPException(status_code=400, detail="ليس دورك")
    await db.chess_games.update_one({"_id": g["_id"]}, {
        "$set": {"fen": body.fen, "pgn": body.pgn, "turn": body.turn, "updated_at": now_iso()},
        "$push": {"moves": {"san": body.san, "by": user["id"], "at": now_iso()}}})
    opp = g["black_id"] if my_color == "w" else g["white_id"]
    await create_notification(opp, "chess", "دورك في الشطرنج ♟️", "لعب خصمك نقلته", f"/chess/{gid}")
    return {"ok": True}


class ResultBody(BaseModel):
    result: str  # 'white' | 'black' | 'draw'


@router.post("/games/{gid}/result")
async def report_result(gid: str, body: ResultBody, user: dict = Depends(get_current_user)):
    g = await db.chess_games.find_one({"_id": oid(gid)})
    if not g or g["status"] != "active":
        raise HTTPException(status_code=400, detail="المباراة منتهية أو غير موجودة")
    if user["id"] not in (g["white_id"], g["black_id"]):
        raise HTTPException(status_code=403, detail="لست لاعباً")
    await _finalize(g, body.result)
    return {"status": "finished", "result": body.result}


@router.post("/games/{gid}/resign")
async def resign(gid: str, user: dict = Depends(get_current_user)):
    g = await db.chess_games.find_one({"_id": oid(gid)})
    if not g or g["status"] != "active":
        raise HTTPException(status_code=400, detail="المباراة منتهية")
    if user["id"] not in (g["white_id"], g["black_id"]):
        raise HTTPException(status_code=403, detail="لست لاعباً")
    result = "black" if g["white_id"] == user["id"] else "white"
    await _finalize(g, result, resigned_by=user["id"])
    return {"status": "finished", "result": result}


async def _finalize(g, result, resigned_by=None):
    wr, br = g["white_rating"], g["black_rating"]
    sw = 1 if result == "white" else (0 if result == "black" else 0.5)
    new_wr = round(wr + K * (sw - expected(wr, br)))
    new_br = round(br + K * ((1 - sw) - expected(br, wr)))
    winner_id = g["white_id"] if result == "white" else (g["black_id"] if result == "black" else None)
    await db.chess_games.update_one({"_id": g["_id"]}, {"$set": {
        "status": "finished", "result": result, "winner_id": winner_id,
        "white_rating_after": new_wr, "black_rating_after": new_br,
        "resigned_by": resigned_by, "updated_at": now_iso()}})
    await db.users.update_one({"_id": oid(g["white_id"])}, {"$set": {"chess_rating": new_wr}})
    await db.users.update_one({"_id": oid(g["black_id"])}, {"$set": {"chess_rating": new_br}})
    s = await db.settings.find_one({"key": "points_config"})
    pc = (s or {}).get("value", {})
    for pid in (g["white_id"], g["black_id"]):
        await bump_stat(pid, "chess_games", 1)
        await award_xp(pid, pc.get("play_chess", 10), "لعب مباراة شطرنج", str(g["_id"]))
    if winner_id:
        await bump_stat(winner_id, "chess_wins", 1)
        await award_xp(winner_id, pc.get("win_chess", 30), "الفوز بمباراة شطرنج", str(g["_id"]))
        await create_notification(winner_id, "chess", "فزت بالمباراة! 🏆", "+تقييم ونقاط خبرة")


@router.get("/leaderboard")
async def chess_leaderboard(limit: int = 50):
    docs = await db.users.find({"chess_rating": {"$exists": True}}).sort("chess_rating", -1).limit(limit).to_list(limit)
    return [{"id": str(u["_id"]), "name": u["name"], "school_name": u.get("school_name"),
             "governorate_name": u.get("governorate_name"), "rating": u.get("chess_rating", 1200),
             "wins": u.get("stats", {}).get("chess_wins", 0), "games": u.get("stats", {}).get("chess_games", 0)}
            for u in docs]


@router.get("/players")
async def searchable_players(q: str = "", limit: int = 20, user: dict = Depends(get_current_user)):
    query = {"_id": {"$ne": oid(user["id"])}, "role": "student"}
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    docs = await db.users.find(query).limit(limit).to_list(limit)
    return [{"id": str(u["_id"]), "name": u["name"], "school_name": u.get("school_name"),
             "rating": u.get("chess_rating", 1200)} for u in docs]
