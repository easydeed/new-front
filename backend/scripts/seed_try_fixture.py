"""TRY-8 — seed the one permanently expired demo token.

═══ WHY A REAL ROW AND NOT A MOCK ═══

Expiry takes seven days to reach honestly (`CONFIRM_EXPIRY_DAYS = 7`).
A presenter who wants to show the expired state has two options: wait a
week, or fake it. On a page whose entire claim is that every request is
real, a faked state would be **the one lie on it** — and it would be the
lie in the section about what happens when things go wrong, which is the
part a careful buyer trusts most.

So the state is reached the way the product reaches it: a row whose
`confirmation_expires_at` is in the past. `resolve_state` derives expiry
from the clock rather than from whoever last wrote the row, so this reads
`expired` permanently, with no scheduled job required to make it true.

═══ THE MARKER, AND WHY IT IS NOT `'try'` ═══

`demo_kind = 'fixture'`. The lifecycle sweep deletes demo drafts by
EXACT EQUALITY on `'try'`, so this row is outside the predicate rather
than excluded by an extra clause. An exemption expressed as `AND
demo_kind != 'fixture'` is one careless edit from deleting the fixture;
an exemption expressed as "the predicate never names it" cannot be
dropped, because there is nothing to drop.

Run it once per environment. Idempotent: a second run finds the token
and leaves it alone.
"""
from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db_connection                      # noqa: E402
from services.api_confirm import STATUS_PENDING             # noqa: E402
from services.api_confirm_lifecycle import DEMO_KIND_FIXTURE  # noqa: E402

# Stable and readable: a presenter needs to be able to open this URL
# from a slide without copying a random token, and it authenticates
# nothing that is not already public and expired.
FIXTURE_TOKEN = "try-demo-expired-fixture-token-0000"


def seed() -> str:
    conn = get_db_connection()
    if conn is None:
        raise SystemExit("no database connection")
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT deed_id FROM api_deeds WHERE confirmation_token = %s",
                (FIXTURE_TOKEN,))
            if cur.fetchone():
                return "already present — left alone"

            past = datetime.now(timezone.utc) - timedelta(days=30)
            cur.execute(
                """
                INSERT INTO api_deeds (
                    deed_id, document_id, deed_type, status,
                    confirmation_token, confirmation_expires_at,
                    approver_name, approver_role,
                    property_address, property_apn, property_county,
                    grantor_name, grantee_name,
                    request_data, created_at, demo_kind
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                          %s, %s, %s)
                """,
                (
                    "deed_try_expired_fixture", "DP-TRY-EXPIRED", "grant_deed",
                    STATUS_PENDING, FIXTURE_TOKEN, past,
                    "Sample Approver", "escrow officer",
                    "1300 Nonesuch Avenue, Glendora, CA 91750",
                    "8888-000-001", "Los Angeles",
                    "JOHN Q. SAMPLE AND MARY R. SAMPLE, HUSBAND AND WIFE",
                    "AVERY K. SPECIMEN",
                    "{}", past, DEMO_KIND_FIXTURE,
                ))
        conn.commit()
        return "seeded"
    finally:
        conn.close()


if __name__ == "__main__":
    print(f"[try-fixture] {seed()}  token={FIXTURE_TOKEN}")
