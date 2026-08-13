"""The deed page's whole answer, decided here and rendered verbatim.

═══ WHY THIS IS ONE PAYLOAD AND NOT FIVE FETCHES ═══

The first thing the page must decide is whether it may render at all. A
superseded deed is one the officer should not be working on, and the
ruling is that a fact which invalidates the page cannot be rendered as an
item on the page — it replaces the page.

A screen that fetches state, activity and lineage separately renders the
normal page first and swaps it out when lineage lands. That is the same
defect wearing a smaller hat: for a second she is looking at a "next
action" on a document she must not act on, and a second is long enough to
click. So the disqualification and everything it would have replaced
arrive together, or not at all.

═══ AND WHY THE SENTENCES ARE COMPOSED IN PYTHON ═══

§13 rule 3, the same rule `signing_summary` and `signing_loop` are built
on: ONE place turns state into English. A screen that writes its own
account of a state is a second opinion, and the second opinion is always
the one nobody updates when a state is added.

So `state`, `headline`, `sentence` and the next action's label are
decided here. The page renders strings it was handed.

═══ WHAT THIS DELIBERATELY REFUSES TO KNOW ═══

The ladder stops at READY TO RECORD. We prepare documents; we do not
record them, we are not told when the county does, and no state here may
imply otherwise.

`recorded_at` is the one thing past that line, and it is not our
knowledge — it is the officer's own statement, carried with who made it
and when (`recording_asserted_by`, `recording_asserted_at`). It renders
as her assertion, attributed and terminal, because reporting what she
told us is the opposite of asserting what we did not observe.
"""

from __future__ import annotations

from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence

# ══ THE PARTICIPANT SPLIT ═══════════════════════════════════════════
#
# Two headings, and the difference is not cosmetic.
#
#   ON THE DOCUMENT — grantor and grantee. They are text printed on an
#   instrument. They are not users, they have no state, and there is
#   nothing to do to them. Offering an action here would invite contact
#   with a party to a conveyance through a tool built for coordinating
#   colleagues.
#
#   WORKING ON IT — reviewer, notary, signers. Each lives in its own
#   table, specifically so that none of them ever touches `deeds`, and
#   each carries something an officer can do.

#: The complete key set of an on-the-document party. Asserted rather
#: than filtered — see `document_party`.
DOCUMENT_PARTY_KEYS = frozenset({"role", "name"})

#: Key fragments that mean "a way to reach a person". Matched as
#: substrings because the defect is the CATEGORY, not any one spelling:
#: `email`, `recipient_email`, `signer_phone` and `contact_email` are the
#: same mistake four times.
CONTACT_FRAGMENTS = ("email", "phone", "contact", "address_line", "mobile", "tel")


class ContactOnTheDocument(Exception):
    """A way to reach somebody was offered under 'On the document'."""


def refuse_contact(field: str) -> None:
    """Raise if `field` is a way to reach a person.

    Callable, not a comment. §13.1 says signer contact details do not
    leave their own table; this is the narrower rule that grantor and
    grantee — who are not users of this product and never consented to
    anything — never acquire a contact affordance because a future
    payload happened to carry one.

    A grantee is a person who is receiving property. Putting an email
    field beside their name invites an officer to mail a stranger about
    a conveyance, and the affordance is the invitation.
    """
    lowered = field.lower()
    for fragment in CONTACT_FRAGMENTS:
        if fragment in lowered:
            raise ContactOnTheDocument(
                f"{field!r} is a contact field; grantor and grantee are text "
                "on an instrument, not people this product may reach"
            )


