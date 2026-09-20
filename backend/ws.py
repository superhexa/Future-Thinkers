"""Lightweight in-process WebSocket hub for real-time chess moves & notifications.
Polling remains as a fallback on the frontend, so a dropped socket never blocks UX."""
import asyncio
from typing import Dict, Set
from fastapi import WebSocket


class Hub:
    def __init__(self):
        self.user_conns: Dict[str, Set[WebSocket]] = {}
        self.game_conns: Dict[str, Set[WebSocket]] = {}
        self.lock = asyncio.Lock()

    async def join(self, bucket: Dict[str, Set[WebSocket]], key: str, ws: WebSocket):
        async with self.lock:
            bucket.setdefault(key, set()).add(ws)

    async def leave(self, bucket: Dict[str, Set[WebSocket]], key: str, ws: WebSocket):
        async with self.lock:
            if key in bucket:
                bucket[key].discard(ws)
                if not bucket[key]:
                    bucket.pop(key, None)

    async def _send(self, conns: Set[WebSocket], data: dict):
        dead = []
        for ws in list(conns or []):
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            conns.discard(ws)

    async def notify_user(self, user_id: str, data: dict):
        await self._send(self.user_conns.get(user_id, set()), data)

    async def broadcast_game(self, game_id: str, data: dict):
        await self._send(self.game_conns.get(game_id, set()), data)


hub = Hub()
