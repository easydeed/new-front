"""T-6 — reading a preliminary title report, and knowing when we can't.

═══ THE HONESTY OF THIS FEATURE IS THE REFUSAL ═══

A prelim arrives one of two ways. Some are generated digitally and carry
a real text layer. Many are SCANNED — a photograph of paper, wrapped in a
PDF, with no extractable text at all.

Both open fine in a viewer. They look identical to a human. And a naive
extractor handed the scanned one finds nothing, returns nothing, and
reports success — which the officer reads as "this prelim had nothing
useful in it" rather than "we cannot read this file."

That is the whole failure mode, and it is the silent-zero disease in a
new costume: an empty result presented as an answer. So the first thing
this module does is ask whether there is a text layer at all, and refuse
LOUDLY when there is not, naming the reason and what to do about it.

═══ DETERMINISTIC ONLY, BY RULING ═══

No LLM in v1. Every value below comes from a labelled pattern in the
document — "APN:", "Legal Description:", "Title to said estate is vested
in:". If a pattern does not match, the field is absent and the officer
types it. Nothing is inferred, nothing is guessed, and nothing arrives
already confirmed.

`ai_suggested` exists as a FieldSource and is deliberately NOT used here.
The machinery is ready for it; the ruling that would authorise it has not
been made.

═══ EVERYTHING ARRIVES AMBER ═══

Extracted values are CANDIDATES. They flow through the existing
confirmation gate untouched — the same gate, the same stamp, the same
`confirmedAt` per field. This module adds a source; it does not add a
lane, and it emphatically does not add a way to reach the deed without
the officer's eyes.

═══ TEMPLATE PROVENANCE — READ BEFORE TRUSTING ═══

The per-underwriter patterns below are seeded from the LABEL CONVENTIONS
these companies use, not from a corpus of their real reports. They are
hypotheses. Each one needs verification against actual prelims from that
underwriter before it can be called supported, and the generic template
is what runs until then.

That is stated here rather than discovered later: a template that matches
the wrong line is worse than no template, because it produces a confident
candidate instead of an absence.
"""
import io
import re
from typing import Any, Dict, List, NamedTuple, Optional


class PrelimUnreadable(Exception):
    """No text layer. The loud refusal — never a quiet empty result."""


class Field(NamedTuple):
    key: str
    value: str
    label: str


class Template(NamedTuple):
    underwriter: str
    """A string that identifies whose report this is. Matched
    case-insensitively against the first page."""
    signature: str
    patterns: Dict[str, str]


# The five fields worth extracting — the ones an officer retypes from a
# prelim every time. Anything beyond these is scope the ruling excluded.
FIELD_LABELS = {
    "apn": "APN",
    "legal_description": "Legal description",
    "vested_owner": "Vested owner",
    "county": "County",
    "property_address": "Property address",
}

_APN = r"(?:A\.?P\.?N\.?|Assessor'?s? Parcel (?:No\.?|Number))"

# Where a legal description stops.
#
# NOT a blank line — that was the first attempt and it does not survive
# extraction. PDF text layers do not reliably preserve vertical
# whitespace: pdfplumber returns the paragraph after LEGAL DESCRIPTION and
# the heading that follows it separated by a SINGLE newline, because the
# blank line between them on the page is layout, not a character. A
# pattern that waits for `\n\s*\n` waits forever and matches nothing.
#
# Nor an ALL-CAPS line, which was the second idea: legal descriptions are
# full of them ("CITY OF SANTA MONICA, AS PER MAP RECORDED IN BOOK 128").
#
# So: the named sections that actually follow a legal description on a
# preliminary report, plus a hard character ceiling.
_LEGAL_END = (
    r"(?=\n?\s*(?:AT THE DATE HEREOF|EXCEPTIONS|SCHEDULE B|END OF "
    r"(?:LEGAL )?DESCRIPTION|NOTE\s*\d|Order No)|$)"
)
_VESTED = r"(?:Title to said estate or interest at the date hereof is vested in|Vested in|Owner(?:ship)?)"

GENERIC = Template(
    underwriter="unknown",
    signature="",
    patterns={
        "apn": rf"{_APN}\s*[:#]?\s*([0-9]{{3,4}}[- ][0-9]{{3}}[- ][0-9]{{3}})",
        "legal_description": (
            r"(?:Legal Description|LEGAL DESCRIPTION)\s*[:\-]?\s*\n?\s*"
            r"(.{20,900}?)" + _LEGAL_END
        ),
        "vested_owner": rf"{_VESTED}\s*[:\-]?\s*\n?\s*(.{{3,120}}?)(?:\n|$)",
        "county": r"County of\s+([A-Z][A-Za-z ]{3,30}?)(?:\s*,|\s*\n|\s+State)",
        "property_address": r"(?:Property Address|Situs Address|Address)\s*[:\-]?\s*([^\n]{8,120})",
    },
)

# UNVERIFIED — see TEMPLATE PROVENANCE above. Each of these is a
# hypothesis about one underwriter's layout and must be checked against
# real reports before being relied on.
TEMPLATES: List[Template] = [
    Template("First American Title", "first american", dict(GENERIC.patterns)),
    Template("Fidelity National Title", "fidelity national", dict(GENERIC.patterns)),
    Template("Chicago Title", "chicago title", dict(GENERIC.patterns)),
    Template("Old Republic Title", "old republic", dict(GENERIC.patterns)),
    Template("Stewart Title", "stewart title", dict(GENERIC.patterns)),
]


def _text_of(pdf_bytes: bytes) -> str:
    import pdfplumber

    chunks: List[str] = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            chunks.append(page.extract_text() or "")
    return "\n".join(chunks)