def document_party(role: str, name: Optional[str], **extra: Any) -> Optional[Dict[str, str]]:
    """One name printed on the instrument, or nothing.

    `**extra` exists so that adding a field is a DECISION rather than an
    accident: anything passed is checked against `refuse_contact` and
    then against the key set, so the only way to widen this shape is to
    widen the contract on purpose.
    """
    for key in extra:
        refuse_contact(key)
    cleaned = (name or "").strip()
    if not cleaned:
        return None
    out = {"role": role, "name": cleaned, **extra}
    if set(out) != DOCUMENT_PARTY_KEYS:
        raise ContactOnTheDocument(
            "on-the-document parties carry a role and a name and nothing "
            f"else: extra={sorted(set(out) - DOCUMENT_PARTY_KEYS)}"
        )
    return out


def document_parties(deed: Mapping[str, Any]) -> List[Dict[str, str]]:
    """Grantor and grantee, as printed. No contact detail, by construction."""
    out = [
        document_party("Grantor", deed.get("grantor_name")),
        document_party("Grantee", deed.get("grantee_name")),
    ]
    return [p for p in out if p]


def working_parties(
    *,
    shares: Iterable[Mapping[str, Any]] = (),
    signings: Iterable[Mapping[str, Any]] = (),
    participants: Iterable[Mapping[str, Any]] = (),
) -> List[Dict[str, Any]]:
    """Everybody with a job on this deed, and what is true of them now.

    Names only, as everywhere else — §13.1. What separates these from the
    document parties is not that we hold more about them, it is that each
    one has a STATE that can change and an action attached to it.
    """
    out: List[Dict[str, Any]] = []
    for share in shares:
        status = (share.get("status") or "sent").strip().lower()
        out.append({
            "role": "Reviewer",
            "name": (share.get("recipient_name") or "").strip() or "Reviewer",
            "state": status,
            "sentence": {
                "approved": "Approved it.",
                "rejected": "Asked for changes.",
                "viewed": "Opened it, no answer yet.",
                "revoked": "The link was revoked.",
            }.get(status, "Waiting for an answer."),
        })
    for signing in signings:
        notary = (signing.get("notary_name") or "").strip()
        if notary:
            out.append({"role": "Notary", "name": notary,
                        "state": (signing.get("state") or "").strip(),
                        "sentence": signing.get("summary") or ""})
    for person in participants:
        # `party_role` is stored lowercase ('signer'). The displayed word
        # is composed here rather than capitalised by the screen — §13
        # rule 3 covers the small strings too, and a screen that
        # title-cases one label ends up title-casing a state name.
        role = (person.get("party_role") or "").strip()
        out.append({
            "role": role.capitalize() if role else "Signer",
            "name": (person.get("name") or "").strip() or "Signer",
            "state": (person.get("answer") or "pending").strip().lower(),
            "sentence": {
                "available": "Said that time works.",
                "unavailable": "Said that time does not work.",
            }.get((person.get("answer") or "").strip().lower(),
                  "Has not answered yet."),
        })
    return out


# ══ THE DISQUALIFICATIONS ════════════════════════════════════════════

def disqualification(deed: Mapping[str, Any]) -> Optional[Dict[str, Any]]:
    """The fact that invalidates the page, or None.

    Owner-ruled: this REPLACES normal content. Not a banner above a
    working page — the working page is what must not be there. A "next
    action" offered on a superseded deed invites work on the wrong
    document, and the officer has no way to know it is the wrong one
    except by us not offering.

    Ordered deliberately. A deed can be both deleted and superseded, and
    which one she is told about changes where she should go: superseded
    sends her to the replacement, deleted sends her to the list. The
    replacement is the more useful destination and the more consequential
    fact, so supersession is checked first — and the ORDER is pinned,
    because a tie-break that is not written down gets re-derived
    differently by the next person.
    """
    if deed.get("superseded_at") or deed.get("superseded_by"):
        replacement = deed.get("superseded_by")
        return {
            "kind": "superseded",
            "headline": "This deed was corrected and replaced.",
            "sentence": (
                "A later deed supersedes this one. Work on the replacement — "
                "anything done here would be work on the wrong document."
            ),
            # Where to go instead. A disqualification with no exit is a
            # dead end wearing an explanation.
            "go_to_deed_id": replacement,
        }
    if (deed.get("status") or "").strip().lower() == "deleted":
        return {
            "kind": "deleted",
            "headline": "This deed was deleted.",
            "sentence": (
                "It is kept for the record and cannot be worked on. "
                "Nothing here can be edited, sent or signed."
            ),
            "go_to_deed_id": None,
        }
    return None


