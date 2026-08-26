"""DEED-POLISH #2 — the two officer-entered facts on the DTT line carry weight.

═══ WHAT THIS PINS ═══

The documentary transfer tax declaration is a statement made under penalty
of perjury, and two of its values are typed by the officer rather than
derived: the AMOUNT and the CITY. Everything else on those lines is
statutory boilerplate or a checkbox. Bold is what separates the two facts a
reader checks from the sentence that frames them — the same argument D2
made for the APN ("the parcel id carries the same weight as the parties").

═══ WHY BOTH A CSS PIN AND A RENDERED-PDF PIN ═══

`test_apn_bold_in_every_chassis` reads the CSS. That is the right sweep for
coverage — it names the deed type that lost the rule — but **CSS presence is
not glyph weight**: a later `.dtt-lead span { font-weight: normal }`, an
inline style, or a specificity change would leave the pinned declaration
sitting in the file while the PDF prints regular. So the weight is also
asserted where it actually matters, on the fontname pdfplumber reads out of
the rendered document.

The probe that justifies the second half: with the CSS reverted, the amount
and city render `Liberation-Serif`; with it, `Liberation-Serif-Bold`. The
CSS pin and the PDF pin fail together today and would come apart under
exactly the override above — which is the case worth owning.
"""
from __future__ import annotations

import io

import pdfplumber
import pytest

from services.deed_pdf import TEMPLATE_BY_DEED_TYPE, render_deed_html, render_deed_pdf
from tests.test_deed_pdf import minimal_row

DTT_META = {"dtt": {"calculated_amount": "550.00", "basis": "full",
                    "area_type": "city", "city_name": "Glendale"}}

# ═══ THE CORPUS, DERIVED — AND ITS FLOOR ═════════════════════════════
#
# Derived from what actually renders a DTT declaration rather than from a
# hand-kept list, so a deed type added to TEMPLATE_BY_DEED_TYPE is swept
# without anyone remembering to add it here.
#
# AND THE FLOOR, because a derived corpus can go to zero: if the class
# names were renamed, every `@parametrize` below would generate ZERO cases
# and this file would report PASSING while asserting nothing about the
# world (§14.18 — a check that never runs looks exactly like a check that
# passed). The floor is what makes the rename fail loudly instead.
#
# NOT every instrument belongs here, and that is deliberate rather than an
# oversight: an interspousal transfer renders a FIXED statutory exemption
# (R&T §11927) with no amount and no city to weight, and the tax deed
# carries no transfer-tax declaration at all. Neither has a value the
# officer types on this line, so neither is in the corpus. Both are
# reported to the owner rather than quietly added.
DTT_TEMPLATES = sorted({
    t for t in TEMPLATE_BY_DEED_TYPE
    if "dtt-amount" in render_deed_html(minimal_row(deed_type=t, metadata=DTT_META))
})

MIN_DTT_TEMPLATES = 7


def test_the_swept_corpus_is_not_empty():
    assert len(DTT_TEMPLATES) >= MIN_DTT_TEMPLATES, (
        f"only {len(DTT_TEMPLATES)} deed types render a DTT declaration line; "
        f"the sweeps below are parametrized over this set and assert NOTHING "
        f"if it shrinks. Lower MIN_DTT_TEMPLATES deliberately if a template "
        f"legitimately stopped carrying the line.")


@pytest.mark.parametrize("deed_type", DTT_TEMPLATES)
@pytest.mark.parametrize("cls", (".dtt-amount", ".city-field"))
def test_the_dtt_values_are_declared_bold_in_every_chassis(deed_type, cls):
    """The coverage half — it names the deed type that lost the rule."""
    html = render_deed_html(minimal_row(deed_type=deed_type, metadata=DTT_META))
    assert cls in html, (deed_type, cls)
    block = html[html.index(cls):]
    block = block[: block.index("}")]
    assert "font-weight: bold" in block, (deed_type, cls)


def test_the_amount_and_city_print_bold_in_the_rendered_pdf():
    """The half that survives a CSS override, asserted on the glyphs.

    Pinned against the FONTNAME rather than the stylesheet, because the
    question a reader of the recorded instrument asks is what weight the
    ink is, and only this assertion answers it.
    """
    pdf = render_deed_pdf(minimal_row(metadata=DTT_META))
    with pdfplumber.open(io.BytesIO(pdf)) as doc:
        words = doc.pages[0].extract_words(extra_attrs=["fontname"])

    for needle in ("550.00", "Glendale"):
        hits = [w for w in words if needle in w["text"]]
        assert hits, f"{needle} did not render at all"
        for w in hits:
            assert "Bold" in w["fontname"], (
                f"{needle} rendered {w['fontname']} — the CSS declaration can "
                f"be present and still lose to an override; this is the pin "
                f"that notices.")


def test_bolding_changed_weight_and_nothing_else():
    """A cosmetic change must stay cosmetic: the same values render, in the
    same places, with only the weight different.

    ═══ WHAT THIS TEST IS NOT ═══

    It does NOT assert that an unincorporated parcel leaves the city blank.
    Writing it that way is what found the defect below, and the assertion
    FAILS today — so it is reported to the owner and held for a ruling
    rather than either weakened into a pin that certifies the defect
    (§14.12: a removed claim must read as a NO) or left red in CI on a
    question nobody has ruled.

    THE DEFECT, recorded here because this is where it was found: the
    checkbox is gated on `area_type == 'city'` but the city NAME beside it
    is printed unconditionally. `TransferTaxSection.tsx:345` selects
    unincorporated with `manual({ ...value, areaType: "unincorporated" })`
    — spreading the previous state WITHOUT clearing `cityName`, which
    line 80 auto-populated from the property. So a parcel in an
    unincorporated pocket prints an unchecked box beside a city name, and
    the preview does not show it (the preview gates the value on
    `areaType === 'city'`, the template does not). Bolding makes a wrong
    value bold; it does not create it.
    """
    html = render_deed_html(minimal_row(metadata=DTT_META))
    # The declared amount renders ONCE, exactly as given, with a single
    # dollar sign. Bold is a weight, not a transform: it must not reformat,
    # duplicate, or re-render the value it is applied to.
    assert html.count("550.00") == 1
    assert html.count("$550.00") == 1
    assert html.count("Glendale") == 1
