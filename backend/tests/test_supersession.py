"""T-5 — correction lineage: a new row and a pointer, never a mutation.

Doctrine §9 said a stored instrument is never overwritten and parked the
supersession model as design work. This is that design, and the tests
below are mostly about the ways it could quietly become the thing it
replaced.

The temptation to guard against is not exotic — it is the next feature
request: "the officer made a typo, just fix the deed." A generated deed
is an instrument; it may have been printed, signed, notarised, recorded.
Editing the row would leave the world holding a document our record no
longer describes, silently.
"""
import pytest

from tests.source_text import code_only
from pathlib import Path

from services.supersession import (
    SupersessionRefused, is_superseded, lineage_state,
    validate_supersession, walk_chain,
)

BACKEND = Path(__file__).resolve().parents[1]


def _deed(**over):
    row = {"id": 1, "user_id": 7, "status": "completed", "superseded_by": None}
    row.update(over)
    return row


# ── The derived state ────────────────────────────────────────────────

def test_a_deed_with_no_pointer_is_active():
    assert lineage_state(_deed()) == "active"
    assert is_superseded(_deed()) is False


def test_a_deed_with_a_pointer_is_superseded():
    assert lineage_state(_deed(superseded_by=2)) == "superseded"
    assert is_superseded(_deed(superseded_by=2)) is True


def test_superseded_and_completed_are_orthogonal():
    """The reason the state is DERIVED rather than folded into
    `deeds.status`: a superseded deed is still a COMPLETED deed. It was
    generated, it exists in the world, and overloading the lifecycle
    column would force a choice between two facts that are both true."""
    row = _deed(superseded_by=2)
    assert row["status"] == "completed"
    assert lineage_state(row) == "superseded"


# ── Every refusal, by name ───────────────────────────────────────────

def test_a_deed_cannot_supersede_itself():
    with pytest.raises(SupersessionRefused, match="cannot supersede itself"):
        validate_supersession(_deed(id=1), _deed(id=1))


def test_supersession_cannot_cross_accounts():
    with pytest.raises(SupersessionRefused, match="same account"):
        validate_supersession(_deed(id=1, user_id=7), _deed(id=2, user_id=8))


def test_a_draft_is_edited_not_superseded():
    """Supersession is for instruments that already exist in the world.
    A draft is still editable — offering supersession there would teach
    the wrong model for the case that matters."""
    with pytest.raises(SupersessionRefused, match="draft is still"):
        validate_supersession(_deed(id=1, status="draft"), _deed(id=2))


def test_the_correction_must_exist_before_it_can_replace_anything():
    with pytest.raises(SupersessionRefused, match="not at an intention"):
        validate_supersession(_deed(id=1), _deed(id=2, status="draft"))


def test_the_pointer_is_written_once():
    """A second write would silently redirect history — the same class of
    harm §9 refuses on the artifacts."""
    with pytest.raises(SupersessionRefused, match="already superseded"):
        validate_supersession(_deed(id=1, superseded_by=2), _deed(id=3))


def test_the_obvious_loop_is_refused():
    with pytest.raises(SupersessionRefused, match="loop"):
        validate_supersession(_deed(id=1), _deed(id=2, superseded_by=1))


def test_a_valid_supersession_passes():
    validate_supersession(_deed(id=1), _deed(id=2))


# ── Never a mutation ─────────────────────────────────────────────────

def test_the_only_write_is_the_pointer():
    """THE LOAD-BEARING PIN of this ticket.

    The supersede endpoint must touch `superseded_by` and `superseded_at`
    and NOTHING else. If it ever learns to write a deed's content,
    supersession has quietly become editing — with a lineage row for
    cover, which is worse than editing openly.
    """
    src = code_only(BACKEND / "routers/deeds_crud.py")
    start = src.index("def supersede_endpoint(")
    end = src.index("def lineage_endpoint(")
    body = src[start:end]

    updates = [ln for ln in body.splitlines() if "UPDATE deeds" in ln or "SET " in ln]
    assert updates, "the supersede path stopped writing anything"
    joined = " ".join(updates)
    assert "superseded_by" in joined and "superseded_at" in joined
    for forbidden in ("property_address", "apn", "grantor_name", "grantee_name",
                      "legal_description", "vesting", "metadata", "status ="):
        assert forbidden not in joined, (
            f"the supersede path writes {forbidden!r} — supersession is a "
            "pointer, not an edit"
        )


