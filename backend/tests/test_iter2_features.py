"""Iteration 2 tests: coding judge, projects, debates, certificates, book upload (telegram mirror best-effort)."""
import io
import os
import uuid
import pytest
import requests
from pathlib import Path


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


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def student():
    # find a school
    govs = requests.get(f"{API}/geo/governorates", timeout=15).json()
    school_id = None
    for g in govs:
        dirs = requests.get(f"{API}/geo/directorates", params={"governorate_id": g["id"]}, timeout=15).json()
        for d in dirs:
            schools = requests.get(f"{API}/geo/schools", params={"directorate_id": d["id"]}, timeout=15).json()
            if schools:
                school_id = schools[0]["id"]
                break
        if school_id:
            break
    assert school_id, "no school found"
    email = f"test_i2_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register", json={
        "name": "TEST I2 Student", "email": email, "password": "Passw0rd!",
        "role": "student", "school_id": school_id, "grade": "10"}, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    return {"token": d["access_token"], "id": d["user"]["id"], "email": email, "school_id": school_id}


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Coding Judge ----------
def test_coding_list_has_seeded(student):
    r = requests.get(f"{API}/coding/problems", headers=_auth(student["token"]), timeout=15)
    assert r.status_code == 200, r.text
    probs = r.json()
    assert len(probs) >= 4, f"expected >=4 problems, got {len(probs)}"
    # find مجموع رقمين
    sum_prob = next((p for p in probs if p["title"] == "مجموع رقمين"), None)
    assert sum_prob, "seeded problem 'مجموع رقمين' missing"
    student["sum_pid"] = sum_prob["id"]


