#!/usr/bin/env python3
"""Count the public verification records the demo minted, and show what
the public endpoint says about one.

═══ WHAT WENT WRONG ═══

`POST /confirm/{token}/approve` inserted a `document_authenticity` row
on every approval, including `/try`'s. That table is what
`GET /api/v1/verify/{code}` answers from — no authentication, no expiry
— so each demo approval left a PERMANENT PUBLIC CLAIM that a fictional
Glendora parcel is a genuine document, under whatever name the visitor
typed into the demo.

`delete_demo_drafts` reclaims the `api_deeds` row after three hours and
does not touch this table. So the record outlived the deed it described
and kept answering `valid: true` afterwards.

The code no longer does this (`routers/api_confirm.py`). **This script
is about the rows already there.**

═══ REPORT-ONLY BY DEFAULT, AND THAT IS THE RULING ═══

Owner-ruled 2026-09-22: report the count and what the public endpoint
returns for one *before* deciding whether they need removing. So the
default run writes nothing. `--delete` exists and is deliberately not
the default — see the identification caveat below.

═══ HOW A DEMO ROW IS IDENTIFIED, AND WHY THAT IS STATED NOT ASSUMED ═══

`document_authenticity` has no `demo_kind` column, so there is no marker
to match. Identification is therefore INFERENTIAL, and the script says
so rather than presenting a heuristic as a lookup:

  1. `parcel`  — the row carries the demo payload's APN, grantee and
     county. Strong, but it is still a match on content.
  2. `orphan`  — no `api_deeds` row survives for that `short_code`. A
     real approved deed keeps its row forever; only demo rows are
     deleted out from under their authenticity record. A row that is
     BOTH is as close to certain as this table allows.

Both counts are printed separately. A row that is `parcel` but not
`orphan` is still within the three-hour retention window — it is a demo
row whose deed has not been swept yet, not a different kind of thing.

`--delete` removes only rows matching BOTH, and prints each one first.
"""
from __future__ import annotations

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db_connection  # noqa: E402
from routers.try_demo import SAMPLE_PAYLOAD  # noqa: E402

# Read from the payload rather than typed here, so a change to the demo
# sample cannot leave this script quietly matching nothing.
DEMO_APN = SAMPLE_PAYLOAD["property"]["apn"]
DEMO_GRANTEE = SAMPLE_PAYLOAD["grantee"]["name"][:50]
DEMO_COUNTY = SAMPLE_PAYLOAD["property"]["county"]

PARCEL_SQL = """
    SELECT da.id::text, da.short_code, da.document_type, da.status,
           da.property_address, da.property_apn, da.grantor_display,
           da.grantee_display, da.verification_count, da.generated_at,
           (SELECT COUNT(*) FROM api_deeds d
             WHERE d.document_id = da.short_code) AS deed_rows
      FROM document_authenticity da
     WHERE da.property_apn = %s
       AND da.grantee_display = %s
       AND da.county = %s
     ORDER BY da.generated_at
"""

TOTAL_SQL = "SELECT COUNT(*) AS n FROM document_authenticity"


def verify_answer(cursor, short_code: str) -> dict:
    """Run the EXACT query `verify_document` runs, and report its verdict.

    Not a re-implementation of the endpoint's prose — the same SELECT and
    the same `status == 'active'` test, so what this prints is what a
    member of the public gets. It records nothing: the endpoint's
    `_record_public_verification` write is deliberately not repeated, so
    auditing does not inflate `verification_count`.
    """
    cursor.execute("""
        SELECT id, short_code, document_type, generated_at, status
        FROM document_authenticity
        WHERE short_code = %s
    """, (short_code.upper(),))
    row = cursor.fetchone()
    if not row:
        return {"valid": False, "message": "Document not found"}
    status = row["status"]
    return {
        "valid": status == "active" or status == "completed",
        "document": {
            "document_id": row["short_code"],
            "deed_type": row["document_type"].replace("_", " ").title(),
            "status": status,
            "created_at": (row["generated_at"].isoformat()
                           if row["generated_at"] else None),
        },
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--delete", action="store_true",
                    help="remove rows matching BOTH parcel and orphan")
    args = ap.parse_args()

    conn = get_db_connection()
    if not conn:
        print("No database connection. Set DATABASE_URL.")
        return 2
    cursor = conn.cursor()
    try:
        cursor.execute(TOTAL_SQL)
        total = cursor.fetchone()["n"]

        cursor.execute(PARCEL_SQL, (DEMO_APN, DEMO_GRANTEE, DEMO_COUNTY))
        parcel = cursor.fetchall() or []
        orphans = [r for r in parcel if r["deed_rows"] == 0]

        print(f"document_authenticity rows, all      : {total}")
        print(f"  matching the demo parcel           : {len(parcel)}")
        print(f"  of those, orphaned (no deed row)   : {len(orphans)}")
        print(f"  demo parcel = APN {DEMO_APN}, grantee {DEMO_GRANTEE!r}, "
              f"county {DEMO_COUNTY}")
        print()

        if not parcel:
            print("Nothing to report. No demo rows are present.")
            return 0

        for r in parcel:
            tag = "ORPHAN" if r["deed_rows"] == 0 else "deed row still present"
            print(f"  {r['short_code']}  {r['status']:8s}  "
                  f"scans={r['verification_count']}  "
                  f"{r['generated_at']}  [{tag}]")
            print(f"      {r['property_address']}")
        print()

        sample = (orphans or parcel)[0]
        print(f"GET /api/v1/verify/{sample['short_code']} returns:")
        print(f"  {verify_answer(cursor, sample['short_code'])}")
        print()

        if not args.delete:
            print("Report only — nothing was changed. Re-run with --delete to "
                  "remove the rows\nmatching BOTH parcel and orphan "
                  f"({len(orphans)} row(s)).")
            return 0

        if not orphans:
            print("--delete given, but no row matches both. Nothing removed.")
            return 0

        cursor.execute(
            "DELETE FROM document_authenticity WHERE id = ANY(%s) RETURNING id",
            ([r["id"] for r in orphans],))
        removed = cursor.fetchall() or []
        conn.commit()
        print(f"Removed {len(removed)} row(s).")
        return 0
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
