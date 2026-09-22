#!/usr/bin/env python3
"""Refuse a commit that carries a credential. Blocking, no `|| true`.

═══ WHY THIS EXISTS, AND WHAT THE EXISTING GATE MISSED ═══

`test_db_identity.py::test_no_new_file_hard_codes_a_database_password`
already held an exact set of files carrying a Postgres connection
string. It was a good gate and it was **the wrong shape for the
problem**: it counts CONNECTION STRINGS. The full-history scan of
2026-09-22 found a Google API key across ten files, three OpenAI keys,
two Stripe keys and a webhook secret — **not one of which that gate
could ever have seen**, because none of them is a DSN.

A gate that enumerates known offenders answers "has this specific list
grown?". This one answers "does anything credential-shaped appear at
all?", which is the question that was being asked of it.

═══ WHAT IT SCANS, AND THE LIMIT STATED RATHER THAN IMPLIED ═══

**Tracked files at HEAD. Not history.** The secrets already in this
repository's history are recorded in `docs/OWNER_LEDGER.md` by
fingerprint, and the scrub waits on rotation — so a gate that scanned
history would fail every build until then, and a gate everybody
disables is the failure mode §14.9 is about.

So this stops the NEXT one. It does not clean up the last one, and the
ledger is where that is tracked.

═══ THE POSITIVE CONTROL IS PART OF THE GATE ═══

`--self-test` feeds each pattern a correctly-formatted key of its own
kind and fails if any pattern does not match it. CI runs it BEFORE the
scan.

That is not ceremony. A regex that stops matching — an escaped
character, a tightened quantifier, a Python version changing a class —
produces a gate that passes everything, and a passing secrets gate is
indistinguishable from a clean repository from the outside. §14.2: a
control is checked before its result is believed.
"""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# (name, compiled pattern, group holding the secret, sample that MUST match)
RULES = [
    ("Postgres URL with inline password",
     rb"postgres(?:ql)?://[A-Za-z0-9_.-]+:([^@\s'\"<>]{6,})@[A-Za-z0-9_.-]+",
     b"postgresql://u:S3cretValue9@db.example.com/app"),
    ("Stripe live secret key", rb"\b(sk_live_[A-Za-z0-9]{10,})",
     b"sk_live_51H8xQzABCDEFghijklmnop"),
    ("Stripe test secret key", rb"\b(sk_test_[A-Za-z0-9]{10,})",
     b"sk_test_51H8xQzABCDEFghijklmnop"),
    ("Stripe restricted key", rb"\b(rk_live_[A-Za-z0-9]{10,})",
     b"rk_live_51H8xQzABCDEFghijklmnop"),
    ("Stripe webhook secret", rb"\b(whsec_[A-Za-z0-9]{10,})",
     b"whsec_ABCDEFghijklmnop1234"),
    ("SendGrid API key", rb"\b(SG\.[A-Za-z0-9_\-]{16,}\.[A-Za-z0-9_\-]{16,})",
     b"SG.abcdefghij1234567890.abcdefghij1234567890abcdefghij123"),
    ("AWS access key id", rb"\b((?:AKIA|ASIA)[0-9A-Z]{16})\b",
     b"AKIAIOSFODNN7EXAMPLE"),
    ("AWS secret access key",
     rb"aws_secret_access_key\s*[=:]\s*['\"]?([A-Za-z0-9/+=]{40})",
     b'aws_secret_access_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"'),
    ("Google API key", rb"\b(AIza[0-9A-Za-z_\-]{35})\b",
     b"AIzaSyD-1234567890abcdefghijklmnopqrstu"),
    ("OpenAI key", rb"\b(sk-[A-Za-z0-9_\-]{20,})\b",
     b"sk-proj1234567890abcdefghij"),
    ("private key block",
     rb"(-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----)",
     b"-----BEGIN RSA PRIVATE KEY-----"),
    ("JWT secret assignment",
     rb"JWT_SECRET(?:_KEY)?\s*[=:]\s*['\"]([^'\"\s]{8,})['\"]",
     b'JWT_SECRET_KEY="s3cr3t-value-here"'),
    ("Database password assignment",
     rb"(?:DB_PASSWORD|PGPASSWORD|DATABASE_PASSWORD|POSTGRES_PASSWORD)"
     rb"\s*[=:]\s*['\"]?([^'\"\s#]{6,})",
     b'DB_PASSWORD="S3cretValue9"'),
]

