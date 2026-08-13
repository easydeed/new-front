"""What still stands between a document and being ready.

═══ THE PROMISE, MADE COUNTABLE ═══

The product's claim is "every field confirmed by you before it prints",
and nothing in it reported on that claim. This is the report.

═══ TWO POPULATIONS, AND WHY THE FIRST ALONE WOULD LIE ═══

The obvious count is unconfirmed candidates — county-record values the
officer has not yet confirmed. Counted alone it is worse than no number
at all:

  - a draft where she typed an address and left has NOTHING confirmed and
    NOTHING unconfirmed, because a field with no value has nothing to
    confirm. It reports ZERO.
  - a draft one click from done reports its last remaining candidate.

So the number would read zero for the documents furthest from ready and
peak on the ones nearly finished — a hero figure that is not merely
imprecise but inverted, in the most prominent slot on the page.

Owner-ruled: count what stands between this document and being ready,
which is two populations.

  UNCONFIRMED   present, `confirmed_at` is null, source is not 'user'.
                County-record values she has not yet vouched for.

  REQUIRED      what `required_fields.json` says a valid instrument must
                carry and this row does not. Sourced from the corpus the
                print path itself reads (REQUIRED1) — a second definition
                of "required" here would be the disease that ticket cured.

═══ AND A THIRD THING, WHICH IS NOT A COUNT ═══

`names_disagree` is a FACT, not an inference: the grantor she typed and
the owner the county record carries are different strings. It reports the
difference and never says which is right — deciding that is hers, and a
rule that picked one would be inventing an answer §0 forbids.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

from services.form_families import family_of
from services.required_fields import missing as missing_required

#: The county-record fields that carry provenance. Mirrors
#: `MATERIAL_FIELD_LABELS` in `frontend/src/lib/provenance.ts`; a pin
#: holds the two equal.
MATERIAL_FIELDS = {
    "apn": "APN",
    "legalDescription": "Legal description",
    "owner": "Current owner (per county records)",
    "grantor": "Grantor name",
}

#: Where a material field's value lives on the deed row, so "present" can
#: be answered. A provenance stamp for a field the row does not hold is
#: not a thing to confirm.
VALUE_COLUMN = {
    "apn": "apn",
    "legalDescription": "legal_description",
    "owner": "current_owner",
    "grantor": "grantor_name",
}


def unconfirmed(provenance: Optional[Dict[str, Any]],
                row: Dict[str, Any]) -> List[Dict[str, str]]:
    """County-record values she has not yet confirmed.

    THE DERIVATION RULE, owner-approved:

        present AND confirmed_at IS NULL AND source != 'user'

    The stored shape is `{field: {source, confirmed_at}}` — `status` is
    not persisted. `confirmed_at` is stamped at entry for anything typed,
    so a null timestamp means unconfirmed for every value the current
    builder wrote. The `source != 'user'` clause covers the one exception:
    a grantor stamped before provenance existed persists as
    `{'user', null}` while the browser treats it as confirmed on entry.
    Counting it would ask her to re-confirm something she typed herself.
    """
    prov = provenance or {}
    out = []
    for key, label in MATERIAL_FIELDS.items():
        stamp = prov.get(key) or {}
        value = row.get(VALUE_COLUMN[key])
        if not (value or "").strip():
            continue                      # nothing there to confirm
        if stamp.get("confirmed_at"):
            continue                      # she confirmed it
        if (stamp.get("source") or "").strip().lower() == "user":
            continue                      # she typed it; that IS confirming
        if not stamp and key == "grantor":
            # MIRRORS `grantorFieldProvenance` IN THE BROWSER, and the two
            # must agree or the dashboard counts a field the builder shows
            # as settled.
            #
            # An unstamped grantor only predates stamping. If it equals the
            # county's owner it arrived by the SiteX prefill and is a
            # candidate; anything else she typed, and typing is confirming.
            if (value or "").strip().lower() != \
                    (row.get("current_owner") or "").strip().lower():
                continue
        out.append({"field": key, "label": label, "population": "unconfirmed"})
    return out


def _tokens(name: str) -> frozenset:
    """A name reduced to its parts, for comparing two spellings of one.

    ═══ WHY TOKENS AND NOT THE STRING ═══

    County records write `SMITH, JANE`; an officer types `JANE SMITH`.
    Comparing the strings would flag every deed in the product, and a
    warning that fires always is a warning nobody reads.

    Reordering the parts of a full name is a SPELLING difference in §0's
    sense — `5TH ST` and `5th Street` — not an identity decision. Two
    different people do not share a token set. What this deliberately does
    NOT do is treat `MARIA L. RUIZ` and `MARIA LUCIA RUIZ` as one name:
    they differ, she should look, and guessing that an initial stands for
    a particular name is exactly the invention §0 declines.
    """
    cleaned = re.sub(r"[.,]", " ", (name or "").lower())
    return frozenset(t for t in cleaned.split() if t)


def names_disagree(row: Dict[str, Any]) -> Optional[Dict[str, str]]:
    """The typed grantor and the county's vested owner are different.

    A FACT, reported as one. It does not say which is correct, because
    both are legitimate: she may be conveying from a name the record does
    not carry, or the record may be stale, or one of them is a typo. The
    product cannot tell, and a rule that picked would be inventing an
    answer about a person's identity on a recorded instrument.

    Named for what it compares, too. The mockup said "escrow instructions
    say X" — the product has never ingested an escrow instruction, so the
    sentence would have described a document it does not hold.
    """
    typed = (row.get("grantor_name") or "").strip()
    record = (row.get("current_owner") or "").strip()
    if not typed or not record:
        return None                       # nothing to compare
    if _tokens(typed) == _tokens(record):
        return None
    return {
        "field": "grantor",
        "label": "Names differ",
        "population": "disagreement",
        "typed": typed,
        "record": record,
    }


def outstanding(row: Dict[str, Any],
                provenance: Optional[Dict[str, Any]] = None) -> List[Dict[str, str]]:
    """Everything standing between this document and being ready.

    One list, in the order she would work through it: what the instrument
    is missing, then what she has not vouched for, then the disagreement
    that needs her judgement rather than her typing.
    """
    deed_type = row.get("deed_type") or ""
    required = [
        {"field": r.field, "label": r.label, "population": r.population}
        for r in missing_required(family_of(deed_type), deed_type, row)
    ]
    items = required + unconfirmed(provenance, row)
    disagreement = names_disagree(row)
    if disagreement:
        items.append(disagreement)
    return items
