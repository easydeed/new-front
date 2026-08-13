"""NOTARY2 — what each party may see, as ALLOWLISTS.

═══ WHY ALLOWLISTS AND NOT EXCLUSIONS ═══

Owner ruling, and it is the right instinct: *a denylist enumerates the
examples somebody thought of.* "Do not send the APN" is a rule about the
APN. It says nothing about the legal description somebody adds next
quarter, and the failure mode is silent — the field simply appears on a
consumer's screen and nobody is notified.

So each surface below builds its payload from a NAMED SET OF KEYS, and
the suite pins the response's key set by EXACT EQUALITY. A new field
cannot reach a party without failing a test, whether or not anybody
remembered this file existed.

═══ THE SIGNER SURFACE IS THE FIRST CONSUMER SURFACE THIS PRODUCT HAS ═══

Everyone who has ever seen a DeedPro screen has been an escrow officer, a
title officer, or a notary the officer chose — professionals, under an
engagement. A signer is a member of the public who received an email
about their own house. They did not sign up, cannot log in, and cannot
ask us for anything.

What they get is: which property, who is coordinating, who is coming, the
times, and a way to answer. Not the instrument, not the parcel number,
not the legal description, not the tax figures, not the other signer.

═══ THE NOTARY'S NAME AND COMPANY ARE ON IT (owner-ruled) ═══

She is a professional acting professionally, her name will be on the
certificate, and a consumer told a stranger is coming to their home
deserves to know who. Her EMAIL, PHONE and ADDRESS stay out: the signer
needs to know who is coming, not how to reach her independently — that
is the officer's coordination to hold, and routing around it is how a
scheduling product becomes an unmoderated introduction service.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Sequence

from services import signing_loop as loop

# ── The allowlists, named so the pins can read them ──────────────────

SIGNER_KEYS = frozenset({
    "party_role",
    "property_street",     # first comma segment ONLY — never the full address
    "coordinator",         # {name, company} — the officer
    "notary",              # {name, company} — no email, no phone, no address
    "windows",
    "my_answers",
    "can_propose",
    "proposals_remaining",
    "state",
    "summary",
    "expires_at",
})

NOTARY_KEYS = frozenset({
    "party_role",
    "property_address",
    "county",
    "deed_type",
    "coordinator",
    "signers",             # display names only
    "windows",
    "my_answers",
    "state",
    "summary",
    "expires_at",
    "pcor_url",
    "pdf_url",
})

# Every key that would carry a way to reach somebody. The signer package
# is checked against this too — belt and braces, because the allowlist
# protects the SHAPE and this protects the CONTENT of a nested object.
CONTACT_KEYS = frozenset({"email", "phone", "mobile", "cell", "address",
                          "address_line1", "postal_code", "contact"})


def _street_only(address: Optional[str]) -> str:
    """The first comma segment. A signer knows which house is theirs from
    the street line; the city, county and parcel are the instrument's
    business, not the appointment's."""
    if not address:
        return ""
    return str(address).split(",")[0].strip()


def _person(name: Optional[str], company: Optional[str] = None) -> Dict[str, Any]:
    """A person, as a name and at most a company. There is deliberately
    no branch of this function that adds an address of any kind."""
    return {"name": (name or "").strip() or None,
            "company": (company or "").strip() or None}


def signer_package(*, request: Dict[str, Any], me: Dict[str, Any],
                   participants: Sequence[Dict[str, Any]],
                   windows: Sequence[Dict[str, Any]],
                   responses: Sequence[Dict[str, Any]],
                   deed: Dict[str, Any],
                   officer: Dict[str, Any]) -> Dict[str, Any]:
    """MINIMUM SURFACE. Consumer-facing.

    Read the key set, not the code: whatever is not in `SIGNER_KEYS` is
    not here, and the suite proves it by equality rather than by reading
    this function charitably.
    """
    tz = request.get("tz_name")
    notary = next((p for p in participants
                   if p.get("party_role") == loop.ROLE_NOTARY), {})
    # FLOW1 item 7: AN ANSWER CARRIES WHO GAVE IT.
    #
    # Under dispatch the officer answers on her signers' behalf. A
    # consumer opening their link and seeing themselves marked available
    # on a time they never answered would be this product telling them
    # they said something they did not say — to the one audience with no
    # account, no history and no way to check. So the answer travels as
    # {answer, asserted_by} rather than as a bare string, in both places
    # it appears.
    mine = {int(r["window_id"]): {"answer": r["answer"],
                                  "asserted_by": loop.asserted_by(r)}
            for r in responses
            if int(r["participant_id"]) == int(me["id"])}
    live = [w for w in windows if not w.get("declined_at")]
    used = int(request.get("signer_proposals") or 0)

    package = {
        "party_role": loop.ROLE_SIGNER,
        "property_street": _street_only(deed.get("property_address")),
        "coordinator": _person(officer.get("full_name"), officer.get("company_name")),
        "notary": _person(notary.get("display_name"), notary.get("company_name")),
        "windows": [
            {"id": int(w["id"]), "label": loop.window_label(w, tz),
             "start": w["starts_at"].isoformat() if hasattr(w["starts_at"], "isoformat") else w["starts_at"],
             "mine": mine.get(int(w["id"]))}
            for w in live
        ],
        "my_answers": mine,
        "can_propose": used < loop.MAX_SIGNER_PROPOSALS and not request.get("booked_at"),
        "proposals_remaining": max(0, loop.MAX_SIGNER_PROPOSALS - used),
        "state": loop.request_state(request, windows, responses),
        "summary": loop.state_label(request, windows, responses, participants),
        "expires_at": _iso(me.get("expires_at")),
    }
    assert set(package) == SIGNER_KEYS, "signer package drifted from its allowlist"
    return package