def test_supersession_never_deletes():
    src = code_only(BACKEND / "routers/deeds_crud.py")
    body = src[src.index("def supersede_endpoint("):src.index("def lineage_endpoint(")]
    assert "DELETE" not in body.upper()


def test_the_write_is_guarded_in_sql_not_only_in_python():
    """Two concurrent corrections must not both win. The application
    check cannot promise that; the IS NULL predicate can."""
    src = code_only(BACKEND / "routers/deeds_crud.py")
    body = src[src.index("def supersede_endpoint("):src.index("def lineage_endpoint(")]
    assert "superseded_by IS NULL" in body


def test_the_officer_is_told_a_correction_is_a_new_instrument():
    """We record the relationship; we do not un-record documents."""
    src = (BACKEND / "routers/deeds_crud.py").read_text(encoding="utf-8")
    body = src[src.index("def supersede_endpoint("):src.index("def lineage_endpoint(")]
    assert "new instrument" in body
    assert "un-record" in body


# ── The chain stays readable ─────────────────────────────────────────

def test_the_chain_walks_to_the_current_version():
    rows = {1: _deed(id=1, superseded_by=2), 2: _deed(id=2, superseded_by=3),
            3: _deed(id=3)}
    assert walk_chain(rows, 1) == [1, 2, 3]


def test_the_walker_cannot_hang_on_a_cycle():
    """validate_supersession refuses the ways a cycle can be created, but
    a reader that can hang on bad data will hang on data some future
    migration produced."""
    rows = {1: _deed(id=1, superseded_by=2), 2: _deed(id=2, superseded_by=1)}
    assert walk_chain(rows, 1) == [1, 2]


def test_a_superseded_deed_is_still_returned_by_the_lineage_view():
    """The history is the feature, not the embarrassment. Hiding the
    superseded document would recreate in the UI exactly the un-recording
    the data model refuses."""
    src = code_only(BACKEND / "routers/deeds_crud.py")
    body = src[src.index("def lineage_endpoint("):]
    assert "superseded_by IS NOT NULL" not in body, (
        "the lineage view filters out superseded documents — they are the "
        "point of the view"
    )
    assert "chain" in body and "supersedes" in body


# ── Schema ───────────────────────────────────────────────────────────

def test_the_lineage_columns_live_in_the_one_schema_authority():
    src = (BACKEND / "database.py").read_text(encoding="utf-8")
    assert "superseded_by INTEGER REFERENCES deeds(id)" in src
    assert "superseded_at TIMESTAMPTZ" in src
    assert "idx_deeds_superseded_by" in src


def test_deeds_status_vocabulary_was_not_overloaded():
    """The deliberate divergence from document_authenticity's shape,
    pinned so it stays deliberate: `status` keeps draft/completed/deleted
    and the lineage state is derived from the pointer."""
    src = code_only(BACKEND / "database.py")

    # Scoped to the DEEDS statements. document_authenticity legitimately
    # carries status IN ('active','revoked','superseded') — that table's
    # status IS its lineage state, which is exactly the design `deeds`
    # cannot copy, because `deeds.status` already means something else.
    # A pin that cannot tell which table it is talking about would have
    # failed on the correct code.
    deeds_stmts = [ln for ln in src.splitlines()
                   if "deeds" in ln and ("status" in ln or "CHECK" in ln)]
    joined = " ".join(deeds_stmts)
    assert "'superseded'" not in joined, (
        "a 'superseded' status value entered the deeds lifecycle vocabulary "
        "— it is orthogonal to completed, not exclusive with it"
    )

    # And the other table still has its own, unchanged.
    assert "status IN ('active', 'revoked', 'superseded')" in src
