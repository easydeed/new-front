"""T-4 — the file concept, and the two things it must never do.

The workflow this kills: an officer finishes a grant deed, then starts
the affidavit for the same property an hour later and retypes the APN,
the legal description, the address and the escrow number she already
confirmed once.

The two failure modes it must not introduce:

1. RE-STAMPING A CONFIRMATION. A `confirmedAt` is the record of a moment
   a human looked at a value and said yes. Copying it forward with a
   FRESH timestamp forges a second look that never happened.

2. CARRYING A LEGAL CHOICE. The DTT exemption accepted on Monday's
   interspousal transfer is not thereby correct on Tuesday's quitclaim.
   Carrying it would auto-apply a legal choice to a document nobody has
   read — while wearing the officer's own recorded acceptance, which
   makes it worse than an auto-apply rather than better.
"""
import pytest

from services.matters import (
    CARRYABLE_ROW_FIELDS, LEGAL_CHOICE_KEYS,
    carry_forward, matter_key, party_names,
)


def _row(**over):
    row = {
        "id": 501,
        "user_id": 9,
        "property_address": "1420 OCEAN AVE",
        "apn": "4291-013-027",
        "county": "Los Angeles",
        "legal_description": "LOT 7, BLOCK B",
        "grantor_name": "JAMES R. OKONKWO",
        "grantee_name": "MARIA L. TORRES",
        "metadata": {
            "escrow_no": "ESC-88214",
            "title_order_no": "TO-99",
            "property_city": "SANTA MONICA",
            "provenance": {
                "apn": {"value": "4291-013-027", "source": "sitex",
                        "status": "confirmed", "confirmedAt": "2026-08-01T10:00:00Z"},
            },
            "dtt": {"isExempt": True, "exemptReason": "R&T 11927",
                    "basis": "full_value"},
            "dttDecision": {"source": "ai_suggested", "status": "confirmed",
                            "confirmedAt": "2026-08-01T10:05:00Z",
                            "codeSection": "R&T 11927"},
            "affidavit": {"decedentName": "SOMEBODY"},
        },
    }
    row.update(over)
    return row


# ── The thread ───────────────────────────────────────────────────────

def test_escrow_number_is_the_thread():
    assert matter_key(_row()) == ("escrow_no", "ESC-88214")


def test_title_order_is_the_fallback():
    r = _row()
    r["metadata"] = {**r["metadata"], "escrow_no": ""}
    assert matter_key(r) == ("title_order_no", "TO-99")


def test_no_number_is_not_an_error():
    """A matter is opt-in — created by the officer having typed a number
    they already use. A deed without one simply is not grouped."""
    r = _row(metadata={})
    assert matter_key(r) is None


def test_whitespace_only_is_not_a_key():
    r = _row()
    r["metadata"] = {**r["metadata"], "escrow_no": "   ", "title_order_no": "  "}
    assert matter_key(r) is None


# ── Both party shapes ────────────────────────────────────────────────

def test_two_party_instruments_read_from_the_columns():
    assert party_names(_row()) == ["JAMES R. OKONKWO", "MARIA L. TORRES"]


def test_single_party_instruments_read_from_the_jsonb():
    """The declaration and affidavit families carry their people in
    `parties`, per the parties migration. A reader that knows only the
    columns misses the affidavit family entirely — which is exactly the
    half an officer wants grouped WITH a deed."""
    r = _row(grantor_name=None, grantee_name=None,
             parties={"declarant": "ELENA V. MARQUEZ"})
    assert party_names(r) == ["ELENA V. MARQUEZ"]


def test_both_shapes_at_once():
    r = _row(parties={"trustee": "FIRST TRUST CO"})
    assert set(party_names(r)) == {
        "JAMES R. OKONKWO", "MARIA L. TORRES", "FIRST TRUST CO"}


def test_empty_party_values_are_skipped():
    r = _row(grantor_name="", grantee_name=None, parties={"declarant": "  "})
    assert party_names(r) == []


# ── Facts carry ──────────────────────────────────────────────────────

def test_property_facts_carry():
    carried = carry_forward(_row())["carried"]
    for f in CARRYABLE_ROW_FIELDS:
        assert f in carried
    assert carried["apn"] == "4291-013-027"
    assert carried["property_city"] == "SANTA MONICA"
    assert carried["escrow_no"] == "ESC-88214"


# ── ...with the ORIGINAL confirmation, never a fresh one ─────────────

def test_a_carried_confirmation_keeps_its_original_timestamp():
    """The heart of it. A fresh stamp would forge a second look."""
    prov = carry_forward(_row())["provenance"]
    assert prov["apn"]["confirmedAt"] == "2026-08-01T10:00:00Z"
    assert prov["apn"]["source"] == "sitex"
    assert prov["apn"]["status"] == "confirmed"


def test_a_carried_field_is_visibly_marked_as_carried():
    """Inherited data must never present itself as freshly entered."""
    prov = carry_forward(_row())["provenance"]
    assert prov["apn"]["carriedFrom"] == 501


def test_nothing_in_the_payload_is_stamped_now():
    """No key anywhere may hold a timestamp minted during the carry."""
    import datetime
    today = datetime.date.today().isoformat()
    payload = carry_forward(_row())
    assert today not in repr(payload), (
        "a fresh timestamp appeared in a carry-forward payload — the only "
        "timestamps here may be the ORIGINAL confirmations"
    )


# ── Legal choices never carry ────────────────────────────────────────

@pytest.mark.parametrize("key", LEGAL_CHOICE_KEYS)
def test_no_legal_choice_key_survives_the_carry(key):
    """Occurrence pin, one per key by name — the T-3b lesson: a group
    assertion shrugs where a per-element one fails."""
    payload = carry_forward(_row())
    assert key not in payload["carried"]
    assert key not in payload.get("provenance", {})


def test_the_dtt_exemption_does_not_reach_the_next_document():
    """Concretely: R&T 11927 was accepted for an interspousal transfer.
    The quitclaim that follows it is a different instrument and a
    different decision."""
    payload = carry_forward(_row())
    assert "11927" not in repr(payload), (
        "an accepted exemption travelled to the next document — that is an "
        "auto-applied legal choice wearing the officer's own signature"
    )


def test_the_officer_is_told_what_did_not_carry():
    """A silently empty transfer-tax section looks like a bug. Naming the
    omission is the difference between deliberate and forgotten."""
    not_carried = carry_forward(_row())["not_carried"]
    joined = " ".join(not_carried).lower()
    assert "legal choice" in joined
    assert "transfer-tax" in joined or "transfer tax" in joined


def test_affidavit_facts_do_not_carry_between_instruments():
    """Sworn in a specific document, about a specific death."""
    payload = carry_forward(_row())
    assert "SOMEBODY" not in repr(payload)
