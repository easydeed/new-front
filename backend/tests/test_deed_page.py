"""DEEDDETAIL Unit 2 — the deed page's answer, and what it refuses to say.

═══ THE RULE THIS FILE IS BUILT AROUND ═══

A fact that invalidates the page cannot be rendered as an item on the
page. A superseded deed is one the officer should not be working on, and
a "next action" offered beside a warning is an invitation to work on the
wrong document — she has no way to know it is the wrong one except by us
not offering.

So the disqualification is not a banner. It is the answer to "is there a
page", asked before anything else is composed.

═══ AND THE ONE IT IS BUILT AGAINST ═══

We prepare documents. We do not record them, we are never told when a
county does, and no state here may imply otherwise. The ladder stops at
ready-to-record.

`recorded` sits past that line for exactly one reason: it is not our
claim. It is the officer's, carried with who asserted it and when. That
is the difference between reporting what somebody told us and asserting
what we did not observe.
"""
import pytest

from services.deed_page import (
    ACTION_KINDS, CONTACT_FRAGMENTS, DEED_PAGE_KEYS, DEED_STATES,
    ContactOnTheDocument, deed_page, disqualification, document_parties,
    document_party, refuse_contact, state_and_next, working_parties,
)


def _deed(**over):
    row = {"id": 7, "status": "completed", "deed_type": "grant-deed",
           "property_address": "123 Baseline St", "county": "Los Angeles",
           "grantor_name": "Jane Doe", "grantee_name": "John Roe",
           "completed_at": "2026-08-01T00:00:00Z"}
    row.update(over)
    return row


# ── 1. The disqualification replaces the page ────────────────────────

def test_a_superseded_deed_is_disqualified():
    got = disqualification(_deed(superseded_at="2026-08-02T00:00:00Z",
                                 superseded_by=9))
    assert got["kind"] == "superseded"
    assert got["go_to_deed_id"] == 9


def test_a_deleted_deed_is_disqualified():
    assert disqualification(_deed(status="deleted"))["kind"] == "deleted"


def test_an_ordinary_deed_is_not():
    assert disqualification(_deed()) is None


def test_supersession_outranks_deletion_and_the_order_is_the_point():
    """Both can be true, and which she is told changes where she goes.

    THE ORDER IS PINNED, NOT THE OUTCOME. Either order is defensible; an
    unwritten tie-break is one the next person re-derives differently,
    and the difference here is whether she is handed the replacement or
    sent back to a list.
    """
    got = disqualification(_deed(status="deleted", superseded_by=9,
                                 superseded_at="2026-08-02T00:00:00Z"))
    assert got["kind"] == "superseded"
    assert got["go_to_deed_id"] == 9


def test_a_disqualification_always_has_an_exit():
    """A dead end wearing an explanation is still a dead end."""
    for row in (_deed(superseded_at="x", superseded_by=9),
                _deed(status="deleted")):
        got = disqualification(row)
        assert got["headline"] and got["sentence"]


def test_the_payload_still_carries_every_section_when_disqualified():
    """The REPLACE rule is about what the SCREEN renders.

    A payload whose shape changes with its content gives the page two
    contracts, and the second one is the one nothing tests. The screen
    renders the disqualification alone; the server keeps one shape.
    """
    out = deed_page(_deed(superseded_at="x", superseded_by=9))
    assert set(out) == DEED_PAGE_KEYS
    assert out["disqualified"] is not None
    assert out["state"] is not None


# ── 2. One state, one obvious action ─────────────────────────────────

@pytest.mark.parametrize("row,shares,signings,expected", [
    (_deed(status="draft"), [], [], "draft"),
    (_deed(), [], [], "ready"),
    (_deed(), [{"status": "sent"}], [], "in_review"),
    (_deed(), [{"status": "approved"}], [], "approved"),
    (_deed(), [{"status": "rejected"}], [], "changes_requested"),
    (_deed(), [], [{"live": True, "summary": "Waiting on two signers."}], "signing"),
    (_deed(recorded_at="2026-08-05T00:00:00Z"), [], [], "recorded"),
])
def test_the_ladder(row, shares, signings, expected):
    got = state_and_next(row, shares=shares, signings=signings)
    assert got["state"] == expected
    assert got["state"] in DEED_STATES


