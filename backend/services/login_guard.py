"""Login lockout. RED-S3.

There was NO throttle of any kind on password guessing. No attempt
counter, no lockout, no backoff — unlimited attempts against bcrypt at
whatever rate the host would serve, for any address an attacker cared to
name.

═══ WHY THE LOCK IS ANNOUNCED ═══

A lockout disguised as "invalid email or password" is a support call: the
officer knows her password is right, tries it four more times, extends
the lock, and phones someone. Telling her plainly costs an attacker
nothing he did not already know — he can measure the lock by observing
that his guesses stopped working — and it saves the one person the
message is actually for.

═══ WHY IT COUNTS ADDRESSES THAT DO NOT EXIST ═══

Attempts are recorded whether or not the account exists. Counting only
real accounts would make the lockout weaker (an attacker spraying many
addresses would never trip it) AND would leak which addresses are real,
because only those would ever start locking.

═══ WHAT THIS IS NOT ═══

Not a defence against a distributed attack from many addresses against
many accounts — that is edge rate limiting, which lands in the same
ticket as middleware. This is the per-account half: it makes guessing ONE
person's password impractical.
"""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException

# Five wrong guesses in fifteen minutes locks for fifteen. Chosen so a
# human mistyping twice and then reaching for a password manager never
# meets it, and a script meets it immediately.
MAX_FAILURES = int(os.getenv("LOGIN_MAX_FAILURES", "5"))
WINDOW_MINUTES = int(os.getenv("LOGIN_FAILURE_WINDOW_MIN", "15"))
LOCKOUT_MINUTES = int(os.getenv("LOGIN_LOCKOUT_MIN", "15"))


def record_attempt(email: str, ip: Optional[str], succeeded: bool) -> None:
    """Write one attempt. Never blocks the login path if it fails.

    A recording failure must not become a login failure — that would
    turn a logging outage into an authentication outage, which is a
    worse day than the one it is trying to prevent.
    """
    import db
    try:
        with db.conn.cursor() as cur:
            cur.execute("""INSERT INTO login_attempts (email, ip, succeeded)
                           VALUES (%s,%s,%s)""", (email.lower(), ip, succeeded))
            # A successful login clears the slate, so an officer who
            # finally remembers her password is not still one typo from a
            # lock she already escaped.
            if succeeded:
                cur.execute("""DELETE FROM login_attempts
                               WHERE LOWER(email) = %s AND succeeded = FALSE""",
                            (email.lower(),))
            db.conn.commit()
    except Exception as e:
        try:
            db.conn.rollback()
        except Exception:
            pass
        print(f"[login-guard] could not record attempt: {e}")


def failures_in_window(email: str) -> int:
    import db
    with db.conn.cursor() as cur:
        cur.execute("""
            SELECT COUNT(*) AS n FROM login_attempts
            WHERE LOWER(email) = %s AND succeeded = FALSE
              AND attempted_at > NOW() - (%s || ' minutes')::interval
        """, (email.lower(), WINDOW_MINUTES))
        row = cur.fetchone()
        return int(row["n"] if isinstance(row, dict) else row[0])


def check_lockout(email: str) -> None:
    """Raise 429 if this address is locked. Called BEFORE the password
    is checked, so a locked account costs an attacker a bcrypt-free
    round trip rather than a free guess."""
    try:
        failures = failures_in_window(email)
    except Exception as e:
        # Fail OPEN, deliberately. If the attempts table is unreadable,
        # locking every officer out of the product is a self-inflicted
        # outage that is worse than the risk it mitigates for the minutes
        # it takes to notice.
        print(f"[login-guard] lockout check unavailable, allowing: {e}")
        return

    if failures >= MAX_FAILURES:
        raise HTTPException(
            status_code=429,
            detail=(f"Too many failed sign-in attempts. This account is "
                    f"locked for {LOCKOUT_MINUTES} minutes. If this wasn't "
                    f"you, reset your password."),
            headers={"Retry-After": str(LOCKOUT_MINUTES * 60)},
        )
