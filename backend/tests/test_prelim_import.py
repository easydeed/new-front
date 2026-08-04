"""T-6 — the prelim import, and the refusal that makes it honest.

THE WATCH-POINT is `test_a_scanned_prelim_is_refused_loudly`. Everything
else is ordinary coverage.

A prelim arrives one of two ways: digitally generated with a real text
layer, or SCANNED — a photograph of paper with no extractable text. Both
open fine in a viewer and look identical to a human.

A naive extractor handed the scanned one finds nothing, returns nothing,
and reports success. The officer reads that as "this prelim had nothing
useful in it" rather than "we cannot read this file" — the silent-zero
disease wearing a new costume, an empty result presented as an answer.
"""
import io

import pytest

pytest.importorskip("pdfplumber")
from pypdf import PdfWriter  # noqa: E402

from services.prelim_import import (  # noqa: E402
    FIELD_LABELS, GENERIC, MIN_TEXT_CHARS, PrelimUnreadable,
    extract_fields, import_prelim, pick_template, read_text_or_refuse,
)

PRELIM_TEXT = """
FIRST AMERICAN TITLE INSURANCE COMPANY
PRELIMINARY REPORT

Order No. 8827341-LA                    Dated as of August 1, 2026

The form of policy of title insurance contemplated by this report is:
CLTA Standard Coverage Policy.

Title to said estate or interest at the date hereof is vested in:
MARIA L. TORRES, a married woman as her sole and separate property

The estate or interest in the land hereinafter described or referred to
covered by this report is: A Fee.

Property Address: 1420 OCEAN AVE, SANTA MONICA, CA 90401

A.P.N.: 4291-013-027

LEGAL DESCRIPTION
Real property in the City of Santa Monica, County of Los Angeles, State
of California, described as follows: LOT 7 OF TRACT NO. 9021, IN THE
CITY OF SANTA MONICA, AS PER MAP RECORDED IN BOOK 128 PAGES 44 AND 45
OF MAPS, IN THE OFFICE OF THE COUNTY RECORDER OF SAID COUNTY.

AT THE DATE HEREOF EXCEPTIONS TO COVERAGE IN ADDITION TO THE PRINTED
EXCEPTIONS AND EXCLUSIONS CONTAINED IN SAID POLICY WOULD BE AS FOLLOWS:
1. General and special taxes and assessments for the fiscal year 2026-2027.
"""


def _text_pdf(body: str) -> bytes:
    """A PDF with a real text layer, built through the engine this
    product already ships (WeasyPrint) rather than a new dependency."""
    from pdf_engine import render_pdf
    esc = body.replace("&", "&amp;").replace("<", "&lt;")
    return render_pdf(
        f"<html><body><pre style='font-size:9pt'>{esc}</pre></body></html>")


def _scanned_pdf() -> bytes:
    """A PDF with NO text layer — pages that carry no extractable text,
    which is what a scan of paper produces."""
    w = PdfWriter()
    for _ in range(3):
        w.add_blank_page(width=612, height=792)
    out = io.BytesIO()
    w.write(out)
    return out.getvalue()


# ── THE WATCH-POINT ──────────────────────────────────────────────────

def test_a_scanned_prelim_is_refused_loudly():
    """No text layer means no extraction, and the officer is TOLD."""
    with pytest.raises(PrelimUnreadable) as e:
        import_prelim(_scanned_pdf())
    msg = str(e.value)
    assert "scanned" in msg.lower(), "the refusal must name the cause"
    assert "nothing was extracted" in msg.lower(), (
        "the refusal must say plainly that nothing came through — an "
        "officer who thinks we read the file and found little is worse off "
        "than one who knows we read nothing"
    )
    # And it tells her what to do next.
    assert "manually" in msg.lower() or "digital" in msg.lower()


def test_a_scanned_prelim_never_returns_an_empty_success():
    """The specific shape of the bug: succeeding with nothing."""
    try:
        result = import_prelim(_scanned_pdf())
    except PrelimUnreadable:
        return  # correct
    pytest.fail(
        f"a scanned prelim returned a result instead of refusing: {result!r}")


def test_a_readable_but_unparseable_pdf_is_also_a_refusal():
    """A document we CAN read but do not recognise is a different
    failure with the same rule: an empty candidate list rendered as a
    result would tell the officer her prelim was empty."""
    unrelated = _text_pdf("MINUTES OF THE BOARD MEETING\n" + ("lorem ipsum " * 200))
    with pytest.raises(PrelimUnreadable) as e:
        import_prelim(unrelated)
    assert "nothing was extracted" in str(e.value).lower()