def test_a_change_request_beats_an_approval():
    """Two reviewers disagreeing is not "approved".

    Showing the good news while a change request sits unread is how a
    deed gets recorded with a known defect in it.
    """
    got = state_and_next(_deed(), shares=[{"status": "approved"},
                                          {"status": "rejected"}])
    assert got["state"] == "changes_requested"


def test_a_live_signing_beats_a_review():
    """The signing has a date on it and people waiting."""
    got = state_and_next(_deed(), shares=[{"status": "sent"}],
                         signings=[{"live": True, "summary": "Booked."}])
    assert got["state"] == "signing"


def test_a_dead_signing_does_not():
    got = state_and_next(_deed(), shares=[{"status": "sent"}],
                         signings=[{"live": False, "summary": "Cancelled."}])
    assert got["state"] == "in_review"


def test_the_signing_sentence_is_the_servers_not_a_second_one():
    """§13 rule 3. `signing_loop` already composed an account of this
    scheduling state; composing another here is the second opinion, and
    the second opinion is the one nobody updates."""
    got = state_and_next(_deed(), signings=[
        {"live": True, "summary": "Waiting on Maria and two signers."}])
    assert got["sentence"] == "Waiting on Maria and two signers."


def test_every_state_offers_exactly_one_action_of_a_known_kind():
    for row, shares, signings in [
        (_deed(status="draft"), [], []),
        (_deed(), [], []),
        (_deed(), [{"status": "sent"}], []),
        (_deed(), [{"status": "approved"}], []),
        (_deed(), [{"status": "rejected"}], []),
        (_deed(), [], [{"live": True, "summary": "x"}]),
        (_deed(recorded_at="2026-08-05T00:00:00Z"), [], []),
    ]:
        action = state_and_next(row, shares=shares, signings=signings)["next_action"]
        assert action["kind"] in ACTION_KINDS


# ── THE LADDER STOPS AT READY TO RECORD ──────────────────────────────

def test_no_state_claims_a_county_did_anything():
    """THE PIN THIS FILE EXISTS FOR.

    Sweep every reachable state. Nothing in a headline or a sentence may
    assert that this instrument was recorded, filed, accepted or
    rejected by a recorder — we do not observe any of that, and a
    product that says so is asserting what it did not see.

    `recorded` is exempt from the phrasing sweep and gets its own,
    stricter test below: it is allowed to use the word precisely because
    it attributes it.
    """
    forbidden = ("was recorded by", "the county has", "filed with the county",
                 "accepted by the recorder", "rejected by the recorder",
                 "recording confirmed")
    for row, shares, signings in [
        (_deed(status="draft"), [], []),
        (_deed(), [], []),
        (_deed(), [{"status": "sent"}], []),
        (_deed(), [{"status": "approved"}], []),
        (_deed(), [{"status": "rejected"}], []),
        (_deed(), [], [{"live": True, "summary": "x"}]),
    ]:
        got = state_and_next(row, shares=shares, signings=signings)
        blob = f"{got['headline']} {got['sentence']}".lower()
        for phrase in forbidden:
            assert phrase not in blob, f"{got['state']} claims: {phrase}"


def test_recorded_is_attributed_to_her_and_never_to_us():
    """The one state past the line, and why it is allowed there."""
    got = state_and_next(_deed(recorded_at="2026-08-05T00:00:00Z",
                               instrument_number="2026-123456",
                               recording_asserted_at="2026-08-05T10:00:00Z"))
    assert got["state"] == "recorded"
    assert "You recorded" in got["sentence"]
    # It says out loud that the county did not tell us.
    assert "not told by the county" in got["sentence"]
    # And it carries WHEN she said so — §13.2, the assertion is the event.
    assert got["asserted_at"] == "2026-08-05T10:00:00Z"


def test_the_instrument_number_is_hers_when_she_gave_one():
    got = state_and_next(_deed(recorded_at="x", instrument_number="2026-123456"))
    assert "2026-123456" in got["sentence"]
    plain = state_and_next(_deed(recorded_at="x"))
    assert "as " not in plain["sentence"].split(".")[0]


# ── The participants split ───────────────────────────────────────────

def test_on_the_document_carries_a_role_and_a_name_and_nothing_else():
    assert document_parties(_deed()) == [
        {"role": "Grantor", "name": "Jane Doe"},
        {"role": "Grantee", "name": "John Roe"},
    ]


