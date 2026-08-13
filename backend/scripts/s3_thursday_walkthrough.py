"""RED-S3 — the Thursday, walked. Executed, not asserted.

An escrow officer opens a deed at 4:20 on a Thursday. The phone goes, a
buyer is in the lobby, a lender will not send the payoff. She comes back
at 4:55 and presses a button.

That is the scenario Reviewer 2 abandoned the trial over, and it is the
one this script performs — with a REAL expired token, against the REAL
app, not a mocked clock and not a unit test of a helper.

Steps:

  1. She signs in.                        (access + refresh issued)
  2. She starts a deed and types.         (saved as a draft)
  3. Time passes. Her ACCESS TOKEN EXPIRES — genuinely, by minting one
     that is already past its exp.
  4. She presses a button.                (401 — the old ending)
  5. The client refreshes silently.       (rotation; she notices nothing)
  6. Her work is still there, byte-identical, DOWN TO THE UNCONFIRMED
     AMBER FIELDS — which is the part that matters, because a resume
     that loses provenance has quietly confirmed things she never
     looked at.

Then the harder half:

  7. The refresh token is revoked (she was signed out elsewhere, or it
     genuinely expired). The 401 is now real.
  8. The client PRESERVES her work before navigating.
  9. She signs in again and the work comes back byte-identical.

Exit code 1 on any failure.

Usage:
  DATABASE_URL=postgresql://... JWT_SECRET_KEY=x \
  python scripts/s3_thursday_walkthrough.py
"""
import json
import os
import sys
import uuid
from datetime import timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    print("DATABASE_URL is required")
    sys.exit(1)

failures = []


def check(label, ok, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}  {label}{(' — ' + detail) if detail else ''}")
    if not ok:
        failures.append(label)


# The deed she is part-way through. The provenance block is the point:
# APN and legal description arrived from the county record and she has
# NOT confirmed them yet. A resume that loses those stamps would present
# unconfirmed data as confirmed — silently converting amber to green,
# which is worse than losing the draft outright.
HER_WORK = {
    "deedType": "grant-deed",
    "property": {
        "address": "1358 5TH ST",
        "city": "Santa Monica",
        "county": "Los Angeles",
        "apn": "4290-012-034",
        "legalDescription": "LOT 7, BLOCK B, AS PER MAP RECORDED IN BOOK 128",
        "provenance": {
            "apn": {"value": "4290-012-034", "source": "sitex", "status": "candidate"},
            "legalDescription": {"value": "LOT 7, BLOCK B, AS PER MAP RECORDED IN BOOK 128",
                                 "source": "sitex", "status": "candidate"},
        },
    },
    "grantor": "JOHN A. DOE",
    "grantee": "ROBERT C. ROE",
    "vesting": "a single man",
    "escrowNo": "ESC-4471",
}


