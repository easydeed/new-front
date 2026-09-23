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

═══ REPORT-ONLY BY DEFAULT, AND IT DELETES ONLY WHAT YOU NAME ═══

Owner-ruled 2026-09-22: report the count and what the public endpoint
returns for one *before* deciding whether they need removing. The
default run writes nothing.

**`--delete` takes SHORT CODES, never a predicate** (ruled 2026-09-23,
after the first real audit). The first version deleted every row
matching "demo parcel AND orphaned", and that was the wrong shape twice
over:

  · the predicate is INFERENTIAL, against this project's own rule that
    destroying fails closed by naming what it MAY TOUCH — a heuristic
    is the opposite of naming;
  · and on the day it was needed it would have removed ZERO, because
    neither existing row was orphaned yet. A quiet no-op reads as
    "nothing to do".

So the operator copies the codes out of the report and passes them in,
and the script REFUSES any code that is not in the report it just
printed. Identification stays inferential — it has to be, see below —
but DELETION is exact.

═══ HOW A DEMO ROW IS IDENTIFIED, AND WHY THAT IS STATED NOT ASSUMED ═══

`document_authenticity` has no `demo_kind` column, so for these rows
there is no marker to match. Identification is therefore INFERENTIAL,
and the script says so rather than presenting a heuristic as a lookup:

  1. `parcel`  — the row carries the demo payload's APN, grantee and
     county. Strong, but it is still a match on content.
  2. `orphan`  — no `api_deeds` row survives for that `short_code`. A
     real approved deed keeps its row forever; only demo rows are
     deleted out from under their authenticity record.

Both counts are printed. **Neither is a delete predicate.** They are
how a human finds the codes to name.

**Orphaning changes nothing about reachability**, which is the fact
that decides the sequencing: `verify_document` queries
`document_authenticity` by `short_code` FIRST and unconditionally, so
these rows answer `valid: true` whether or not their deed row still
exists. Waiting for the retention sweep does not reduce exposure — it
only removes the corroborating deed.

═══ WHY THERE IS NO MARKER TO ADD, AND THIS SCRIPT IS FINITE ═══

The obvious fix — stamp `demo_kind` on the authenticity row at insert,
so one predicate governs both tables — does not apply, because **no
authenticity row is inserted for a demo approval any more.**
`routers/api_confirm.py` branches on `demo_kind` and writes nothing.

So the population this script addresses is CLOSED: the rows minted
before that shipped, and no others, ever. A marker would be a column
added for rows that will never be created. When these are gone, so is
the reason for this file.
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
    ap.add_argument("--delete", nargs="+", metavar="SHORT_CODE", default=None,
                    help="remove these rows BY SHORT CODE, exactly. Never a "
                         "predicate — see the module docstring.")
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
            codes = " ".join(r["short_code"] for r in parcel)
            print("Report only — nothing was changed.")
            print("To remove these rows, NAME them:")
            print(f"  python backend/scripts/demo_authenticity_audit.py "
                  f"--delete {codes}")
            return 0

        wanted = {c.upper().strip() for c in args.delete}
        known = {r["short_code"] for r in parcel}
        unknown = wanted - known
        if unknown:
            print("REFUSED. These short codes are not in the demo-parcel "
                  "report above:")
            for code in sorted(unknown):
                print(f"  {code}")
            print("\nNothing was deleted. Re-run the report and copy the "
                  "codes from it.")
            return 1

        cursor.execute(
            "DELETE FROM document_authenticity WHERE short_code = ANY(%s) "
            "RETURNING short_code",
            (sorted(wanted),))
        removed = cursor.fetchall() or []
        conn.commit()
        print(f"Removed {len(removed)} row(s):")
        for r in removed:
            print(f"  {r['short_code']}")
        return 0
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
