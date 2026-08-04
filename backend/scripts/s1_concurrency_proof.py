"""RED-S1 — the load proof, run against the real app.

The acquirer's prescribed check, in two parts:

  1. Two concurrent writes with an induced failure in one; the other's
     row must survive. (Also pinned in tests/test_poisoned_connection.py,
     which is where it belongs as a regression guard. Repeated here
     because a proof nobody can RUN is a claim.)
  2. A sustained ~20 RPS run against the real ASGI app with
     pg_stat_activity sampled throughout, showing that connections stay
     bounded by the pool and no request poisons another.

Usage:
  DATABASE_URL=postgresql://... JWT_SECRET_KEY=x python scripts/s1_concurrency_proof.py

Exit code 1 on any failure, so it can gate rather than merely inform.

WHAT THIS WOULD HAVE SHOWN BEFORE THE FIX: part 2's error column full of
"current transaction is aborted", because a single failing request
poisoned the one shared connection and every later request inherited it.
"""
import os
import sys
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import psycopg2  # noqa: E402

DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    print("DATABASE_URL is required")
    sys.exit(1)

TARGET_RPS = int(os.getenv("S1_RPS", "20"))
DURATION_S = int(os.getenv("S1_DURATION", "10"))

failures = []


def check(label, ok, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}  {label}{(' — ' + detail) if detail else ''}")
    if not ok:
        failures.append(label)


def sample_connections():
    c = psycopg2.connect(DB_URL, connect_timeout=10)
    try:
        with c.cursor() as cur:
            cur.execute("""
                SELECT count(*) FROM pg_stat_activity
                WHERE datname = current_database() AND pid <> pg_backend_pid()
            """)
            return cur.fetchone()[0]
    finally:
        c.close()


def part1_induced_failure():
    print("\n[1] two concurrent writes, one induced failure")
    import db

    db.close_pool()
    ok_tag = f"proof-ok-{uuid.uuid4().hex[:8]}@test.local"
    bad_tag = f"proof-bad-{uuid.uuid4().hex[:8]}@test.local"
    barrier = threading.Barrier(2, timeout=15)

    def failing():
        with db.request_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("INSERT INTO users (email, password_hash) VALUES (%s,%s)",
                            (bad_tag, "x"))
            barrier.wait()
            try:
                with conn.cursor() as cur:
                    cur.execute("SELECT * FROM table_that_does_not_exist_xyz")
            except psycopg2.Error:
                pass
            conn.rollback()
            barrier.wait()

    def succeeding():
        with db.request_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("INSERT INTO users (email, password_hash) VALUES (%s,%s)",
                            (ok_tag, "x"))
            barrier.wait()
            barrier.wait()
            conn.commit()

    ts = [threading.Thread(target=failing), threading.Thread(target=succeeding)]
    for t in ts:
        t.start()
    for t in ts:
        t.join(timeout=20)

    c = psycopg2.connect(DB_URL, connect_timeout=10)
    try:
        with c.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM users WHERE email = %s", (ok_tag,))
            survived = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM users WHERE email = %s", (bad_tag,))
            gone = cur.fetchone()[0]
            cur.execute("DELETE FROM users WHERE email IN (%s,%s)", (ok_tag, bad_tag))
            c.commit()
    finally:
        c.close()

    check("the succeeding writer's row survived", survived == 1)
    check("the failing writer's row was rolled back", gone == 0)