def test_the_threshold_is_not_a_bare_zero():
    """Scanned PDFs often yield a few stray characters from a fax banner
    or header stamp rather than a clean zero. A `== 0` check would let
    exactly the documents this guard exists for slip through."""
    assert MIN_TEXT_CHARS > 0
    nearly_empty = _text_pdf("SCANNED BY FAX 08/01/2026")
    with pytest.raises(PrelimUnreadable):
        read_text_or_refuse(nearly_empty)


# ── Extraction ───────────────────────────────────────────────────────

def test_the_five_fields_come_out_of_a_real_shaped_prelim():
    result = import_prelim(_text_pdf(PRELIM_TEXT))
    by_key = {c["key"]: c["value"] for c in result["candidates"]}
    assert by_key["apn"] == "4291-013-027"
    assert "MARIA L. TORRES" in by_key["vested_owner"]
    assert "LOT 7 OF TRACT NO. 9021" in by_key["legal_description"]
    assert by_key["county"] == "Los Angeles"
    assert "1420 OCEAN AVE" in by_key["property_address"]


def test_the_underwriter_is_identified():
    assert import_prelim(_text_pdf(PRELIM_TEXT))["underwriter"] == "First American Title"


def test_an_unknown_underwriter_falls_back_to_generic():
    text = PRELIM_TEXT.replace("FIRST AMERICAN TITLE INSURANCE COMPANY",
                               "SOME REGIONAL TITLE CO")
    result = import_prelim(_text_pdf(text))
    assert result["underwriter"] == "unknown"
    # And still extracts, because the generic patterns are the real ones.
    assert any(c["key"] == "apn" for c in result["candidates"])


def test_fields_we_could_not_find_are_named():
    """Absence stated, not implied. The officer sees which fields she
    still has to type rather than wondering what she is missing."""
    text = PRELIM_TEXT.replace("A.P.N.: 4291-013-027", "")
    result = import_prelim(_text_pdf(text))
    assert "APN" in result["not_found"]
    assert not any(c["key"] == "apn" for c in result["candidates"])


# ── Everything arrives amber, through the untouched gate ─────────────

def test_every_extracted_value_is_a_candidate():
    """Nothing from a machine arrives confirmed. This is the entire
    reason the extraction is allowed to be imperfect."""
    for c in import_prelim(_text_pdf(PRELIM_TEXT))["candidates"]:
        assert c["status"] == "candidate", f"{c['key']} arrived pre-confirmed"
        assert c["source"] == "prelim"


def test_nothing_claims_to_be_ai_suggested():
    """`ai_suggested` exists as a source and is deliberately unused here.
    A deterministic label match is not a suggestion, and mislabelling it
    would smuggle the LLM ruling that has not been made."""
    for c in import_prelim(_text_pdf(PRELIM_TEXT))["candidates"]:
        assert c["source"] != "ai_suggested"


def test_no_llm_in_the_extraction_path():
    from pathlib import Path
    from tests.source_text import code_only

    src = code_only(Path(__file__).resolve().parents[1] / "services/prelim_import.py")
    for banned in ("openai", "anthropic", "claude", "gpt", "completion("):
        assert banned not in src.lower(), f"an LLM call entered the v1 path: {banned}"


def test_the_result_tells_the_officer_to_check_it():
    assert "not yet confirmed" in import_prelim(_text_pdf(PRELIM_TEXT))["note"]


# ── Scope ────────────────────────────────────────────────────────────

def test_exactly_the_ruled_field_set():
    """3-5 fields by ruling. Scope creep here is how a narrow v1 becomes
    a parser nobody can verify."""
    assert set(FIELD_LABELS) == {
        "apn", "legal_description", "vested_owner", "county", "property_address"}
    assert set(GENERIC.patterns) == set(FIELD_LABELS)


def test_templates_are_marked_unverified():
    """They are hypotheses about each underwriter's layout, seeded from
    label conventions rather than from real reports. A template matching
    the wrong line is worse than no template — it produces a confident
    candidate instead of an absence."""
    from pathlib import Path
    src = (Path(__file__).resolve().parents[1] / "services/prelim_import.py").read_text()
    assert "UNVERIFIED" in src
    assert "TEMPLATE PROVENANCE" in src
