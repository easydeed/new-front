"""REQUIRED1 — what a valid instrument must carry. The Python reader.

`required_fields.json` is the authority; this module reads it and
`frontend/src/lib/requiredFields.ts` reads the same file. Neither is the
source of truth, for the reason `vesting_split` already established: two
implementations of one rule drift, and the corpus is the only known cure.

═══ THREE DEFINITIONS WERE LIVE AT ONCE ═══

    deeds_crud.py     grantor, grantee, legal description
    partner API       + transfer_tax (required model field), vesting per type
    the browser gate  + vesting AND a transfer-tax decision, family-aware

So `POST /deeds` accepted an instrument the wizard refuses to generate and
the partner API rejects. Not a hypothetical: the wizard's own gate runs in
the browser, so anything calling the endpoint directly — a script, a
retry, a future integration — skipped both legal decisions.

Owner ruling: the stricter set wins.
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, NamedTuple

CORPUS = Path(__file__).with_name("required_fields.json")

#: A field is present when it holds something other than whitespace. For
#: `parties` (a dict) and `dtt` (a decision block) presence is answered by
#: the shapes below rather than by str.strip().
POPULATION_SUBSTANCE = "substance"
POPULATION_DECISION = "decision"


class Requirement(NamedTuple):
    id: str
    field: str
    label: str
    population: str
    section: str
    unless: str = ""


@lru_cache(maxsize=1)
def _corpus() -> Dict[str, Any]:
    return json.loads(CORPUS.read_text(encoding="utf-8"))


def type_flags(deed_type: str) -> Dict[str, Any]:
    """The per-instrument exceptions — `fixed_vesting` and friends."""
    types = {k: v for k, v in _corpus()["types"].items() if k != "_doc"}
    return types.get((deed_type or "").strip(), {})


def requirements(family: str, deed_type: str) -> List[Requirement]:
    """What this instrument must carry, exceptions already applied."""
    fam = _corpus()["families"].get(family)
    if not fam:
        return []
    flags = type_flags(deed_type)
    out = []
    for row in fam["required"]:
        # `unless` names a flag that REMOVES the requirement — a
        # fixed-vesting form does not merely default its vesting, its
        # template refuses to read one, so demanding it would demand a
        # field the instrument has no place to put.
        if row.get("unless") and flags.get(row["unless"]):
            continue
        out.append(Requirement(
            id=row["id"], field=row["field"], label=row["label"],
            population=row["population"], section=row.get("section", ""),
            unless=row.get("unless", ""),
        ))
    return out


#: The corpus names a field once; the two shapes that carry it spell two
#: of them differently.
#:
#: FOUND BY THE DASHBOARD, and it was dormant rather than harmless. The
#: builder's state says `grantor`; a deed ROW says `grantor_name`. The
#: create path passes a row, so `missing()` reported grantor and grantee
#: absent on every call — and nothing showed, because that path raises
#: only on the `decision` population. A substance check that never
#: matches is a check that would not have failed if the property were
#: false (§14.2).
#:
#: The alias belongs here rather than in the corpus: which column a shape
#: uses is a fact about the shape, not about what an instrument requires.
ROW_ALIASES = {
    "grantor": ("grantor", "grantor_name"),
    "grantee": ("grantee", "grantee_name"),
}


def _read(field: str, data: Dict[str, Any]) -> Any:
    """The field's value, under whichever name this shape uses."""
    for name in ROW_ALIASES.get(field, (field,)):
        if name in data:
            return data[name]
    return None


def _present(field: str, value: Any) -> bool:
    """Is this field answered?

    THE DECISION FIELDS ARE NOT STRINGS. `dtt` is a decision block, and an
    exemption declared as "no exemption, full value" is a DECISION — the
    officer said so. Treating a falsy value as absent would re-ask a
    question she already answered, which is the §1 complaint from the
    other side: never inferring the choice includes never forgetting it.
    """
    if value is None:
        return False
    if field == "parties":
        return isinstance(value, dict) and any(
            (v or "").strip() for v in value.values() if isinstance(v, str))
    if field == "dtt":
        if not isinstance(value, dict):
            return bool(str(value).strip())
        # Declared exempt, or a basis chosen — either is an answer.
        return bool(value.get("isExempt") or value.get("is_exempt")
                    or (value.get("basis") or "").strip()
                    or (str(value.get("transfer_value")
                            or value.get("transferValue") or "")).strip())
    return bool(str(value).strip())


def missing(family: str, deed_type: str, data: Dict[str, Any]) -> List[Requirement]:
    """Every requirement this row does not yet satisfy.

    The dashboard's second population, and the generate path's refusal,
    are the same list read by two callers.
    """
    return [r for r in requirements(family, deed_type)
            if not _present(r.field, _read(r.field, data))]