# Below this many characters we treat the document as having no usable
# text layer. Scanned PDFs frequently yield a handful of stray characters
# from a header stamp or a fax banner rather than a clean zero, so a
# `== 0` check would let exactly the documents this guard exists for slip
# through and report "nothing found".
MIN_TEXT_CHARS = 200


def read_text_or_refuse(pdf_bytes: bytes) -> str:
    """Extract the text layer, or refuse loudly.

    THE watch-point of this ticket. A scanned prelim must never come back
    as an empty-but-successful extraction.
    """
    try:
        text = _text_of(pdf_bytes)
    except Exception as e:
        raise PrelimUnreadable(
            f"This file could not be opened as a PDF ({type(e).__name__}). "
            f"Please upload the preliminary report as a PDF."
        )

    if len(text.strip()) < MIN_TEXT_CHARS:
        raise PrelimUnreadable(
            "This looks like a scanned preliminary report — the pages are "
            "images, so there is no text to read. Nothing was extracted. "
            "Ask the title company for the digital (text) version, or enter "
            "the details manually."
        )
    return text


def pick_template(text: str) -> Template:
    head = text[:4000].lower()
    for t in TEMPLATES:
        if t.signature and t.signature in head:
            return t
    return GENERIC


def _clean(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip(" .,:;-")


def extract_fields(text: str, template: Template) -> List[Field]:
    found: List[Field] = []
    for key, pattern in template.patterns.items():
        m = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if not m:
            continue
        value = _clean(m.group(1))
        if value:
            found.append(Field(key=key, value=value, label=FIELD_LABELS[key]))
    return found


def import_prelim(pdf_bytes: bytes) -> Dict[str, Any]:
    """Read a prelim and return CANDIDATES, never confirmed values.

    Raises PrelimUnreadable when there is no text layer — the caller
    surfaces that verbatim rather than rendering an empty result.

    ═══ DOCTRINE A — FOUR OF THE FIVE FIELDS ARE FACTS ═══

    `vested_owner` is not. What follows "vested in:" on a real report is a
    NAME PLUS A LEGAL CHARACTERIZATION — "JOHN A. DOE AND JANE B. DOE,
    HUSBAND AND WIFE AS JOINT TENANTS" — and this function used to put the
    whole string in `candidates`, which is a fact position, as a single
    amber value. H1 §2.2 forbids exactly that on the wire; RED0 found the
    same defect from the inside (R3-2). The taxonomy was drawn by field
    NAME rather than by CONTENT, and the one field whose content is mixed
    slipped through on its label.

    So the composite is split by `services.vesting_split`, the same module
    the SiteX path uses, and lands in three different places:

      candidates  the PARTIES, as a fact — amber, confirmable, unchanged
                  in every other respect
      proposals   the CHARACTERIZATION — violet, NOT confirmable by the
                  field gate, reaching the deed only through an explicit
                  acceptance that is recorded as a legal choice
      verbatim    the composite as printed, for audit. A bare string, so
                  nothing that walks `candidates` can pick it up.

    A composite we cannot split confidently offers NEITHER half and lands
    in `needs_review` instead: an honest "we could not separate this"
    beats a confident wrong answer, and it is the same refusal posture as
    the scanned-prelim path above.
    """
    from services.vesting_split import as_candidates as split_owner

    text = read_text_or_refuse(pdf_bytes)
    template = pick_template(text)
    fields = extract_fields(text, template)

    if not fields:
        # A readable document we could not parse is ALSO a refusal. An
        # empty candidate list rendered as a result would tell the officer
        # her prelim was empty, which is a different and untrue statement.
        raise PrelimUnreadable(
            "This PDF has readable text, but none of the fields we look for "
            "were found — it may not be a preliminary title report, or its "
            "layout is one we have not seen. Nothing was extracted."
        )

    candidates: List[Dict[str, Any]] = []
    proposals: List[Dict[str, Any]] = []
    verbatim: Dict[str, Any] = {}
    needs_review: List[Dict[str, Any]] = []

    for f in fields:
        if f.key != "vested_owner":
            candidates.append({"key": f.key, "label": f.label, "value": f.value,
                               "source": "prelim", "status": "candidate"})
            continue

        split = split_owner(f.value, "prelim")
        verbatim["vested_owner"] = {
            "text": split["verbatim"],
            "mixed_content": split["mixed_content"],
        }
        owner = split.get("owner")
        if owner:
            candidates.append({"key": "vested_owner", "label": f.label,
                               **owner})
        proposal = split.get("vesting_proposal")
        if proposal:
            proposals.append({"key": "vesting", "label": "Vesting",
                              **proposal})
        if split.get("needs_review"):
            needs_review.append({"key": "vested_owner", "label": f.label,
                                 "message": split["needs_review"],
                                 "verbatim": split["verbatim"]})

    return {
        "underwriter": template.underwriter,
        # Every value here is a FACT and a CANDIDATE. The gate is
        # untouched: these arrive amber and the officer confirms them
        # exactly as she confirms county-record data.
        "candidates": candidates,
        # And every value here is an INTERPRETATION. 'proposed', not
        # 'candidate' — a legal choice is never auto-applied and never
        # sits in candidate state inside the deed.
        "proposals": proposals,
        # Audit only. Never rendered as a value, never confirmable.
        "verbatim": verbatim,
        # Read, but not separable. Not the same statement as "absent".
        "needs_review": needs_review,
        "not_found": [
            FIELD_LABELS[k] for k in template.patterns
            if k not in {f.key for f in fields}
        ],
        "note": (
            "Extracted from the report you uploaded and not yet confirmed. "
            "Check each value against the document before generating."
        ),
    }