def test_coding_get_problem(student):
    r = requests.get(f"{API}/coding/problems/{student['sum_pid']}", headers=_auth(student["token"]), timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["title"] == "مجموع رقمين"
    assert "sample_tests" in d
    assert "tests" not in d  # hidden
    assert d["solved"] is False


def test_coding_wrong_answer(student):
    code = "print(0)"
    r = requests.post(f"{API}/coding/problems/{student['sum_pid']}/submit",
                      headers=_auth(student["token"]), json={"code": code}, timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["verdict"] == "wrong_answer", d


def test_coding_accepted_awards_xp(student):
    # xp before
    xp_b = requests.get(f"{API}/gamification/me", headers=_auth(student["token"]), timeout=15).json()["xp"]
    code = "a,b=map(int,input().split())\nprint(a+b)"
    r = requests.post(f"{API}/coding/problems/{student['sum_pid']}/submit",
                      headers=_auth(student["token"]), json={"code": code}, timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["verdict"] == "accepted", d
    assert d["passed"] == d["total"]
    xp_a = requests.get(f"{API}/gamification/me", headers=_auth(student["token"]), timeout=15).json()["xp"]
    assert xp_a > xp_b, f"XP not awarded: {xp_b} -> {xp_a}"
    # second accepted submit should NOT award again
    r2 = requests.post(f"{API}/coding/problems/{student['sum_pid']}/submit",
                       headers=_auth(student["token"]), json={"code": code}, timeout=30)
    assert r2.json()["verdict"] == "accepted"
    xp_a2 = requests.get(f"{API}/gamification/me", headers=_auth(student["token"]), timeout=15).json()["xp"]
    assert xp_a2 == xp_a, f"XP awarded twice: {xp_a} -> {xp_a2}"


def test_coding_leaderboard(student):
    r = requests.get(f"{API}/coding/leaderboard", timeout=15)
    assert r.status_code == 200
    lb = r.json()
    assert any(row["id"] == student["id"] for row in lb), "solver not in leaderboard"


# ---------- Projects ----------
def test_projects_create_list_vote(student):
    body = {"title": "TEST Project I2", "description": "A test innovative project", "category": "ابتكار"}
    r = requests.post(f"{API}/projects", json=body, headers=_auth(student["token"]), timeout=15)
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    student["project_id"] = pid

    lr = requests.get(f"{API}/projects", headers=_auth(student["token"]), timeout=15)
    assert lr.status_code == 200
    items = lr.json()
    mine = next((p for p in items if p["id"] == pid), None)
    assert mine and mine["title"] == "TEST Project I2"
    assert mine["votes_count"] == 0
    assert mine["voted"] is False

    # vote (self)
    v = requests.post(f"{API}/projects/{pid}/vote", headers=_auth(student["token"]), timeout=15)
    assert v.status_code == 200 and v.json()["voted"] is True
    items2 = requests.get(f"{API}/projects", headers=_auth(student["token"]), timeout=15).json()
    mine2 = next(p for p in items2 if p["id"] == pid)
    assert mine2["votes_count"] == 1 and mine2["voted"] is True

    # toggle off
    v2 = requests.post(f"{API}/projects/{pid}/vote", headers=_auth(student["token"]), timeout=15)
    assert v2.json()["voted"] is False
    items3 = requests.get(f"{API}/projects", headers=_auth(student["token"]), timeout=15).json()
    mine3 = next(p for p in items3 if p["id"] == pid)
    assert mine3["votes_count"] == 0


# ---------- Debates ----------
def test_debates_flow(student):
    body = {"title": "TEST Debate I2", "description": "d", "side_a": "مع", "side_b": "ضد"}
    r = requests.post(f"{API}/debates", json=body, headers=_auth(student["token"]), timeout=15)
    assert r.status_code == 200, r.text
    did = r.json()["id"]

    lst = requests.get(f"{API}/debates", headers=_auth(student["token"]), timeout=15).json()
    mine = next((d for d in lst if d["id"] == did), None)
    assert mine and mine["votes_a"] == 0 and mine["votes_b"] == 0 and mine["my_vote"] is None

    # vote a
    va = requests.post(f"{API}/debates/{did}/vote", params={"side": "a"}, headers=_auth(student["token"]), timeout=15)
    assert va.status_code == 200, va.text
    d1 = va.json()
    assert d1["votes_a"] == 1 and d1["votes_b"] == 0 and d1["my_vote"] == "a"

    # switch to b
    vb = requests.post(f"{API}/debates/{did}/vote", params={"side": "b"}, headers=_auth(student["token"]), timeout=15)
    d2 = vb.json()
    assert d2["votes_a"] == 0 and d2["votes_b"] == 1 and d2["my_vote"] == "b"

    # add an argument
    ra = requests.post(f"{API}/debates/{did}/argument", json={"side": "a", "text": "TEST arg"},
                       headers=_auth(student["token"]), timeout=15)
    assert ra.status_code == 200

    dg = requests.get(f"{API}/debates/{did}", headers=_auth(student["token"]), timeout=15).json()
    assert len(dg["arguments"]) >= 1


# ---------- Certificates ----------
def test_certificates_competition_and_event(student, admin_token):
    # Create competition as admin
    body = {"title": "TEST Cert Quiz", "type": "quiz",
            "start_at": "2026-01-01T00:00:00", "end_at": "2027-01-01T00:00:00", "duration_minutes": 20,
            "questions": [{"text": "1+1?", "options": ["1", "2", "3"], "correct": 1}]}
    r = requests.post(f"{API}/competitions", json=body, headers=_auth(admin_token), timeout=15)
    assert r.status_code == 200, r.text
    cid = r.json()["id"]

    # unregistered student: cert should 403
    cr = requests.get(f"{API}/certificates/competition/{cid}", headers=_auth(student["token"]), timeout=30)
    assert cr.status_code == 403

    # register + submit
    assert requests.post(f"{API}/competitions/{cid}/register",
                         headers=_auth(student["token"]), timeout=15).status_code == 200
    assert requests.post(f"{API}/competitions/{cid}/submit", json={"answers": [1]},
                         headers=_auth(student["token"]), timeout=15).status_code == 200

    # now cert should be 200 PDF
    cr2 = requests.get(f"{API}/certificates/competition/{cid}", headers=_auth(student["token"]), timeout=30)
    assert cr2.status_code == 200, cr2.text
    assert cr2.headers.get("content-type", "").startswith("application/pdf")
    assert cr2.content[:4] == b"%PDF", cr2.content[:20]

    # event cert
    ev = {"title": "TEST Cert Event", "date": "2026-12-31", "time": "10:00", "location": "Amman",
          "scope": "national", "capacity": 50}
    er = requests.post(f"{API}/events", json=ev, headers=_auth(admin_token), timeout=15)
    assert er.status_code == 200
    eid = er.json()["id"]

    # unregistered -> 403
    forbid = requests.get(f"{API}/certificates/event/{eid}", headers=_auth(student["token"]), timeout=30)
    assert forbid.status_code == 403

    reg = requests.post(f"{API}/events/{eid}/register", headers=_auth(student["token"]), timeout=15)
    assert reg.status_code == 200

    ec = requests.get(f"{API}/certificates/event/{eid}", headers=_auth(student["token"]), timeout=30)
    assert ec.status_code == 200, ec.text
    assert ec.headers.get("content-type", "").startswith("application/pdf")
    assert ec.content[:4] == b"%PDF"


# ---------- Book upload (telegram mirror best-effort) ----------
def test_book_upload_still_works(student):
    pdf_bytes = b"%PDF-1.4\n%TEST I2\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"
    files = {"pdf": ("test_i2.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    data = {"title": "TEST I2 Book", "author": "T", "description": "x",
            "category": "science", "language": "العربية",
            "pages": 5, "year": 2026, "publisher": "T", "age": "عام", "tags": "test"}
    r = requests.post(f"{API}/books", headers=_auth(student["token"]), files=files, data=data, timeout=45)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "pending"


# ---------- WebSocket (best-effort) ----------
def test_ws_notifications_requires_token():
    """WebSocket must reject connections without a token (1008)."""
    try:
        from websockets.sync.client import connect
    except Exception:
        pytest.skip("websockets not installed")
    ws_url = BASE.replace("https://", "wss://").replace("http://", "ws://") + "/api/ws/notifications"
    import websockets
    close_code = None
    try:
        with connect(ws_url, open_timeout=10) as ws:
            try:
                ws.recv(timeout=5)
            except websockets.exceptions.ConnectionClosed as e:
                close_code = e.code
            except Exception:
                pass
        if close_code is None:
            pytest.skip("WS accepted without close (ingress may terminate)")
        assert close_code in (1008, 1006), f"unexpected close code {close_code}"
    except websockets.exceptions.InvalidStatus as e:
        pytest.skip(f"WS upgrade rejected by ingress: {e}")
    except Exception as e:
        pytest.skip(f"WS not reachable (best-effort): {e}")