def notary_package(*, request: Dict[str, Any], me: Dict[str, Any],
                   participants: Sequence[Dict[str, Any]],
                   windows: Sequence[Dict[str, Any]],
                   responses: Sequence[Dict[str, Any]],
                   deed: Dict[str, Any],
                   officer: Dict[str, Any],
                   token: str) -> Dict[str, Any]:
    """The notary's surface. Wider than the signer's and narrower than the
    officer's: she is going to the address, checking IDs against names,
    and notarising this instrument, so she gets the address, the party
    names and the package. She does not get signer contact details —
    she has no reason to reach them directly and the officer does."""
    tz = request.get("tz_name")
    mine = {int(r["window_id"]): {"answer": r["answer"],
                                  "asserted_by": loop.asserted_by(r)}
            for r in responses
            if int(r["participant_id"]) == int(me["id"])}
    package = {
        "party_role": loop.ROLE_NOTARY,
        "property_address": deed.get("property_address"),
        "county": deed.get("county"),
        "deed_type": deed.get("deed_type"),
        "coordinator": _person(officer.get("full_name"), officer.get("company_name")),
        "signers": [
            {"name": p.get("display_name") or "Signer"}
            for p in participants
            if p.get("party_role") == loop.ROLE_SIGNER and not p.get("revoked_at")
        ],
        "windows": [
            {"id": int(w["id"]), "label": loop.window_label(w, tz),
             "origin": w.get("origin"),
             "declined": bool(w.get("declined_at")),
             "start": _iso(w.get("starts_at")),
             "mine": mine.get(int(w["id"])),
             "agreed_by": _agreed_names(participants, responses, w)}
            for w in windows
        ],
        "my_answers": mine,
        "state": loop.request_state(request, windows, responses),
        "summary": loop.state_label(request, windows, responses, participants),
        "expires_at": _iso(me.get("expires_at")),
        "pcor_url": f"/signing/{token}/pcor",
        "pdf_url": f"/signing/{token}/pdf",
    }
    assert set(package) == NOTARY_KEYS, "notary package drifted from its allowlist"
    return package


def _agreed_names(participants: Sequence[Dict[str, Any]],
                  responses: Sequence[Dict[str, Any]],
                  window: Dict[str, Any]) -> List[str]:
    """Who AGREED to this time — never counting whoever offered it.

    ═══ ANSWERING YOUR OWN QUESTION IS NOT AN AGREEMENT ═══

    Posting a time writes an implicit `available` row for the poster:
    saying "I am free Tuesday" is saying you are free Tuesday, and making
    her tick her own window would be the product asking a question it
    already has the answer to. That part is right and stays.

    What was wrong is that the implicit row then came back to her as a
    COUNT. Her own window read

        You offered this · 1 agreed

    directly above a summary saying "waiting on 1 more person" — so the
    screen simultaneously told her somebody had agreed and that nobody
    had. The 1 was her.

    An agreement is somebody answering a question you asked. The offer is
    the question; the offerer is not one of its answers.

    Scoped to the WINDOW's proposer, not to the reader: a signer looking
    at the notary's window should not see the notary counted either,
    because she still has not agreed to anything — she proposed it.
    """
    by_id = {int(p["id"]): p for p in participants}
    proposer = window.get("proposed_by")
    proposer_id = int(proposer) if proposer is not None else None
    window_id = int(window["id"])
    return [
        (by_id[int(r["participant_id"])].get("display_name") or "Signer")
        for r in responses
        if int(r["window_id"]) == window_id and r.get("answer") == loop.ANSWER_AVAILABLE
        and int(r["participant_id"]) in by_id
        and int(r["participant_id"]) != proposer_id
    ]


def _iso(value: Any) -> Any:
    return value.isoformat() if hasattr(value, "isoformat") else value


def contains_contact(payload: Any) -> List[str]:
    """Walk a package and report any key that would carry a way to reach
    somebody. Used by the suite against the SIGNER package specifically —
    the allowlist protects the top-level shape, and this protects the
    nested objects inside it."""
    found: List[str] = []

    def walk(node: Any, path: str) -> None:
        if isinstance(node, dict):
            for key, value in node.items():
                if key.lower() in CONTACT_KEYS:
                    found.append(f"{path}.{key}" if path else key)
                walk(value, f"{path}.{key}" if path else str(key))
        elif isinstance(node, (list, tuple)):
            for i, item in enumerate(node):
                walk(item, f"{path}[{i}]")

    walk(payload, "")
    return found
