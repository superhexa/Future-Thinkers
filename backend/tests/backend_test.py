"""
Comprehensive backend test suite for Future Thinkers Platform.
Uses REACT_APP_BACKEND_URL from frontend/.env for public endpoint testing.
"""
import os
import io
import time
import uuid
import pytest
import requests
from pathlib import Path

# Load backend URL from frontend .env manually (no default)
def _load_backend_url():
    env_path = Path("/app/frontend/.env")
    for line in env_path.read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            return line.split("=", 1)[1].strip().strip('"').rstrip("/")
    raise RuntimeError("REACT_APP_BACKEND_URL not set")

BASE = _load_backend_url()
API = f"{BASE}/api"

ADMIN_EMAIL = "djcnnddicje@gmail.com"
ADMIN_PASSWORD = "Admin@12345"

STATE = {}  # cross-test shared state


def _post(path, json=None, token=None, files=None, data=None):
    h = {}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return requests.post(f"{API}{path}", json=json, headers=h, files=files, data=data, timeout=30)


def _get(path, token=None, params=None):
    h = {}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return requests.get(f"{API}{path}", headers=h, params=params, timeout=30)


def _put(path, json=None, token=None):
    h = {}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return requests.put(f"{API}{path}", json=json, headers=h, timeout=30)


# ---------- 1. Health / Public ----------
def test_health():
    r = requests.get(f"{API}/health", timeout=15)
    assert r.status_code == 200
    assert r.json().get("status") == "healthy"


def test_public_stats():
    r = _get("/stats/public")
    assert r.status_code == 200
    d = r.json()
    for k in ("students", "schools", "books", "directorates", "governorates"):
        assert k in d


# ---------- 2. Geo hierarchy ----------
def test_governorates_list():
    r = _get("/geo/governorates")
    assert r.status_code == 200
    govs = r.json()
    assert len(govs) >= 10
    STATE["gov_id"] = govs[0]["id"]


def test_directorates_and_schools():
    r = _get("/geo/directorates", params={"governorate_id": STATE["gov_id"]})
    assert r.status_code == 200
    dirs = r.json()
    assert len(dirs) >= 1
    # find directorate with schools
    for d in dirs:
        rs = _get("/geo/schools", params={"directorate_id": d["id"]})
        assert rs.status_code == 200
        schools = rs.json()
        if schools:
            STATE["school_id"] = schools[0]["id"]
            STATE["dir_id"] = d["id"]
            return
    pytest.fail("No schools found in any directorate")