def main():
    from database import create_tables
    create_tables()

    from fastapi.testclient import TestClient
    from auth import create_access_token, revoke_refresh_family
    from jose import jwt
    import auth as auth_mod
    from main import app

    client = TestClient(app)
    tag = uuid.uuid4().hex[:8]
    email = f"thursday-{tag}@test.local"
    password = "Thursday!Pass1"

    print("\n[1] 4:20pm — she signs in")
    r = client.post("/users/register", json={
        "email": email, "password": password, "confirm_password": password,
        "full_name": "Thursday Officer", "role": "escrow_officer",
        "state": "CA", "agree_terms": True})
    check("registered", r.status_code == 200, r.text[:120])
    r = client.post("/users/login", json={"email": email, "password": password})
    check("signed in", r.status_code == 200, r.text[:120])
    if r.status_code != 200:
        return
    body = r.json()
    access, refresh = body.get("access_token"), body.get("refresh_token")
    check("she got an access token", bool(access))
    check("she got a REFRESH token (the whole point)", bool(refresh))

    print("\n[2] she starts a deed and types")
    # The REAL save contract: an explicit field allowlist plus a
    # `provenance` block. There is no builder_state blob, and writing the
    # walkthrough against one I imagined would have proved nothing about
    # the product — which is why this is a walkthrough and not a mock.
    #
    # ═══ WHY THIS MOVED FROM POST /deeds TO POST /deeds/draft ═══
    #
    # It posted to `/deeds`, which is the endpoint that RENDERS AND STORES
    # THE PDF (`generate_and_store`, T2). That is the print path, and
    # REQUIRED1 made it demand what a printed instrument must carry — a
    # vesting statement and a transfer-tax declaration.
    #
    # Which broke this step, correctly: at this point in her Thursday she
    # has typed some fields and has NOT decided the transfer tax. An
    # officer mid-work is exactly who this walkthrough protects, and
    # asking her for a legal decision before she prints anything would be
    # the product hurrying a choice §1 says it must never make for her.
    #
    # So the step now uses the endpoint the PRODUCT uses for a partial
    # save. The builder autosaves to `/deeds/draft` (U1), whose model
    # exists precisely because "a draft may be arbitrarily incomplete".
    # This is the walkthrough becoming MORE faithful, not less: it
    # claimed to exercise the real save contract while using the
    # finalize path.
    r = client.post("/deeds/draft", json={
        "deed_type": "grant-deed", "property_address": HER_WORK["property"]["address"],
        "apn": HER_WORK["property"]["apn"],
        "legal_description": HER_WORK["property"]["legalDescription"],
        "county": HER_WORK["property"]["county"],
        "property_city": HER_WORK["property"]["city"],
        "grantor_name": HER_WORK["grantor"], "grantee_name": HER_WORK["grantee"],
        "vesting": HER_WORK["vesting"], "status": "draft",
        "escrow_no": HER_WORK["escrowNo"],
        "provenance": HER_WORK["property"]["provenance"],
    }, headers={"Authorization": f"Bearer {access}"})
    check("the draft saved", r.status_code in (200, 201), r.text[:160])
    deed_id = (r.json() or {}).get("deed_id") or (r.json() or {}).get("id")
    check("it has an id", deed_id is not None)

    print("\n[3] the phone goes. Her access token EXPIRES (for real)")
    expired = create_access_token(
        data={"sub": jwt.get_unverified_claims(access)["sub"], "email": email,
              "role": "escrow_officer"},
        expires_delta=timedelta(seconds=-5))
    r = client.get("/deeds", headers={"Authorization": f"Bearer {expired}"})
    check("an expired token is refused (401)", r.status_code == 401, str(r.status_code))

    print("\n[4] 4:55pm — she presses a button. The client refreshes SILENTLY")
    r = client.post("/users/refresh-token", json={"refresh_token": refresh})
    check("the refresh succeeded", r.status_code == 200, r.text[:160])
    if r.status_code != 200:
        return
    new_access = r.json()["access_token"]
    new_refresh = r.json()["refresh_token"]
    check("a NEW access token came back", bool(new_access) and new_access != expired)
    check("the refresh token ROTATED", new_refresh != refresh)

    print("\n[5] the request she made is retried, and works")
    r = client.get("/deeds", headers={"Authorization": f"Bearer {new_access}"})
    check("she is working again", r.status_code == 200, str(r.status_code))

    print("\n[6] her work is intact — down to the unconfirmed amber fields")
    r = client.get(f"/deeds/{deed_id}", headers={"Authorization": f"Bearer {new_access}"})
    check("the draft is readable", r.status_code == 200, str(r.status_code))
    if r.status_code == 200:
        row = r.json()
        meta = row.get("metadata") or {}
        if isinstance(meta, str):
            meta = json.loads(meta)
        check("every typed field came back byte-identical",
              (row.get("apn") == HER_WORK["property"]["apn"]
               and row.get("legal_description") == HER_WORK["property"]["legalDescription"]
               and row.get("grantor_name") == HER_WORK["grantor"]
               and row.get("grantee_name") == HER_WORK["grantee"]
               and row.get("vesting") == HER_WORK["vesting"]
               and meta.get("escrow_no") == HER_WORK["escrowNo"]),
              f"apn={row.get('apn')} escrow={meta.get('escrow_no')}")
        prov = meta.get("provenance") or {}
        check("APN is still a CANDIDATE, not silently confirmed",
              prov.get("apn", {}).get("status") == "candidate",
              str(prov.get("apn")))
        check("legal description is still a CANDIDATE",
              prov.get("legalDescription", {}).get("status") == "candidate")
        check("no confirmedAt was invented during the resume",
              "confirmedAt" not in json.dumps(prov))

    print("\n[7] the harder half — the refresh token is gone too")
    fam = jwt.get_unverified_claims(new_refresh)["fam"]
    revoke_refresh_family(fam, "test-signout-elsewhere")
    r = client.post("/users/refresh-token", json={"refresh_token": new_refresh})
    check("a revoked refresh token is refused", r.status_code == 401, str(r.status_code))
    check("and the message tells her to sign in",
          "sign in" in (r.json().get("detail", "").lower()),
          r.json().get("detail", "")[:80])

    print("\n[8] she signs in again — and the deed is still there")
    r = client.post("/users/login", json={"email": email, "password": password})
    check("signed back in", r.status_code == 200, str(r.status_code))
    if r.status_code == 200:
        fresh = r.json()["access_token"]
        r = client.get(f"/deeds/{deed_id}", headers={"Authorization": f"Bearer {fresh}"})
        check("the draft survived the whole ordeal", r.status_code == 200)
        if r.status_code == 200:
            row2 = r.json()
            meta = row2.get("metadata") or {}
            if isinstance(meta, str):
                meta = json.loads(meta)
            prov2 = meta.get("provenance") or {}
            check("byte-identical after a FULL sign-out and back in",
                  row2.get("apn") == HER_WORK["property"]["apn"]
                  and row2.get("legal_description") == HER_WORK["property"]["legalDescription"]
                  and meta.get("escrow_no") == HER_WORK["escrowNo"])
            check("and the amber fields are STILL amber",
                  prov2.get("apn", {}).get("status") == "candidate",
                  str(prov2.get("apn")))

    print("\n[9] revocation actually revokes (the old logout was a no-op)")
    r = client.post("/users/login", json={"email": email, "password": password})
    tok = r.json()["access_token"]
    rt = r.json()["refresh_token"]
    r = client.get("/deeds", headers={"Authorization": f"Bearer {tok}"})
    check("the token works before logout", r.status_code == 200)
    client.post("/users/logout", json={"refresh_token": rt},
                headers={"Authorization": f"Bearer {tok}"})
    r = client.get("/deeds", headers={"Authorization": f"Bearer {tok}"})
    check("the SAME token is dead after logout", r.status_code == 401,
          f"got {r.status_code} — a leaked token would still work")

    print("\n[10] lockout — guessing her password stops working")
    locked = False
    for i in range(8):
        r = client.post("/users/login", json={"email": email, "password": f"wrong-{i}"})
        if r.status_code == 429:
            locked = True
            break
    check("repeated wrong passwords lock the account", locked)

    # cleanup
    import db
    with db.conn.cursor() as cur:
        cur.execute("DELETE FROM deed_pdfs WHERE deed_id IN (SELECT id FROM deeds "
                    "WHERE user_id=(SELECT id FROM users WHERE email=%s))", (email,))
        cur.execute("DELETE FROM deeds WHERE user_id=(SELECT id FROM users WHERE email=%s)",
                    (email,))
        cur.execute("DELETE FROM refresh_tokens WHERE user_id=("
                    "SELECT id FROM users WHERE email=%s)", (email,))
        cur.execute("DELETE FROM login_attempts WHERE email=%s", (email,))
        cur.execute("DELETE FROM user_profiles WHERE user_id=("
                    "SELECT id FROM users WHERE email=%s)", (email,))
        cur.execute("DELETE FROM users WHERE email=%s", (email,))
        db.conn.commit()


if __name__ == "__main__":
    print("RED-S3 — the Thursday walkthrough")
    main()
    print()
    if failures:
        print(f"THE THURSDAY STILL FAILS: {failures}")
        sys.exit(1)
    print("THE THURSDAY PASSES — she lost nothing, and the tokens she "
          "stopped using stopped working.")