@pytest.mark.parametrize("field", [
    "email", "recipient_email", "phone", "signer_phone", "contact",
    "contact_email", "address_line1", "mobile", "tel",
])
def test_a_contact_field_can_never_appear_under_on_the_document(field):
    """THE PIN THE SPLIT EXISTS FOR, and it is callable rather than a
    comment.

    A grantee is a person receiving property. They are not a user of this
    product and never consented to anything. Putting an email beside
    their name invites an officer to mail a stranger about a conveyance —
    and the affordance IS the invitation.

    Matched as a category, not as one spelling: `email`,
    `recipient_email`, `signer_phone` and `contact_email` are the same
    mistake four times.
    """
    with pytest.raises(ContactOnTheDocument, match="is a contact field"):
        refuse_contact(field)

    # ═══ AND THE CONSTRUCTOR REFUSES IT AS A CONTACT ═══
    #
    # A mutation probe deleted `refuse_contact(key)` from
    # `document_party` and this test still passed: the key-set assert
    # below it raises the SAME exception type, so the contact rule could
    # be removed entirely without a failure.
    #
    # That is the vocabulary trap again — a test written in the terms of
    # the thing it checks cannot notice that thing collapsing. Matching
    # the REASON tells the two refusals apart, so deleting the contact
    # check fails here even though something still raises.
    with pytest.raises(ContactOnTheDocument, match="is a contact field"):
        document_party("Grantee", "John Roe", **{field: "x@y.z"})


def test_even_a_harmless_extra_field_is_refused():
    """Not because a nickname is dangerous, but because the shape is the
    guarantee. If anything may be added, the contact rule is a habit."""
    with pytest.raises(ContactOnTheDocument):
        document_party("Grantee", "John Roe", nickname="Jack")


def test_the_fragments_cover_what_the_participants_table_actually_holds():
    """A rule that does not match the real column names is decoration."""
    for column in ("email", "phone"):
        assert any(f in column for f in CONTACT_FRAGMENTS)


def test_an_unnamed_party_is_absent_rather_than_blank():
    assert document_parties(_deed(grantee_name="   ")) == [
        {"role": "Grantor", "name": "Jane Doe"}]


def test_working_parties_carry_state_because_that_is_what_makes_them_different():
    out = working_parties(
        shares=[{"recipient_name": "Maria", "status": "approved"}],
        signings=[{"notary_name": "Ana", "state": "booked", "summary": "Booked."}],
        participants=[{"name": "John Roe", "party_role": "signer",
                       "answer": "available"}],
    )
    assert [p["role"] for p in out] == ["Reviewer", "Notary", "Signer"]
    assert all(p["state"] and p["sentence"] for p in out)


def test_the_two_lists_never_merge():
    """One is text on an instrument; the other is people with jobs."""
    out = deed_page(_deed(), shares=[{"recipient_name": "Maria", "status": "sent"}])
    assert {p["name"] for p in out["on_the_document"]} == {"Jane Doe", "John Roe"}
    assert "Maria" not in {p["name"] for p in out["on_the_document"]}
    assert set(out["on_the_document"][0]) == {"role", "name"}


# ── The instrument ───────────────────────────────────────────────────

def test_a_draft_offers_no_download():
    """A link before the bytes exist is a 404 she reads as a lost
    document."""
    out = deed_page(_deed(status="draft", completed_at=None))
    assert out["instrument"]["available"] is False


def test_a_generated_deed_does():
    assert deed_page(_deed())["instrument"]["available"] is True


# ── The contract ─────────────────────────────────────────────────────

def test_the_payload_shape_is_asserted_not_filtered():
    out = deed_page(_deed())
    assert set(out) == DEED_PAGE_KEYS


def test_the_activity_is_passed_through_untouched():
    """This module does not re-sort, re-word or re-classify the feed.
    `deed_activity` decided what is an EVENT and what is a DERIVED
    timestamp, and a second opinion about that is the fabrication risk
    that whole module exists to hold down."""
    entries = [{"at": "2026-08-01T00:00:00Z", "kind": "event",
                "what": "deed.generated", "sentence": "Deed generated.",
                "source": "deeds.completed_at"}]
    assert deed_page(_deed(), activity=entries)["activity"] == entries