# ---------- 3. Admin login ----------
def test_admin_login():
    r = _post("/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    d = r.json()
    assert "access_token" in d
    assert d["user"]["role"] == "super_admin"
    perms = d["user"].get("permissions", [])
    assert "event.create" in perms and "book.approve" in perms and "analytics.view" in perms
    STATE["admin_token"] = d["access_token"]
    STATE["admin_id"] = d["user"]["id"]


# ---------- 4. Student registration ----------
def test_student_register():
    assert "school_id" in STATE
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    body = {"name": "TEST Student", "email": email, "password": "Passw0rd!", "role": "student",
            "school_id": STATE["school_id"], "grade": "10"}
    r = _post("/auth/register", json=body)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["user"]["xp"] == 0
    assert d["user"]["role"] == "student"
    assert d["user"].get("school_id") == STATE["school_id"]
    assert "access_token" in d
    STATE["student_token"] = d["access_token"]
    STATE["student_id"] = d["user"]["id"]
    STATE["student_email"] = email

    # register second student for chess pairing
    email2 = f"test_{uuid.uuid4().hex[:8]}@example.com"
    r2 = _post("/auth/register", json={**body, "email": email2, "name": "TEST Student2"})
    assert r2.status_code == 200
    STATE["student2_token"] = r2.json()["access_token"]
    STATE["student2_id"] = r2.json()["user"]["id"]


def test_auth_me():
    r = _get("/auth/me", token=STATE["student_token"])
    assert r.status_code == 200
    assert r.json()["email"] == STATE["student_email"]


# ---------- 5. Dashboard ----------
def test_dashboard():
    r = _get("/dashboard", token=STATE["student_token"])
    assert r.status_code == 200
    d = r.json()
    for k in ("national_rank", "level", "currently_reading", "upcoming_events"):
        assert k in d


# ---------- 6. Books ----------
def test_list_books():
    r = _get("/books", params={"page": 1, "limit": 12})
    assert r.status_code == 200
    d = r.json()
    assert "items" in d and d["total"] >= 1
    STATE["book_id"] = d["items"][0]["id"]
    assert "pdf_url" in d["items"][0] or d["items"][0].get("external_pdf_url")


def test_book_detail_and_views():
    b1 = _get(f"/books/{STATE['book_id']}").json()
    v1 = b1.get("views", 0)
    b2 = _get(f"/books/{STATE['book_id']}").json()
    assert b2.get("views", 0) >= v1 + 1
    assert b2.get("pdf_url")


def test_book_favorite_toggle():
    r = _post(f"/books/{STATE['book_id']}/favorite", token=STATE["student_token"])
    assert r.status_code == 200
    assert r.json()["favorite"] is True
    r2 = _post(f"/books/{STATE['book_id']}/favorite", token=STATE["student_token"])
    assert r2.json()["favorite"] is False
    # leave it favorited for recs
    _post(f"/books/{STATE['book_id']}/favorite", token=STATE["student_token"])


def test_book_progress_awards_xp():
    me_before = _get("/gamification/me", token=STATE["student_token"]).json()
    xp_b = me_before["xp"]
    r = _post(f"/books/{STATE['book_id']}/progress", json={"page": 100, "percent": 100},
              token=STATE["student_token"])
    assert r.status_code == 200
    me_after = _get("/gamification/me", token=STATE["student_token"]).json()
    assert me_after["xp"] > xp_b, f"XP not awarded on completion: {xp_b} -> {me_after['xp']}"
    assert me_after["stats"].get("books_read", 0) >= 1


def test_book_review():
    r = _post(f"/books/{STATE['book_id']}/review", json={"rating": 5, "text": "TEST review"},
              token=STATE["student_token"])
    assert r.status_code == 200
    b = _get(f"/books/{STATE['book_id']}").json()
    assert b.get("rating_avg", 0) >= 1


def test_book_recommendations():
    r = _get("/books/me/recommendations", token=STATE["student_token"])
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ---------- 7. Gamification ----------
def test_daily_checkin():
    me_b = _get("/gamification/me", token=STATE["student_token"]).json()
    r = _post("/gamification/checkin", token=STATE["student_token"])
    assert r.status_code == 200
    d = r.json()
    assert "streak" in d
    me_a = _get("/gamification/me", token=STATE["student_token"]).json()
    assert "level_progress" in me_a


# ---------- 8. Clubs ----------
def test_clubs_list_and_join():
    r = _get("/clubs", token=STATE["student_token"])
    assert r.status_code == 200
    clubs = r.json()
    assert len(clubs) >= 5, f"Expected >=5 clubs, got {len(clubs)}"
    slug = clubs[0]["slug"]
    STATE["club_slug"] = slug
    rj = _post(f"/clubs/{slug}/join", token=STATE["student_token"])
    assert rj.status_code == 200 and rj.json()["joined"] is True
    rm = _get(f"/clubs/{slug}/members")
    assert rm.status_code == 200
    rl = _post(f"/clubs/{slug}/leave", token=STATE["student_token"])
    assert rl.status_code == 200


# ---------- 9. Dialogue Forum ----------
def test_discussion_flow():
    body = {"title": "TEST نقاش تجريبي", "body": "محتوى تجريبي", "category": "مجتمع", "club_slug": "dialogue"}
    r = _post("/discussions", json=body, token=STATE["student_token"])
    assert r.status_code == 200
    disc_id = r.json()["id"]
    STATE["disc_id"] = disc_id
    d = _get(f"/discussions/{disc_id}").json()
    assert d["title"] == body["title"]
    rr = _post(f"/discussions/{disc_id}/reply", json={"body": "TEST reply"}, token=STATE["student2_token"])
    assert rr.status_code == 200
    rl = _post(f"/discussions/{disc_id}/like", token=STATE["student2_token"])
    assert rl.status_code == 200 and rl.json()["liked"] is True
    rf = _post(f"/discussions/{disc_id}/follow", token=STATE["student2_token"])
    assert rf.status_code == 200
    d2 = _get(f"/discussions/{disc_id}").json()
    assert d2["replies_count"] >= 1 and d2["likes_count"] >= 1


# ---------- 10. Chess ----------
def test_chess_quick_match():
    # first quick-match waits
    r1 = _post("/chess/challenge", json={"opponent_id": None}, token=STATE["student_token"])
    assert r1.status_code == 200
    assert r1.json()["status"] in ("waiting", "started")
    # second quick-match should start a game
    r2 = _post("/chess/challenge", json={"opponent_id": None}, token=STATE["student2_token"])
    assert r2.status_code == 200
    assert r2.json().get("status") == "started", r2.text
    gid = r2.json()["game_id"]
    STATE["chess_game_id"] = gid

    g = _get(f"/chess/games/{gid}", token=STATE["student_token"]).json()
    assert g["turn"] == "w"
    white_token = STATE["student_token"] if g["my_color"] == "w" else STATE["student2_token"]
    black_token = STATE["student2_token"] if white_token == STATE["student_token"] else STATE["student_token"]

    # legal move by white
    mr = _post(f"/chess/games/{gid}/move",
               json={"fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
                     "san": "e4", "turn": "b"}, token=white_token)
    assert mr.status_code == 200, mr.text

    # black tries to move on wrong turn... after white move, it's black's turn -> should succeed
    mr2 = _post(f"/chess/games/{gid}/move",
                json={"fen": "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2",
                      "san": "e5", "turn": "w"}, token=black_token)
    assert mr2.status_code == 200

    # white tries again - it's white's turn now, ok. Test turn validation: black attempts.
    mr3 = _post(f"/chess/games/{gid}/move",
                json={"fen": "x", "san": "Nf6", "turn": "w"}, token=black_token)
    assert mr3.status_code == 400  # not black's turn


def test_chess_leaderboard():
    r = _get("/chess/leaderboard")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_chess_players():
    r = _get("/chess/players", token=STATE["student_token"], params={"q": "TEST"})
    assert r.status_code == 200


# ---------- 11. Events ----------
def test_admin_create_event_and_register():
    body = {"title": "TEST Event", "date": "2026-12-31", "time": "10:00", "location": "عمان",
            "scope": "national", "capacity": 100}
    r = _post("/events", json=body, token=STATE["admin_token"])
    assert r.status_code == 200, r.text
    eid = r.json()["id"]
    STATE["event_id"] = eid

    # student registers
    xp_before = _get("/gamification/me", token=STATE["student_token"]).json()["xp"]
    rr = _post(f"/events/{eid}/register", token=STATE["student_token"])
    assert rr.status_code == 200
    d = rr.json()
    assert d["registered"] is True and d.get("qr_code")
    xp_after = _get("/gamification/me", token=STATE["student_token"]).json()["xp"]
    assert xp_after > xp_before

    # participants requires permission
    rp = _get(f"/events/{eid}/participants", token=STATE["admin_token"])
    assert rp.status_code == 200
    rp_forbidden = _get(f"/events/{eid}/participants", token=STATE["student_token"])
    assert rp_forbidden.status_code == 403


# ---------- 12. Competitions ----------
def test_competition_full_flow():
    body = {"title": "TEST Quiz", "type": "quiz", "start_at": "2026-01-01T00:00:00",
            "end_at": "2027-01-01T00:00:00", "duration_minutes": 30,
            "questions": [
                {"text": "2+2?", "options": ["3", "4", "5", "6"], "correct": 1},
                {"text": "Capital of Jordan?", "options": ["Cairo", "Amman", "Beirut", "Doha"], "correct": 1},
            ]}
    r = _post("/competitions", json=body, token=STATE["admin_token"])
    assert r.status_code == 200
    cid = r.json()["id"]
    # student registers
    rr = _post(f"/competitions/{cid}/register", token=STATE["student_token"])
    assert rr.status_code == 200
    # get comp - correct answers must be hidden
    cd = _get(f"/competitions/{cid}", token=STATE["student_token"]).json()
    assert all("correct" not in q for q in cd.get("questions", []))
    # submit
    rs = _post(f"/competitions/{cid}/submit", json={"answers": [1, 1]}, token=STATE["student_token"])
    assert rs.status_code == 200
    d = rs.json()
    assert d["score"] == 100 and d["correct"] == 2
    # leaderboard
    lb = _get(f"/competitions/{cid}/leaderboard").json()
    assert len(lb) >= 1 and lb[0]["score"] == 100


# ---------- 13. Leaderboards ----------
def test_leaderboards():
    for period in ("all", "weekly", "monthly"):
        r = _get("/leaderboard", params={"scope": "national", "period": period})
        assert r.status_code == 200
    for path in ("/leaderboard/schools", "/leaderboard/directorates", "/leaderboard/governorates"):
        r = _get(path)
        assert r.status_code == 200


# ---------- 14. Moderation (book upload/approve) ----------
def test_book_upload_and_approve():
    # fake pdf
    pdf_bytes = b"%PDF-1.4\n%TEST\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"
    files = {"pdf": ("test.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    data = {"title": "TEST Uploaded Book", "author": "TEST Author",
            "description": "test", "category": "science", "language": "العربية",
            "pages": 10, "year": 2026, "publisher": "TEST", "age": "عام", "tags": "test"}
    r = requests.post(f"{API}/books",
                      headers={"Authorization": f"Bearer {STATE['student_token']}"},
                      files=files, data=data, timeout=30)
    assert r.status_code == 200, r.text
    bid = r.json()["id"]
    assert r.json()["status"] == "pending"

    # admin sees pending
    rp = _get("/books/pending", token=STATE["admin_token"])
    assert rp.status_code == 200
    ids = [b["id"] for b in rp.json()]
    assert bid in ids

    # approve
    ra = _post(f"/books/{bid}/approve", token=STATE["admin_token"])
    assert ra.status_code == 200
    # verify approved
    b = _get(f"/books/{bid}").json()
    assert b["status"] == "approved"


# ---------- 15. Notifications ----------
def test_notifications():
    r = _get("/notifications/unread-count", token=STATE["student_token"])
    assert r.status_code == 200
    assert "count" in r.json()
    rl = _get("/notifications", token=STATE["student_token"])
    assert rl.status_code == 200
    ra = _post("/notifications/read-all", token=STATE["student_token"])
    assert ra.status_code == 200
    rc2 = _get("/notifications/unread-count", token=STATE["student_token"]).json()
    assert rc2["count"] == 0


# ---------- 16. Search ----------
def test_search():
    r = _get("/search", params={"q": "TEST"})
    assert r.status_code == 200
    d = r.json()
    for k in ("books", "discussions", "events", "students", "schools"):
        assert k in d


# ---------- 17. Admin overview / analytics / users / points / audit ----------
def test_admin_endpoints():
    r = _get("/admin/overview", token=STATE["admin_token"])
    assert r.status_code == 200
    o = r.json()
    assert o["students"] >= 2 and o["schools"] >= 1

    ra = _get("/admin/analytics", token=STATE["admin_token"])
    assert ra.status_code == 200
    assert "books_by_category" in ra.json()

    ru = _get("/admin/users", token=STATE["admin_token"], params={"q": "TEST"})
    assert ru.status_code == 200

    rp = _get("/admin/points-config", token=STATE["admin_token"])
    assert rp.status_code == 200

    rl = _get("/admin/audit-logs", token=STATE["admin_token"])
    assert rl.status_code == 200


def test_admin_broadcast():
    r = _post("/admin/broadcast", json={"title": "TEST bcast", "body": "hello", "scope": "all"},
              token=STATE["admin_token"])
    assert r.status_code == 200
    assert r.json()["sent"] >= 1


def test_admin_role_change():
    # change student's role and revert
    r = _put(f"/admin/users/{STATE['student2_id']}/role", json={"role": "teacher"},
             token=STATE["admin_token"])
    assert r.status_code == 200
    r2 = _put(f"/admin/users/{STATE['student2_id']}/role", json={"role": "student"},
              token=STATE["admin_token"])
    assert r2.status_code == 200


# ---------- 18. RBAC ----------
def test_rbac_student_forbidden():
    # student cannot create event
    r = _post("/events", json={"title": "x", "date": "2026-01-01"}, token=STATE["student_token"])
    assert r.status_code == 403
    # student cannot see admin overview
    r2 = _get("/admin/overview", token=STATE["student_token"])
    assert r2.status_code == 403
    # student cannot see admin users
    r3 = _get("/admin/users", token=STATE["student_token"])
    assert r3.status_code == 403


def test_unauth_endpoints():
    r = _get("/auth/me")
    assert r.status_code == 401
    r2 = _get("/dashboard")
    assert r2.status_code == 401
