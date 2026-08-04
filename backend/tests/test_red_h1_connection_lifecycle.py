"""RED-H1.2 — connections close on every exit, and the public path is capped.

═══ WHAT THIS PINS, AND WHY IT IS NOT A STYLE TEST ═══

`get_db_connection()` opens a real socket. Postgres holds a backend
process open per connection and the instance has a hard
`max_connections`. A leaked connection is therefore not "untidy" — it is
a consumed unit of a small, shared, exhaustible resource, and when they
run out the database stops serving EVERY caller, not just the leaking
endpoint.

The census before this ticket:

    api_key_requests.py    4 opens, closed on 1 of 3 exits each
    admin_api_v2.py       18 opens, 2 closes
    auth_extra.py          4 opens, 0 closes   ← ALL UNAUTHENTICATED
    notifications.py       3 opens, 0 closes

The cheapest path to the worst outcome was the public inquiry form: a
whitespace-only company name returns 400 from a `raise` that sits above
any `finally`, so the connection leaks and the attacker spends one
request. A few hundred of those and the product is down — unauthenticated
denial of service, with curl.

`auth_extra` then turned out to be the same defect on FOUR more
unauthenticated routes, forgot-password among them.

The fix is a context manager rather than four hundred careful `finally`
blocks, because the failure mode of "everyone must remember" is that
someone eventually does not — which is exactly the history above.
"""
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

import database  # noqa: E402
from tests.source_text import code_only  # noqa: E402
from utils import throttle as throttle_mod  # noqa: E402


# ── The manager itself ────────────────────────────────────────────────


def test_connection_closes_on_the_happy_path():
    fake = MagicMock()
    with patch.object(database, "get_db_connection", return_value=fake):
        with database.db_connection() as conn:
            assert conn is fake
    fake.close.assert_called_once()


def test_connection_closes_when_the_body_raises_httpexception():
    """THE case. Every leak in the census was a `raise HTTPException`
    sitting above the close — a 400 for a bad field, a 404 for a missing
    row. The manager has to survive the exception that used to escape."""
    fake = MagicMock()
    with patch.object(database, "get_db_connection", return_value=fake):
        with pytest.raises(HTTPException):
            with database.db_connection() as conn:
                raise HTTPException(status_code=400, detail="bad field")
    fake.close.assert_called_once()


def test_connection_closes_when_the_body_raises_anything_else():
    fake = MagicMock()
    with patch.object(database, "get_db_connection", return_value=fake):
        with pytest.raises(ValueError):
            with database.db_connection() as conn:
                raise ValueError("boom")
    fake.close.assert_called_once()


def test_unavailable_database_raises_503_and_never_yields():
    """Returning None made every caller responsible for an `if not conn`
    check, which is one more thing to forget."""
    with patch.object(database, "get_db_connection", return_value=None):
        with pytest.raises(HTTPException) as exc:
            with database.db_connection("custom detail"):
                pytest.fail("body must not run without a connection")
    assert exc.value.status_code == 503
    assert exc.value.detail == "custom detail"


def test_a_failing_close_does_not_mask_the_real_error():
    """If close() raises while the body is already raising, the caller
    must still see the body's exception — not a confusing close error."""
    fake = MagicMock()
    fake.close.side_effect = RuntimeError("socket already gone")
    with patch.object(database, "get_db_connection", return_value=fake):
        with pytest.raises(ValueError, match="the real problem"):
            with database.db_connection():
                raise ValueError("the real problem")


# ── No raw opens left where the leaks were ────────────────────────────


LEAKY_MODULES = [
    "routers/api_key_requests.py",
    "routers/admin_api_v2.py",
    "routers/auth_extra.py",
    "routers/notifications.py",
]


@pytest.mark.parametrize("rel", LEAKY_MODULES)
def test_no_module_that_leaked_still_opens_a_bare_connection(rel):
    src = code_only((BACKEND / rel).read_text(encoding="utf-8"))
    assert "get_db_connection()" not in src, (
        f"{rel} still opens a connection it must remember to close")


