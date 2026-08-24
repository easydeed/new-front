"""PCOR3 — no surface offers a BOE form outside its family.

═══ THE FINDING ═══

The offer was never gated by family AT ALL. Both companion endpoints
tested only `lookup_form(county, code)` — a COUNTY × form registry — so in
Los Angeles every instrument returned `available: True` for both forms.

Both directions, since T-3b: a grant deed was offered a death statement,
and an affidavit of death was offered a PCOR.

Each surface's copy asserted the family it never checked. The PCOR block
says *"Required with this conveyance"*; the 502-D's ask said *"the
affidavit variant on file did not record one"*. **A sentence written to be
unconditionally true is true in the wrong context too.**
"""
from __future__ import annotations

import inspect
from pathlib import Path

import pytest

from services.county_forms import COMPANION_BY_FAMILY, companion_form_code
from services.form_families import FAMILY_BY_DEED_TYPE
from tests.source_text import code_only

BACKEND = Path(__file__).resolve().parents[1]


# ═══ THE PROPERTY, OVER EVERY INSTRUMENT THAT EXISTS ═════════════════

@pytest.mark.parametrize("deed_type", sorted(FAMILY_BY_DEED_TYPE))
def test_every_registered_instrument_gets_at_most_its_own_family_form(deed_type):
    """Swept rather than sampled. Two examples would have passed on the
    broken code too — it returned a form for EVERYTHING."""
    family = FAMILY_BY_DEED_TYPE[deed_type]
    got = companion_form_code(deed_type)
    assert got == COMPANION_BY_FAMILY[family]
    if family == "deed":
        assert got == "BOE-502-A"
    elif family == "affidavit":
        assert got == "BOE-502-D"
    else:
        assert got is None


def test_a_conveyance_is_never_offered_the_death_statement():
    assert companion_form_code("grant-deed") != "BOE-502-D"
    assert companion_form_code("quitclaim-deed") != "BOE-502-D"


def test_an_affidavit_of_death_is_never_offered_the_pcor():
    """THE DIRECTION THAT WENT UNREPORTED LONGEST. The observed defect was
    a 502-D on a grant deed; the mirror was equally live and nobody had
    generated an affidavit to see it."""
    for t in [k for k, v in FAMILY_BY_DEED_TYPE.items() if v == "affidavit"]:
        assert companion_form_code(t) != "BOE-502-A"


def test_a_declaration_is_offered_neither():
    """Recorded on purpose rather than left as a family somebody forgot.
    A homestead declaration is neither a conveyance nor a death
    statement."""
    for t in [k for k, v in FAMILY_BY_DEED_TYPE.items() if v == "declaration"]:
        assert companion_form_code(t) is None


def test_an_unregistered_instrument_gets_NOTHING():
    """FAILS CLOSED, and this is the one the obvious implementation gets
    wrong. `family_of` defaults an unknown type to "deed" and calls that
    "the strictest validation path" — true for validation, where deed
    demands the most fields, and the LOOSEST possible default here, where
    it hands out a legal form.

    **A default's safety is a property of its consumer, not of the
    default.** This gate reads MEMBERSHIP so an instrument nobody
    registered is offered nothing.
    """
    for t in ["", None, "nonsense", "grant-deed-v2", "  "]:
        assert companion_form_code(t) is None


# ═══ EVERY SURFACE ASKS THE ONE AUTHORITY ════════════════════════════

def test_both_offer_surfaces_consult_the_family_gate():
    """The two directions went wrong INDEPENDENTLY, which is what a
    second opinion about which form fits which instrument buys you. Both
    surfaces now ask the same function, and this pin is what makes a
    third surface do the same rather than growing a third opinion.

    PINNED AS THE CALL, NOT THE MENTION. My first version asserted the
    name appears in the file — and it passed with the gate DELETED,
    because the import line survived the deletion and still contained the
    string. Third time this session that a pin was satisfied by a mention
    of the thing it meant to require.

    AND THE FIRST REGEX FOR IT WAS WRONG TOO: `companion_form_code\([^)]*\)`
    stops at the first `)`, which is inside the ARGUMENT
    (`deed.get("deed_type")`), so it never reached the `!=`. Matching a
    call whose argument contains parentheses is not a job for a
    character-class negation. This checks the whole comparison on one
    line instead.
    """
    for rel, code in (("services/pcor_offer.py", "BOE-502-A"),
                      ("routers/deeds_crud.py", "BOE-502-D")):
        src = code_only(BACKEND.joinpath(rel).read_text())
        # The result must be COMPARED, and must gate an unavailable return.
        lines = [ln for ln in src.splitlines()
                 if "companion_form_code(" in ln and f'!= "{code}"' in ln]
        assert lines, f"{rel}: no line compares the gate against {code}"
        assert '"available": False' in src, rel


def test_the_ask_no_longer_asserts_a_document_we_have_not_seen():
    """The copy is half the defect. "the affidavit variant on file did not
    record one" claims an affidavit EXISTS — rendered on a deed with
    neither affidavit nor decedent."""
    from services import boe_form_fill as b
    src = code_only(inspect.getsource(b))
    assert "affidavit variant on file" not in src

    _v, asks = b.values_from_affidavit({})
    dod = [a for a in asks if a.startswith("Date of death")]
    assert dod, "the date-of-death ask must still fire when we hold none"
    assert "on file" not in dod[0]
