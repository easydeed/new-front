"""RED-H1.2 — a per-caller rate limit, and an honest account of its reach.

═══ WHAT THIS IS FOR ═══

One endpoint in this product accepts writes from anyone: the public
API-access inquiry form. No account, three fields. Every request stores a
row AND sends an email through the company's SendGrid account.

That is two amplifiers pointed outward. Unthrottled, a loop turns into a
filled table and a burned sender reputation, and the sender reputation is
the one that does not recover on its own — deliverability damage outlasts
whatever you do about the traffic.

The prior ruling on this endpoint said length caps and the email
validator were the whole defence, with a plain mailto: as the fallback if
spam became real. That reasoning considered SPAM. It did not consider
that each request also holds a database connection and an SMTP send.

═══ WHAT THIS IS NOT ═══

NOT the answer to rate limiting generally. This is in-process memory: it
counts requests inside ONE python process, so it is exactly as good as
the deployment is single-instance. The moment the app runs two workers,
each keeps its own counter and the effective limit doubles.

That is stated here rather than discovered later. RED-S3 carries real
edge rate limiting; this is the specific hole plugged specifically,
sized so that a legitimate human filling in a form never meets it and a
script does so immediately.

It is also memory-bounded on purpose. A naive dict keyed by IP is itself
a denial-of-service surface — an attacker rotating source addresses grows
it without limit. Expired buckets are swept on write, and the map is
capped; past the cap the oldest buckets are dropped.
"""
from __future__ import annotations

import threading
import time
from collections import OrderedDict
from typing import Optional

from fastapi import Request


class ThrottleExceeded(Exception):
    """Raised when a caller exceeds its window. Carries the retry hint."""

    def __init__(self, retry_after: int):
        self.retry_after = retry_after
        super().__init__(f"Rate limit exceeded; retry in {retry_after}s")


# Past this many tracked keys, the oldest are evicted. Chosen so the map
# stays trivially small in memory while being far above any plausible
# count of real simultaneous form-fillers.
MAX_TRACKED_KEYS = 10_000

_buckets: "OrderedDict[str, list[float]]" = OrderedDict()
_lock = threading.Lock()


def client_key(request: Optional[Request]) -> str:
    """Best-effort caller identity.

    Behind Render's proxy the socket peer is the proxy, so the real
    client is the FIRST entry of X-Forwarded-For. That header is
    caller-supplied and trivially spoofed — which is precisely why this
    module does not pretend to be a security boundary. It raises the cost
    of casual abuse; it does not stop a determined attacker, and an
    honest limiter says so rather than implying otherwise.
    """
    if request is None:
        return "unknown"
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def throttle(key: str, *, limit: int, window_seconds: int) -> None:
    """Allow `limit` events per `window_seconds` for `key`, else raise.

    A sliding window rather than a fixed one: fixed windows let a caller
    send `limit` at 0:59 and `limit` again at 1:01, which is double the
    intended rate at the moment it matters most.
    """
    now = time.monotonic()
    cutoff = now - window_seconds

    with _lock:
        hits = _buckets.get(key)
        if hits is None:
            hits = []
        else:
            hits = [t for t in hits if t > cutoff]

        if len(hits) >= limit:
            retry_after = max(1, int(window_seconds - (now - hits[0])) + 1)
            _buckets[key] = hits
            _buckets.move_to_end(key)
            raise ThrottleExceeded(retry_after)

        hits.append(now)
        _buckets[key] = hits
        _buckets.move_to_end(key)

        # Sweep on write: drop keys whose windows have fully expired,
        # then hard-cap. Without both, the limiter becomes the leak.
        if len(_buckets) > MAX_TRACKED_KEYS:
            for stale in [k for k, v in list(_buckets.items())
                          if not v or v[-1] <= cutoff]:
                _buckets.pop(stale, None)
            while len(_buckets) > MAX_TRACKED_KEYS:
                _buckets.popitem(last=False)


def reset() -> None:
    """Test hook — the module is process-global by design."""
    with _lock:
        _buckets.clear()