@pytest.mark.parametrize("rel", LEAKY_MODULES)
def test_no_module_that_leaked_still_closes_by_hand(rel):
    """A manual close alongside the manager means someone re-introduced
    the pattern; the manager is the only thing that should close."""
    src = code_only((BACKEND / rel).read_text(encoding="utf-8"))
    assert "conn.close()" not in src, f"{rel} closes by hand again"


def test_the_four_unauthenticated_auth_routes_use_the_manager():
    """auth_extra's endpoints take no auth dependency, so their leak was
    reachable by anyone — the same severity as the inquiry endpoint and
    four times the surface."""
    src = code_only((BACKEND / "routers" / "auth_extra.py").read_text(encoding="utf-8"))
    assert src.count("with db_connection() as conn") == 4


# ── The public endpoint is capped ─────────────────────────────────────


@pytest.fixture(autouse=True)
def _clean_throttle():
    throttle_mod.reset()
    yield
    throttle_mod.reset()


def test_the_limit_allows_the_human_and_stops_the_loop():
    for _ in range(5):
        throttle_mod.throttle("k", limit=5, window_seconds=3600)
    with pytest.raises(throttle_mod.ThrottleExceeded):
        throttle_mod.throttle("k", limit=5, window_seconds=3600)


def test_callers_are_counted_separately():
    for _ in range(5):
        throttle_mod.throttle("a", limit=5, window_seconds=3600)
    throttle_mod.throttle("b", limit=5, window_seconds=3600)  # must not raise


def test_the_window_slides_rather_than_resetting_on_a_boundary():
    """A fixed window lets a caller send `limit` at 0:59 and `limit`
    again at 1:01 — double the intended rate at the worst moment."""
    with patch.object(throttle_mod.time, "monotonic", side_effect=[
        0, 1, 2,          # three hits at t≈0
        61, 61,           # a fourth at t=61: the first three are still
    ]):                   # inside a 120s window, so this is hit four
        for _ in range(3):
            throttle_mod.throttle("slide", limit=3, window_seconds=120)
        with pytest.raises(throttle_mod.ThrottleExceeded):
            throttle_mod.throttle("slide", limit=3, window_seconds=120)


def test_the_refusal_says_when_to_come_back():
    for _ in range(2):
        throttle_mod.throttle("r", limit=2, window_seconds=60)
    with pytest.raises(throttle_mod.ThrottleExceeded) as exc:
        throttle_mod.throttle("r", limit=2, window_seconds=60)
    assert 0 < exc.value.retry_after <= 61


def test_the_limiter_is_not_itself_a_memory_leak():
    """An attacker rotating source addresses must not grow the map
    without bound — the naive dict-keyed-by-IP is its own DoS."""
    for i in range(throttle_mod.MAX_TRACKED_KEYS + 500):
        throttle_mod.throttle(f"ip-{i}", limit=5, window_seconds=1)
    assert len(throttle_mod._buckets) <= throttle_mod.MAX_TRACKED_KEYS


def test_forwarded_for_takes_the_first_hop():
    req = MagicMock()
    req.headers = {"x-forwarded-for": "203.0.113.9, 10.0.0.1, 10.0.0.2"}
    assert throttle_mod.client_key(req) == "203.0.113.9"


def test_the_public_endpoint_actually_wires_the_throttle():
    src = code_only((BACKEND / "routers" / "api_key_requests.py").read_text(encoding="utf-8"))
    assert "throttle(" in src and "client_key(request)" in src
    assert "status_code=429" in src
    # Retry-After, so a legitimate caller is told when rather than just no.
    assert "Retry-After" in src


def test_the_throttle_is_honest_about_being_in_process():
    """The module must keep saying what it cannot do. An in-process
    limiter across two workers enforces double the stated limit, and a
    limiter that implies otherwise is worse than none."""
    doc = (BACKEND / "utils" / "throttle.py").read_text(encoding="utf-8")
    assert "in-process" in doc.lower()
    assert "single-instance" in doc.lower()
