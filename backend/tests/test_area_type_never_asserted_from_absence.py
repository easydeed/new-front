"""No writer may produce an area type from the ABSENCE of information.

═══ WHY THIS FILE EXISTS ═══

The deed's transfer-tax declaration asks which of two boxes to check:
"Unincorporated area" or "City of ____". For most of this product's
life the API answered it from whether the city levied its own DTT — so
Glendale, Pasadena, Long Beach and 32 other incorporated cities that
levy none printed a CHECKED "Unincorporated area" on a recordable
instrument.

**The rule against that already existed, one directory away.** T-2 wrote
it into `services/jurisdictions.py` — incorporation and taxation are
independent facts, absence of knowledge must not render as a fact — and
`is_incorporated()` has carried a docstring naming the Glendale
conflation ever since. The API path was built from the tax rate anyway.

One ruling, five writers, one obeying. That is §14.7 at its most
expensive: not a rule nobody knew, a rule nobody re-read while building
the next surface. A prose rule cannot stop the sixth writer. This can.
"""
from __future__ import annotations

import re
from pathlib import Path

import pytest

from services.jurisdictions import (
    AREA_TYPE_CITY, AREA_TYPE_UNINCORPORATED, AREA_TYPE_UNKNOWN, AREA_TYPES,
    area_type_for,
)
from tests.source_text import code_only

BACKEND = Path(__file__).resolve().parents[1]
FRONTEND = BACKEND.parent / "frontend"
TEMPLATES = BACKEND.parent / "templates"


# ═══ THE VALUE ═══════════════════════════════════════════════════════

def test_unknown_is_a_value_rather_than_a_default():
    """A two-valued field forced every unresolvable place to become one
    of the two. Whichever we picked, we stated something nobody
    established."""
    assert AREA_TYPES == {AREA_TYPE_CITY, AREA_TYPE_UNINCORPORATED,
                          AREA_TYPE_UNKNOWN}


@pytest.mark.parametrize("city,expected", [
    ("Glendale", AREA_TYPE_CITY),            # incorporated, levies no DTT
    ("Long Beach", AREA_TYPE_CITY),          # the one T-2 named
    ("Pasadena", AREA_TYPE_CITY),
    ("East Los Angeles", AREA_TYPE_UNINCORPORATED),   # affirmatively not
    ("Glendora", AREA_TYPE_UNKNOWN),         # not in the registry
    ("Nowheresville", AREA_TYPE_UNKNOWN),
    ("", AREA_TYPE_UNKNOWN),
    (None, AREA_TYPE_UNKNOWN),
])
def test_the_place_decides_it_never_the_tax_rate(city, expected):
    assert area_type_for(city) == expected


def test_a_city_that_levies_no_dtt_is_still_a_city():
    """THE DEFECT, stated as a property rather than a list. Every
    incorporated place in the registry resolves to `city`, whatever its
    rate — which is what the old `if tt.city_tax` could not do."""
    from services.jurisdictions import PLACES
    incorporated = [p for p in PLACES if p.incorporated]
    no_own_dtt = [p for p in incorporated if not p.dtt_rate_per_1000]
    assert len(no_own_dtt) >= 20, "the registry stopped exercising this"
    for place in no_own_dtt:
        assert area_type_for(place.city) == AREA_TYPE_CITY, place.city


# ═══ THE WRITERS ═════════════════════════════════════════════════════
#
# Five of them, named. A sixth added without the rule fails here.

def test_no_backend_writer_defaults_the_area_type():
    """`or "unincorporated"` and `if city_tax else "unincorporated"` are
    the two shapes this had. Both are an assertion wearing a fallback's
    clothes."""
    for rel in ("routers/api_v1/router.py", "services/deed_pdf.py"):
        code = code_only(BACKEND / rel)
        assert 'or "unincorporated"' not in code, rel
        assert "'unincorporated'" not in code or "area_type" not in code, rel
        assert 'else "unincorporated"' not in code, rel


def test_the_api_path_reads_the_place():
    code = code_only(BACKEND / "routers/api_v1/router.py")
    assert "area_type_for(deed_request.property.city)" in code
    assert '"city" if tt.city_tax' not in code


def test_the_chassis_default_is_unknown_not_an_assertion():
    code = code_only(BACKEND / "services/deed_pdf.py")
    assert 'raw.get("area_type") or AREA_TYPE_UNKNOWN' in code


