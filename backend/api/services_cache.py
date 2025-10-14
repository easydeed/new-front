from __future__ import annotations
import asyncio
import json
import os
import time
from typing import Any, Optional

try:
    # redis 5.x ships asyncio client under redis.asyncio
    from redis import asyncio as aioredis  # type: ignore
except Exception:  # pragma: no cover
    aioredis = None  # graceful fallback

class _MemoryCache:
    def __init__(self):
        self._store: dict[str, tuple[float, Any]] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        async with self._lock:
            row = self._store.get(key)
            if not row:
                return None
            expires_at, value = row
            if expires_at and expires_at < time.time():
                self._store.pop(key, None)
                return None
            return value

    async def set(self, key: str, value: Any, ttl_sec: int = 3600) -> None:
        async with self._lock:
            expires_at = time.time() + ttl_sec if ttl_sec else 0
            self._store[key] = (expires_at, value)

class CacheClient:
    """
    Small wrapper that prefers Redis if configured, otherwise falls back to in‑memory.
    """
    def __init__(self):
        self.url = os.getenv("REDIS_URL") or os.getenv("UPSTASH_REDIS_REST_URL")
        self.enabled = bool(self.url) and aioredis is not None
        self.ttl_default = int(os.getenv("PROPERTY_CACHE_TTL_SEC", "86400"))  # 24h
        self._mem = _MemoryCache()
        self._redis = None

    async def init(self):
        if self.enabled and self._redis is None:
            try:
                self._redis = await aioredis.from_url(self.url, encoding="utf-8", decode_responses=True)
            except Exception:
                # degrade gracefully
                self.enabled = False
        return self

    async def get_json(self, key: str) -> Optional[Any]:
        if self.enabled and self._redis is not None:
            try:
                raw = await self._redis.get(key)
                return json.loads(raw) if raw else None
            except Exception:
                pass
        return await self._mem.get(key)

    async def set_json(self, key: str, value: Any, ttl_sec: Optional[int] = None) -> None:
        ttl = ttl_sec if ttl_sec is not None else self.ttl_default
        if self.enabled and self._redis is not None:
            try:
                await self._redis.set(key, json.dumps(value), ex=ttl)
                return
            except Exception:
                pass
        await self._mem.set(key, value, ttl_sec=ttl)

# Singleton accessor
_cache_singleton: Optional[CacheClient] = None
_cache_lock = asyncio.Lock()

async def get_cache() -> CacheClient:
    global _cache_singleton
    if _cache_singleton is None:
        async with _cache_lock:
            if _cache_singleton is None:
                _cache_singleton = await CacheClient().init()
    return _cache_singleton

def make_address_key(address: str) -> str:
    norm = " ".join(address.strip().lower().split())
    return f"prop:addr:{norm}"