# ══ THE STATE, AND THE ONE OBVIOUS ACTION ════════════════════════════

#: The state vocabulary of this page. Every value `state_and_next`
#: returns is one of these, asserted before it leaves — the same
#: discipline as `signing_summary`'s key set, and for the same reason: a
#: screen that receives a state it has never heard of renders nothing.
DEED_STATES = frozenset({
    "draft",
    "ready",
    "in_review",
    "changes_requested",
    "approved",
    "signing",
    "ready_to_record",
    "recorded",
})

#: Actions the page may offer. `kind` is what the screen switches on;
#: the label is the server's words.
#:
#: VERBS, deliberately. The first draft used "signing", which is also a
#: STATE — one word carrying two vocabularies, in a payload whose whole
#: job is telling a state from an action. A pin caught the collision;
#: renaming it was cheaper than teaching every reader which one is meant.
ACTION_KINDS = frozenset({
    "resume", "share_for_review", "open_signing", "download", "none"})


def _action(kind: str, label: str) -> Dict[str, str]:
    if kind not in ACTION_KINDS:
        raise ValueError(f"{kind!r} is not an action this page offers")
    return {"kind": kind, "label": label}


def state_and_next(
    deed: Mapping[str, Any],
    *,
    shares: Sequence[Mapping[str, Any]] = (),
    signings: Sequence[Mapping[str, Any]] = (),
) -> Dict[str, Any]:
    """One state, one obvious action — the question she arrived with.

    ═══ THE LADDER STOPS AT READY TO RECORD ═══

    We are a document-preparation product. Nothing below asserts what a
    county did, because nothing here observes a county. `recorded` is
    above that line only because it is not our claim: it is hers, and it
    carries her name and the moment she made it.

    ═══ WHY THE ORDER IS WHAT IT IS ═══

    Read top to bottom, first match wins, and the order encodes which
    fact is most load-bearing when several are true at once. A deed can
    be out for review AND have a live signing; the signing is the thing
    with a date on it and people waiting, so it wins.

    A rejected review beats an approved one for the opposite reason: two
    reviewers disagreeing is not "approved", and showing the good news
    while a change request sits unread is how a deed gets recorded with
    a known defect in it.
    """
    completed = (deed.get("status") or "").strip().lower() == "completed"

    if deed.get("recorded_at"):
        # HER statement, not ours, and attributed as such. The page shows
        # who said it and when they said it, because the alternative is a
        # bare "Recorded" that reads as though we checked.
        number = (deed.get("instrument_number") or "").strip()
        return {
            "state": "recorded",
            "headline": "Marked as recorded",
            "sentence": (
                "You recorded this instrument"
                + (f" as {number}" if number else "")
                + ". That is your statement — we are not told by the county."
            ),
            "next_action": _action("download", "Download the instrument"),
            "asserted_at": _iso(deed.get("recording_asserted_at")),
        }

    if not completed:
        return {
            "state": "draft",
            "headline": "Draft",
            "sentence": "Not generated yet. Nothing has been sent to anyone.",
            "next_action": _action("resume", "Continue this deed"),
            "asserted_at": None,
        }

    live = [s for s in signings if s.get("live")]
    if live:
        first = live[0]
        return {
            "state": "signing",
            "headline": "Out for signing",
            # WHICH signing. Without it the page can only offer "request
            # a signing", and offering that on a deed that already has
            # one is an invitation to create a second — three more
            # emails and two notaries who each think they have it.
            # CANCEL1 item 4 found exactly this on Past Deeds.
            "signing_request_id": first.get("id"),
            # The server's sentence about a scheduling state is
            # signing_loop's, already composed. Rewriting it here would
            # be the second opinion §13 rule 3 exists to prevent.
            "sentence": first.get("summary") or "A signing is in progress.",
            "next_action": _action("open_signing", "Open the signing"),
            "asserted_at": None,
        }

    decisions = [(s.get("status") or "").strip().lower() for s in shares]
    if "rejected" in decisions:
        return {
            "state": "changes_requested",
            "headline": "Changes requested",
            "sentence": (
                "A reviewer asked for changes. Read what they said before "
                "sending this anywhere else."
            ),
            "next_action": _action("share_for_review", "See the review"),
            "asserted_at": None,
        }
    outstanding = [d for d in decisions if d in ("sent", "viewed", "")]
    if outstanding:
        return {
            "state": "in_review",
            "headline": "Out for review",
            "sentence": "Sent for review. No answer yet.",
            "next_action": _action("share_for_review", "See who has it"),
            "asserted_at": None,
        }
    if "approved" in decisions:
        return {
            "state": "approved",
            "headline": "Approved — ready to record",
            "sentence": (
                "A reviewer approved it. Recording happens at the county; "
                "this product does not do that part and is not told when "
                "it is done."
            ),
            "next_action": _action("download", "Download the instrument"),
            "asserted_at": None,
        }

    return {
        "state": "ready",
        "headline": "Generated",
        "sentence": (
            "The instrument exists and has not been sent to anyone. "
            "Send it for review, or out for signing."
        ),
        "next_action": _action("share_for_review", "Send for review"),
        "asserted_at": None,
    }


