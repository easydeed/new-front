import time, hashlib
from typing import Optional
from .deps import get_settings, get_logger
try:
    import redis
except Exception:
    redis = None

logger = get_logger()

class RateLimiter:
    def __init__(self):
        self.settings = get_settings()
        self._memory = {}
        if self.settings.RATE_LIMIT_REDIS_URL and redis:
            self._redis = redis.Redis.from_url(self.settings.RATE_LIMIT_REDIS_URL)
        else:
            self._redis = None

    def _bucket_key(self, key_prefix: str) -> str:
        minute = int(time.time() // 60)
        raw = f"ratelimit:{key_prefix}:{minute}"
        return hashlib.sha256(raw.encode()).hexdigest()

    def allow(self, key_prefix: str, limit: Optional[int]):
        limit = limit or self.settings.RATE_LIMIT_REQUESTS_PER_MINUTE
        reset = 60 - int(time.time() % 60)
        if self._redis:
            k = self._bucket_key(key_prefix)
            current = self._redis.incr(k)
            if current == 1:
                self._redis.expire(k, 60)
            remaining = max(0, limit - int(current))
            return (int(current) <= limit, remaining, reset)
        # memory fallback
        k = self._bucket_key(key_prefix)
        current = self._memory.get(k, 0) + 1
        self._memory[k] = current
        remaining = max(0, limit - current)
        return (current <= limit, remaining, reset)

limiter = RateLimiter()