# Obvious non-credentials. Deliberately narrow: a filter that is too
# generous is how a real secret gets waved through as "looks like a
# sample".
PLACEHOLDER = re.compile(
    rb"^(?:your|my|test|example|changeme|placeholder|xxx+|\.\.\.|<|\$\{|%s|"
    rb"password|passwd|secret|username|user|dummy|fake|sample|redacted|"
    rb"removed|none|null|todo|abc123|foo|bar)", re.I)

# Files whose whole purpose is to SHOW the shape of a credential.
ALLOWED = {"backend/env.example", "scripts/check_secrets.py"}

SKIP_DIRS = {".git", "node_modules", ".next", "__pycache__", "venv",
             ".venv", "dist", "build", "coverage", ".pytest_cache"}
SKIP_SUFFIX = {".png", ".jpg", ".jpeg", ".gif", ".pdf", ".ico", ".woff",
               ".woff2", ".ttf", ".otf", ".zip", ".lock", ".map", ".webp"}


def is_placeholder(value: bytes) -> bool:
    return bool(PLACEHOLDER.match(value)) or len(set(value)) <= 2


def self_test() -> int:
    """Every pattern must detect a real key of its own kind."""
    broken = []
    for name, pattern, sample in RULES:
        if not re.search(pattern, sample):
            broken.append(name)
    if broken:
        print("SECRETS GATE IS BLIND — these patterns no longer match their "
              "own sample, so a clean result would prove nothing:")
        for n in broken:
            print(f"  - {n}")
        return 1
    print(f"secrets gate self-test: {len(RULES)}/{len(RULES)} patterns detect "
          f"their own kind")
    return 0


def tracked_files():
    out = subprocess.run(["git", "-C", str(ROOT), "ls-files", "-z"],
                         capture_output=True).stdout
    for raw in out.split(b"\0"):
        if not raw:
            continue
        rel = raw.decode("utf-8", "replace")
        path = ROOT / rel
        if any(part in SKIP_DIRS for part in Path(rel).parts):
            continue
        if path.suffix.lower() in SKIP_SUFFIX:
            continue
        if rel in ALLOWED:
            continue
        yield rel, path


def scan() -> int:
    findings = []
    checked = 0
    for rel, path in tracked_files():
        try:
            body = path.read_bytes()
        except OSError:
            continue
        if b"\x00" in body[:1024] or len(body) > 2_000_000:
            continue
        checked += 1
        for name, pattern, _ in RULES:
            for match in re.finditer(pattern, body):
                value = match.group(match.lastindex or 0)
                if is_placeholder(value):
                    continue
                line = body[:match.start()].count(b"\n") + 1
                findings.append((rel, line, name))

    if findings:
        print(f"\nSECRETS GATE FAILED — {len(findings)} credential(s) in "
              f"tracked files.\n")
        print("The VALUE is deliberately not printed: a CI log is one more "
              "place a secret\nwould then live. Open the file at the line "
              "below.\n")
        for rel, line, name in sorted(set(findings)):
            print(f"  {rel}:{line}")
            print(f"    {name}")
        print("\nRemove it and read it from the environment. If this is a "
              "sample, make it\nobviously fake or add the file to ALLOWED in "
              "scripts/check_secrets.py with a reason.")
        return 1

    print(f"secrets: clean ({len(RULES)} rules over {checked} tracked files)")
    print("NOTE: tracked files at HEAD only — git HISTORY is not scanned. "
          "See docs/OWNER_LEDGER.md.")
    return 0


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        sys.exit(self_test())
    rc = self_test()
    sys.exit(rc or scan())
