"""REQUIRED1 — one definition of "required", read by both languages.

═══ THREE DEFINITIONS, AND THE LOOSEST ONE WAS THE FRONT DOOR ═══

    deeds_crud.py     grantor, grantee, legal description
    partner API       + transfer_tax (a required model field), vesting per type
    the browser gate  + vesting AND a transfer-tax decision, family-aware

`POST /deeds` accepted an instrument the wizard refuses to generate and
the partner API rejects. The wizard's gate runs in the BROWSER, so the
protection was a property of the client rather than of the product:
anything reaching the endpoint another way — a script, a retry, an
integration — skipped both legal decisions.

Owner ruling: the stricter set wins.

═══ WHY A JSON CORPUS AND NOT A SHARED MODULE ═══

The two readers are in different languages. `vesting_split` faced this
first and the answer was a corpus both sides read and both suites test
against — because a rule implemented twice drifts, and a rule declared
once and read twice cannot.
"""
import json
from pathlib import Path

import pytest

from services import required_fields as rf
from services.form_families import (FAMILY_BY_DEED_TYPE, PROPERTYLESS_TYPES,
                                    family_of)
from tests.source_text import code_only, function_source

BACKEND = Path(__file__).resolve().parents[1]
CORPUS = json.loads((BACKEND / "services" / "required_fields.json")
                    .read_text(encoding="utf-8"))


# ── The corpus is the authority, and nothing shadows it ──────────────

def test_both_readers_read_the_same_file():
    """THE PIN THIS FILE EXISTS FOR (first half). A reader that inlines
    the rules is a second definition wearing a reader's name."""
    py = code_only((BACKEND / "services" / "required_fields.py")
                   .read_text(encoding="utf-8"))
    assert 'CORPUS = Path(__file__).with_name("required_fields.json")' in py

    ts = (BACKEND.parent / "frontend" / "src" / "lib" / "requiredFields.ts") \
        .read_text(encoding="utf-8")
    assert "backend/services/required_fields.json" in ts


def test_the_family_vocabulary_is_not_a_fourth_one():
    """Family keys must be the families this codebase already has. A
    corpus inventing 'conveyance' beside the existing 'deed' would be the
    exact disease it was written to cure."""
    families = set(CORPUS["families"])
    assert families <= set(FAMILY_BY_DEED_TYPE.values()), (
        f"corpus families not in form_families: "
        f"{families - set(FAMILY_BY_DEED_TYPE.values())}")


def test_the_propertyless_types_agree_with_form_families():
    """`no_legal_description` and `PROPERTYLESS_TYPES` answer one
    question. Two answers is how a deed renders a blank legal description
    on one path and refuses on another."""
    flagged = {t for t, f in CORPUS["types"].items()
               if t != "_doc" and f.get("no_legal_description")}
    assert flagged == set(PROPERTYLESS_TYPES), (
        f"corpus says {sorted(flagged)}, form_families says "
        f"{sorted(PROPERTYLESS_TYPES)}")


def test_the_fixed_vesting_types_agree_with_the_partner_api():
    """The partner API has read `api_catalog.TYPE_REQUIREMENTS` since A2.
    The corpus must not disagree with it about which instruments fix
    their own vesting — that is a legal fact about the form, and two
    answers means one endpoint demands a value another refuses."""
    from services.api_catalog import TYPE_REQUIREMENTS, api_type

    corpus_fixed = {t for t, f in CORPUS["types"].items()
                    if t != "_doc" and f.get("fixed_vesting")}
    api_fixed = {t for t, r in TYPE_REQUIREMENTS.items() if r.fixed_vesting}
    # The partner API speaks underscored slugs; the chassis speaks dashes.
    assert {api_type(t) for t in corpus_fixed} >= api_fixed, (
        f"the partner API fixes vesting for {sorted(api_fixed)}; the corpus "
        f"fixes {sorted(api_type(t) for t in corpus_fixed)}")


# ── What it answers ──────────────────────────────────────────────────

def test_a_conveyance_requires_both_legal_decisions():
    """The whole ruling, in one assertion."""
    ids = {r.id for r in rf.requirements("deed", "grant-deed")}
    assert "vesting_stated" in ids
    assert "dtt_decided" in ids


def test_a_fixed_vesting_form_is_not_asked_for_one():
    """Flag-3: the form's title IS the vesting decision and its template
    never reads a stored value, so requiring one would demand a field the
    instrument has nowhere to put."""
    for deed_type in ("grant-deed-jt", "grant-deed-cp-ros"):
        ids = {r.id for r in rf.requirements("deed", deed_type)}
        assert "vesting_stated" not in ids, deed_type
        # And the transfer tax is still required — the exemption is a
        # separate decision from the vesting.
        assert "dtt_decided" in ids, deed_type


def test_a_property_less_instrument_is_not_asked_for_a_legal_description():
    ids = {r.id for r in rf.requirements("declaration", "trust-certification")}
    assert "legal_description_present" not in ids
    assert "named_party_present" in ids


@pytest.mark.parametrize("value,answered", [
    ({"isExempt": True}, True),                     # exempt IS a decision
    ({"basis": "full_value"}, True),                # so is full value
    ({"transfer_value": "500000"}, True),
    ({}, False),
    (None, False),
])
def test_a_declared_exemption_counts_as_a_decision(value, answered):
    """§1 from the other side. Never inferring the choice includes never
    FORGETTING it: `isExempt: true` is falsy in none of its fields except
    the ones that matter, and re-asking would be the product losing an
    answer she gave."""
    assert rf._present("dtt", value) is answered


def test_a_declaration_names_its_party_in_parties():
    assert rf._present("parties", {"declarant": "JANE ROE"}) is True
    assert rf._present("parties", {"declarant": "   "}) is False
    assert rf._present("parties", {}) is False


# ── The endpoint that was loose ──────────────────────────────────────

def test_the_create_endpoint_reads_the_corpus():
    """THE PIN THIS FILE EXISTS FOR (second half). Not "the endpoint
    validates" — it always did. That it reads the SHARED list is the
    thing that makes a fourth definition impossible to add by editing one
    side."""
    src = code_only(function_source(
        BACKEND / "routers" / "deeds_crud.py", "create_deed_endpoint"))
    assert "from services.required_fields import missing as missing_required" in src
    assert "family_of(deed_data.get('deed_type'))" in src


def test_the_refusal_names_what_is_missing_and_why():
    """Invariant #4. "Validation failed" tells an integrator nothing; the
    doctrine reason tells them this is deliberate rather than a bug."""
    src = code_only(function_source(
        BACKEND / "routers" / "deeds_crud.py", "create_deed_endpoint"))
    assert "r.label for r in decisions" in src
    assert "neither is inferred" in src
