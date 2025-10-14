from __future__ import annotations
import asyncio
import time
from typing import Callable, Awaitable

class ProactiveTokenGuard:
    """In‑process token freshness guard with preemptive refresh."""
    def __init__(self, refresh_coro: Callable[[], Awaitable[None]], lifetime_sec: int = 600, skew_sec: int = 120):
        self._refresh_coro = refresh_coro
        self._lifetime = lifetime_sec
        self._skew = skew_sec
        self._last_refresh = 0.0
        self._lock = asyncio.Lock()

    def _is_stale(self) -> bool:
        return (time.time() - self._last_refresh) > (self._lifetime - self._skew)

    async def ensure_fresh(self) -> None:
        if not self._is_stale():
            return
        async with self._lock:
            if not self._is_stale():
                return
            await self._refresh_coro()
            self._last_refresh = time.time()