def _iso(value: Any) -> Optional[str]:
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


#: Every key the page receives. Asserted, not filtered — a screen and a
#: server that quietly disagree about a key is the defect
#: `signing_summary` was built to end, and this page has five sections
#: that each render nothing if their key is absent.
DEED_PAGE_KEYS = frozenset({
    "deed_id", "disqualified", "state", "activity", "matter",
    "instrument", "on_the_document", "working_on_it",
})


def deed_page(
    deed: Mapping[str, Any],
    *,
    shares: Sequence[Mapping[str, Any]] = (),
    signings: Sequence[Mapping[str, Any]] = (),
    participants: Sequence[Mapping[str, Any]] = (),
    activity: Sequence[Mapping[str, Any]] = (),
    matter: Optional[Mapping[str, Any]] = None,
) -> Dict[str, Any]:
    """Everything the page renders, in one answer.

    When the deed is disqualified the other sections are still computed
    and sent. That is deliberate and it is NOT a contradiction of the
    replace-the-page rule: the rule is about what the SCREEN renders, and
    the screen renders the disqualification alone. Sending a payload
    whose shape changes with its content would give the page two
    contracts, and the second one is the one nothing tests.
    """
    blocked = disqualification(deed)
    out = {
        "deed_id": deed.get("id"),
        "disqualified": blocked,
        "state": state_and_next(deed, shares=shares, signings=signings),
        "activity": list(activity),
        "matter": matter,
        "instrument": {
            "deed_type": deed.get("deed_type"),
            "property_address": deed.get("property_address"),
            "county": deed.get("county"),
            "apn": deed.get("apn"),
            "completed_at": _iso(deed.get("completed_at")),
            # Downloadable only once the bytes exist. A link offered on a
            # draft is a 404 the officer reads as a lost document.
            "available": bool(deed.get("completed_at")),
        },
        "on_the_document": document_parties(deed),
        "working_on_it": working_parties(shares=shares, signings=signings,
                                         participants=participants),
    }
    assert set(out) == DEED_PAGE_KEYS, (
        "the deed page payload no longer matches its contract: "
        f"extra={sorted(set(out) - DEED_PAGE_KEYS)} "
        f"missing={sorted(DEED_PAGE_KEYS - set(out))}"
    )
    state = out["state"]["state"]
    assert state in DEED_STATES, f"{state!r} is not a state this page knows"
    return out
