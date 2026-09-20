from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.requests import Request
from starlette.middleware.cors import CORSMiddleware

from db import db, client  # noqa
from seed import seed_all
from storage import init_storage

from routes.auth_routes import router as auth_router
from routes.geo_routes import router as geo_router
from routes.books_routes import router as books_router
from routes.files_routes import router as files_router
from routes.community_routes import router as community_router
from routes.chess_routes import router as chess_router
from routes.events_routes import router as events_router
from routes.leaderboard_routes import router as leaderboard_router
from routes.social_routes import router as social_router
from routes.content_routes import router as content_router
from routes.admin_routes import router as admin_router
from routes.coding_routes import router as coding_router
from routes.showcase_routes import router as showcase_router
from routes.cert_routes import router as cert_router
from ws import hub
import jwt
from bson import ObjectId
from auth import get_secret

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("future-thinkers")

app = FastAPI(title="منصة مفكري المستقبل API", version="1.0.0")

for r in (auth_router, geo_router, books_router, files_router, community_router,
          chess_router, events_router, leaderboard_router, social_router,
          content_router, admin_router, coding_router, showcase_router, cert_router):
    app.include_router(r)


async def _ws_user(websocket, token):
    try:
        payload = jwt.decode(token, get_secret(), algorithms=["HS256"])
        return payload.get("sub")
    except Exception:
        return None


@app.websocket("/api/ws/notifications")
async def ws_notifications(websocket: WebSocket):
    await websocket.accept()
    uid = await _ws_user(websocket, websocket.query_params.get("token"))
    if not uid:
        await websocket.close(code=1008)
        return
    await hub.join(hub.user_conns, uid, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await hub.leave(hub.user_conns, uid, websocket)


@app.websocket("/api/ws/chess/{game_id}")
async def ws_chess(websocket: WebSocket, game_id: str):
    await websocket.accept()
    uid = await _ws_user(websocket, websocket.query_params.get("token"))
    if not uid:
        await websocket.close(code=1008)
        return
    await hub.join(hub.game_conns, game_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await hub.leave(hub.game_conns, game_id, websocket)


@app.get("/api/")
async def root():
    return {"message": "Future Thinkers Platform API", "status": "ok"}


@app.get("/api/health")
async def health():
    return {"status": "healthy"}


@app.exception_handler(Exception)
async def global_error_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "حدث خطأ غير متوقع، يرجى المحاولة لاحقاً"})


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    await seed_all()
    logger.info("Seed complete")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
