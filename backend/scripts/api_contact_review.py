"""P04 owner-operated contact inventory/holds. No legacy redaction command.

Default is read-only and fails closed for restore release. Production access
and hold invocation require separate owner action; never pass secrets as args.
"""
import argparse
from contextlib import closing
import json
import os
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--restore-review", action="store_true")
    parser.add_argument("--hold", metavar="DEED_ID")
    parser.add_argument("--release-hold", metavar="DEED_ID")
    parser.add_argument("--operator")
    parser.add_argument("--case-reference")
    parser.add_argument("--confirm-database")
    parser.add_argument("--apply-hold", action="store_true")
    args = parser.parse_args(argv)
    target = args.hold or args.release_hold
    if args.hold and args.release_hold:
        parser.error("Choose only one hold action")
    if args.restore_review and target:
        parser.error("Restore review cannot be combined with a hold action")
    if args.apply_hold and (not target or not args.operator or not args.case_reference or not args.confirm_database):
        parser.error("A hold write requires target, opaque operator/case references and exact database confirmation")
    url = os.getenv("DATABASE_URL")
    if not url:
        print("DATABASE_URL is not set; refusing to guess", file=sys.stderr)
        return 1
    import psycopg2
    from db_rows import ROW_FACTORY
    from services.db_identity import WrongDatabase, assert_tables, describe, expected_database
    from services.api_contact_retention import inventory, restore_review, set_retention_hold, validate_record_id
    if target:
        validate_record_id(target)
    with closing(psycopg2.connect(url, cursor_factory=ROW_FACTORY)) as conn, conn:
        if not args.apply_hold:
            conn.set_session(readonly=True)
        try:
            assert_tables(conn, "api_deeds", "api_contact_hold_events", "document_authenticity",
                          expect_database=args.confirm_database or expected_database())
        except WrongDatabase as exc:
            print(str(exc), file=sys.stderr)
            return 1
        print("database: " + describe(conn))
        if args.apply_hold:
            set_retention_hold(conn, target, held=bool(args.hold), operator_claim=args.operator,
                               case_reference=args.case_reference)
            conn.commit()
            print(json.dumps({"hold_changed_or_already_set": True}))
        elif target:
            print(json.dumps({"applied": False, "hold_plan": target,
                              "held": bool(args.hold), "requires_owner_action": True}))
        elif args.restore_review:
            print(json.dumps(restore_review(conn)))
            return 2  # Never a production traffic-release command.
        else:
            print(json.dumps(inventory(conn)))
    return 0


if __name__ == "__main__":
    try:
        result = main()
    except Exception:
        print("Contact review failed; no raw database detail is logged", file=sys.stderr)
        result = 1
    raise SystemExit(result)
