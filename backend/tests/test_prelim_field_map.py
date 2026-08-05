"""docs/PRELIM_FIELD_MAP.md describes the code, and keeps describing it.

The map is the named input to open item #1 of the H1 contract (§6.1,
§10.1): structured `prelim_data` from TitleSense must land in the same
slots DeedPro's own parser fills.

A field map that drifts from the parser is worse than none, because the
contract on the other side of the wire is mapped against it. Someone
adding an extraction key without adding it here would leave TitleSense
mapping to a product that no longer exists — and nothing would say so.

So the document's central table is checked against the code it claims to
describe, in both directions.
"""
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

REPO = BACKEND.parent
MAP = REPO / "docs" / "PRELIM_FIELD_MAP.md"
CONTRACT = REPO / "docs" / "integrations" / "H1_CONTRACT.md"


def test_the_map_exists_where_the_contract_names_it():
    """§10.1 names the path explicitly. A contract that points at a file
    that is not there is an open item nobody can close."""
    assert MAP.exists(), "docs/PRELIM_FIELD_MAP.md is the named input to H1 open item #1"


def test_the_contract_is_committed_and_reachable():
    assert CONTRACT.exists()
    assert "PRELIM_FIELD_MAP.md" in CONTRACT.read_text(encoding="utf-8")


def test_every_extraction_key_appears_in_the_map():
    """The direction that catches an ADDED field: a new extraction slot
    that TitleSense would never learn about."""
    from services.prelim_import import FIELD_LABELS
    text = MAP.read_text(encoding="utf-8")
    missing = [k for k in FIELD_LABELS if f"`{k}`" not in text]
    assert missing == [], f"extraction keys absent from the field map: {missing}"


def test_the_map_invents_no_slots_the_parser_does_not_fill():
    """The direction that catches a REMOVED field: the contract would go
    on mapping into a slot nothing fills."""
    from services.prelim_import import FIELD_LABELS
    text = MAP.read_text(encoding="utf-8")
    table = text[text.index("## 1. The slots"):text.index("## 2. Amber semantics")]

    # Column 2 specifically — the EXTRACTION KEY. A naive "any backticked
    # snake_case cell" match also scoops column 5 (the save-contract
    # field, e.g. `current_owner`) and reports a correct document as
    # wrong. Row-wise parsing, not a pattern over the whole table.
    claimed = set()
    for line in table.splitlines():
        if not line.startswith("| ") or line.startswith("|---"):
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) < 2 or not cells[0].isdigit():
            continue
        key = cells[1].strip("`")
        claimed.add(key)

    assert claimed, "no rows parsed out of the slots table"
    unknown = claimed - set(FIELD_LABELS)
    assert unknown == set(), f"the map claims slots the parser does not fill: {unknown}"
    assert claimed == set(FIELD_LABELS), (
        f"map rows and parser keys disagree: "
        f"map-only={claimed - set(FIELD_LABELS)} parser-only={set(FIELD_LABELS) - claimed}")


def test_the_labels_match():
    from services.prelim_import import FIELD_LABELS
    text = MAP.read_text(encoding="utf-8")
    for key, label in FIELD_LABELS.items():
        assert label in text, f"label for {key} ({label!r}) not in the map"


def test_the_mixed_content_slot_is_flagged_and_cited():
    """Row 3 is the one whose content is mixed, and the map must say so
    against the section that legislates it — not in its own words."""
    text = MAP.read_text(encoding="utf-8")
    assert "vested_owner" in text
    assert "mixed_content" in text
    assert "2.2" in text, "the mixed-content rule must cite H1 §2.2"


def test_the_map_records_row_3_as_split_and_names_the_code_that_splits_it():
    """Doctrine A resolved row 3. The map's job is now to describe the
    resolution accurately enough that §10.1's mapping can be written
    against it — three slots, not one, and a named module per side."""
    text = MAP.read_text(encoding="utf-8")
    section = text[text.index("## 3."):text.index("## 4.")]

    for slot in ("vested_owner.parties",
                 "vested_owner.vesting_characterization",
                 "vested_owner.verbatim"):
        assert slot in section, slot

    # The modules, by path, on both sides of the language boundary.
    assert "backend/services/vesting_split.py" in section
    assert "frontend/src/lib/vestingSplit.ts" in section
    assert "vesting_cases.json" in section, \
        "the shared corpus is what stops the two from drifting"

    # And the two statements that are easy to lose and expensive to lose:
    # the refusal, and which question the characterization answers.
    assert "needs_review" in section
    assert "MARY ROE" in section, "the unsplittable case is named, not implied"
    assert "TODAY" in section


def test_the_split_slots_are_what_the_code_actually_produces():
    """The map is checked against the parser in §1; row 3's three slots
    must be checked too, or the one row that changed is the one row
    nobody is verifying."""
    from services.vesting_split import as_candidates

    payload = as_candidates(
        "JOHN A. DOE AND JANE B. DOE, HUSBAND AND WIFE AS JOINT TENANTS",
        "prelim")
    assert payload["owner"]["status"] == "candidate"
    assert payload["vesting_proposal"]["status"] == "proposed"
    assert payload["mixed_content"] is True
    assert payload["verbatim"]

    text = MAP.read_text(encoding="utf-8")
    assert "'proposed'" in text or "`proposed`" in text or "proposed" in text


def test_the_map_names_what_is_NOT_extracted():
    """§6.1 lists prelim_data facts DeedPro has no slot for. Silence
    there would let the mapping assume slots that do not exist."""
    text = MAP.read_text(encoding="utf-8")
    section = text[text.index("## 4. What T-6 does NOT extract"):]
    for absent in ["exception", "recording reference", "effective date", "order number"]:
        assert absent.lower() in section.lower(), absent


def test_the_map_records_the_templates_as_unverified():
    """Bears on §6.1's 'demoted to fallback': the fallback is weaker than
    its structure suggests."""
    from services.prelim_import import TEMPLATES
    text = MAP.read_text(encoding="utf-8")
    assert "UNVERIFIED" in text
    for t in TEMPLATES:
        assert t.underwriter.split()[0] in text, t.underwriter


def test_the_refusal_semantics_are_recorded():
    """A structured finding must not be able to produce a state the
    parser refuses to produce."""
    from services.prelim_import import MIN_TEXT_CHARS
    text = MAP.read_text(encoding="utf-8")
    assert str(MIN_TEXT_CHARS) in text
    assert "PrelimUnreadable" in text


def test_the_source_label_matches_the_enum():
    """`prelim`, not `ai_suggested` — mislabelling would smuggle in an
    LLM ruling nobody has made."""
    text = MAP.read_text(encoding="utf-8")
    assert "'prelim'" in text
    builder = (REPO / "frontend" / "src" / "types" / "builder.ts").read_text(encoding="utf-8")
    assert "'prelim'" in builder