@pytest.mark.parametrize("rel,forbidden", [
    ("src/lib/deedPayload.ts", "areaType || 'unincorporated'"),
    ("src/lib/deedResume.ts", "? 'city' : 'unincorporated'"),
])
def test_no_frontend_writer_defaults_the_area_type(rel, forbidden):
    """`deedResume` was the fifth writer and was found while wiring the
    other four: `=== 'city' ? 'city' : 'unincorporated'` mapped a stored
    `unknown` onto an assertion on the way back in."""
    src = (FRONTEND / rel).read_text(encoding="utf-8")
    assert forbidden not in src, f"{rel} still asserts from absence"
    assert "'unknown'" in src, f"{rel} cannot express the third state"


def test_the_prefill_asserts_neither_direction_for_an_unknown_place():
    """T-2 stopped it defaulting to `unincorporated` and left it
    returning `city` — the same move pointed the other way."""
    src = (FRONTEND / "src/services/propertyPrefill.ts").read_text(encoding="utf-8")
    fn = src[src.index("export function inferDTTAreaType"):]
    fn = fn[:fn.index("\n}")]
    assert 'return "unknown"' in fn
    assert 'incorporated ? "city" : "unincorporated"' in fn


def test_the_builder_type_can_express_neither():
    """The type was the obstacle across most of the surface: the seven
    independent-check templates already rendered `unknown` correctly and
    could not be reached because nothing could produce the value."""
    src = (FRONTEND / "src/types/builder.ts").read_text(encoding="utf-8")
    assert "areaType: 'city' | 'unincorporated' | 'unknown';" in src


# ═══ THE SURFACE ═════════════════════════════════════════════════════

def _dtt_line(name: str, area_type: str) -> str:
    from jinja2 import Environment, FileSystemLoader, select_autoescape
    env = Environment(loader=FileSystemLoader(str(TEMPLATES)),
                      autoescape=select_autoescape(["html", "jinja2"]))
    env.filters["hyphenate_soft"] = lambda s: s
    out = env.get_template(f"{name}/index.jinja2").render(
        page={"margins": {"top": "1in", "right": "1in",
                          "bottom": "1in", "left": "1in"}},
        dtt={"area_type": area_type, "city_name": "Glendale",
             "calculated_amount": "825.00", "amount": "825.00",
             "basis": "full_value", "is_exempt": False},
        grantors_text="A", grantees_text="B", county="Los Angeles",
        legal_description="L", apn="1", execution_date="X",
        # The pixel template's own knobs. Supplied so this pin fails on
        # the BOX rather than on an unrelated undefined.
        exhibit_threshold=600, requested_by="R", return_to={},
        title_order_no="", escrow_no="")
    # THE ENCLOSING BLOCK, and getting here took two wrong shapes —
    # both of which are the failure this file is otherwise about.
    #
    #  1. A 320-character window before the marker caught the ☑ from the
    #     BASIS checkboxes ("Computed on full value…") directly above
    #     it, so every template looked like it checked a box.
    #  2. Splitting the tag-stripped text into LINES divorced the mark
    #     from its label: seven of the eight put the checkmark in its
    #     own `<span class="checkline">` on a separate source line, so
    #     the affirmative case looked like it printed nothing.
    #
    # The declaration is a DIV. Take the div, then strip.
    at = out.index("Unincorporated area")
    start = out.rindex("<div", 0, at)
    end = out.index("</div>", at) + len("</div>")
    return " ".join(re.sub(r"<[^>]+>", " ", out[start:end]).split())


LIVE_INSTRUMENTS = [
    "grant_deed_ca", "grant_deed_corp_ca", "grant_deed_jt_ca",
    "grant_deed_cp_ros_ca", "grant_deed_partnership_ca",
    "quitclaim_deed_ca", "warranty_deed_ca", "grant_deed_ca_pixel",
]


@pytest.mark.parametrize("name", LIVE_INSTRUMENTS)
def test_every_live_instrument_checks_NEITHER_box_when_unknown(name):
    """RENDERED, not read. `grant_deed_ca_pixel` had a binary `else`, so
    one box was always checked and NO DATA VALUE could make it abstain —
    it had been asserting on every deed through `routers/deeds.py`,
    independent of the API path."""
    line = _dtt_line(name, AREA_TYPE_UNKNOWN)
    assert line, f"{name} lost the declaration entirely"
    assert "☑" not in line, f"{name} checks a box it was not told: {line!r}"
    assert " X " not in line, f"{name} checks a box it was not told: {line!r}"


@pytest.mark.parametrize("name", LIVE_INSTRUMENTS)
def test_an_affirmative_answer_still_prints(name):
    """The abstention must not have been bought by breaking the yes."""
    line = _dtt_line(name, AREA_TYPE_UNINCORPORATED)
    assert line, f"{name} lost the declaration entirely"
    assert ("☑" in line) or ("X" in line), f"{name} prints nothing: {line!r}"