def part2_load():
    print(f"\n[2] ~{TARGET_RPS} RPS for {DURATION_S}s against the real app")
    from fastapi.testclient import TestClient
    from main import app

    client = TestClient(app)
    samples = []
    stop = threading.Event()
    results = {"ok": 0, "err": 0}
    errors = {}
    lock = threading.Lock()

    def sampler():
        while not stop.is_set():
            try:
                samples.append(sample_connections())
            except Exception:
                pass
            time.sleep(0.25)

    def one_request(i):
        # A mix: a read, a 404 lookup, and — every 5th — a request that
        # FAILS inside the handler. Under the shared connection those
        # failures were what poisoned everyone else.
        try:
            if i % 5 == 0:
                r = client.get(f"/approve/{uuid.uuid4()}/pdf")
            elif i % 3 == 0:
                r = client.post("/users/login", json={
                    "email": f"nobody-{i}@test.local", "password": "wrong"})
            else:
                r = client.get("/health")
            with lock:
                if r.status_code < 500:
                    results["ok"] += 1
                else:
                    results["err"] += 1
                    errors[r.status_code] = errors.get(r.status_code, 0) + 1
        except Exception as e:
            with lock:
                results["err"] += 1
                key = type(e).__name__
                errors[key] = errors.get(key, 0) + 1

    t = threading.Thread(target=sampler, daemon=True)
    t.start()

    total = TARGET_RPS * DURATION_S
    started = time.monotonic()
    with ThreadPoolExecutor(max_workers=TARGET_RPS) as pool:
        for i in range(total):
            pool.submit(one_request, i)
            time.sleep(1.0 / TARGET_RPS)
    elapsed = time.monotonic() - started
    stop.set()
    t.join(timeout=2)

    peak = max(samples) if samples else -1
    print(f"      requests: {total} in {elapsed:.1f}s "
          f"({total / elapsed:.1f}/s effective)")
    print(f"      ok: {results['ok']}   5xx/exceptions: {results['err']} {errors or ''}")
    print(f"      pg_stat_activity peak: {peak} connections "
          f"(samples: {len(samples)}, pool max {os.getenv('DB_POOL_MAX', '20')})")

    check("no request returned 5xx or raised", results["err"] == 0, str(errors))
    check("connections stayed bounded by the pool",
          0 < peak <= int(os.getenv("DB_POOL_MAX", "20")) + 5,
          f"peak {peak}")

    # A paced 20 RPS of millisecond responses is only ever ~1-2 requests
    # in flight, so the number above says little about the pool under
    # pressure. Reported honestly rather than presented as a stress
    # result — and followed by a burst that actually is one.
    part3_burst(client)


def part3_burst(client):
    print("\n[3] burst — 40 simultaneous requests (the threadpool's width)")
    import db

    inflight = {"now": 0, "peak": 0}
    lock = threading.Lock()
    original = db.request_connection

    import contextlib

    @contextlib.contextmanager
    def counting():
        with lock:
            inflight["now"] += 1
            inflight["peak"] = max(inflight["peak"], inflight["now"])
        try:
            with original() as c:
                yield c
        finally:
            with lock:
                inflight["now"] -= 1

    db.request_connection = counting
    conn_samples = []
    stop = threading.Event()

    def sampler():
        while not stop.is_set():
            try:
                conn_samples.append(sample_connections())
            except Exception:
                pass
            time.sleep(0.02)

    t = threading.Thread(target=sampler, daemon=True)
    t.start()
    try:
        errs = []

        def hit(i):
            try:
                # Every third request FAILS inside the handler, so the
                # burst is not just parallel reads — it is parallel reads
                # racing parallel failures, which is the shape that broke
                # the shared connection.
                if i % 3 == 0:
                    client.get(f"/approve/{uuid.uuid4()}/pdf")
                else:
                    client.post("/users/login", json={
                        "email": f"burst-{i}@test.local", "password": "wrong"})
            except Exception as e:
                errs.append(type(e).__name__)

        threads = [threading.Thread(target=hit, args=(i,)) for i in range(40)]
        for th in threads:
            th.start()
        for th in threads:
            th.join(timeout=30)
    finally:
        stop.set()
        t.join(timeout=2)
        db.request_connection = original

    peak_scopes = inflight["peak"]
    peak_conns = max(conn_samples) if conn_samples else -1
    pool_max = int(os.getenv("DB_POOL_MAX", "20"))
    print(f"      peak concurrent request scopes: {peak_scopes}")
    print(f"      peak pg_stat_activity: {peak_conns} (pool max {pool_max})")

    check("the burst was genuinely concurrent", peak_scopes >= 5,
          f"peak {peak_scopes} scopes")
    check("no exception escaped under burst", errs == [], str(errs[:5]))
    check("connections never exceeded the pool ceiling",
          peak_conns <= pool_max + 5, f"peak {peak_conns}")

    # The tell-tale of the old defect.
    c = psycopg2.connect(DB_URL, connect_timeout=10)
    try:
        with c.cursor() as cur:
            cur.execute("SELECT 1")
            check("the database is still serving after the run", cur.fetchone()[0] == 1)
    finally:
        c.close()


if __name__ == "__main__":
    print("RED-S1 concurrency proof")
    part1_induced_failure()
    part2_load()
    print()
    if failures:
        print(f"FAILED: {failures}")
        sys.exit(1)
    print("ALL CHECKS PASSED")
