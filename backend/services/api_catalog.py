"""What the partner API exposes, derived — not a second hand-kept list.

The API's deed types used to be a hardcoded five-value enum that drifted
from the catalog the wizard serves: four deed-family instruments the
chassis renders (the fixed-vesting pair and the two entity grant deeds)
were simply invisible to partners, and nothing would have told us.

The exposed set is now derived from services/form_families.py — itself
the mirror of the frontend FORMS registry — filtered to the DEED FAMILY
ONLY per the Flag-4 doctrine ruling (DOCTRINE_CONFORMANCE.md §8):
affidavits and declarations carry execution-act machinery whose premise
is a human hand at the moment of execution, and each family needs its own
doctrine pass before any machine-to-machine exposure.

Deriving the SET is automatic. Deciding an instrument's FACTS is not:
every exposed type must have an explicit TYPE_REQUIREMENTS entry, and a
test fails if one is missing. So adding a deed type to the registry
surfaces it to partners, but only after someone answers "what does this
instrument need, and what must it refuse?" — which is the question the
entity deeds would have failed silently (they need the grantor entity's
state of organization; without it the deed prints a blank line where a
recital belongs).
"""
from typing import Dict, List, NamedTuple

from services.form_families import FAMILY_BY_DEED_TYPE

# Chassis slugs are hyphenated; the API's JSON contract is underscored.
_LEGACY_ALIASES = {"grant_deed", "quitclaim"}


def _chassis_slugs() -> List[str]:
    return sorted(
        slug for slug, family in FAMILY_BY_DEED_TYPE.items()
        if family == "deed" and slug not in _LEGACY_ALIASES and "_" not in slug
    )


def api_type(chassis_slug: str) -> str:
    return chassis_slug.replace("-", "_")


def chassis_type(api_slug: str) -> str:
    return api_slug.replace("_", "-")


API_DEED_TYPES: List[str] = [api_type(s) for s in _chassis_slugs()]


class TypeRules(NamedTuple):
    """Per-instrument facts and refusals.

    fixed_vesting — the instrument's own title IS the vesting decision
      (Flag-3 precedent). Its template deliberately never reads a stored
      vesting value, so accepting one from a caller and dropping it would
      be silently discarding a legal input. We refuse it instead.
    required_entity_facts — recitals the instrument prints about the
      grantor entity. Absent, the deed renders a blank line inside a
      recital, which is a defective instrument, not a partial one.
    """
    fixed_vesting: bool = False
    requires_vesting: bool = True
    required_entity_facts: tuple = ()
    note: str = ""


TYPE_REQUIREMENTS: Dict[str, TypeRules] = {
    "grant_deed": TypeRules(),
    "quitclaim_deed": TypeRules(
        requires_vesting=False,
        note="Quitclaim conveys whatever interest the grantor holds; vesting is optional.",
    ),
    "interspousal_transfer": TypeRules(),
    "warranty_deed": TypeRules(),
    "tax_deed": TypeRules(),
    "grant_deed_jt": TypeRules(
        fixed_vesting=True, requires_vesting=False,
        note="Vesting is fixed by the instrument: joint tenancy. Choosing this "
             "form IS the vesting decision, so no vesting value is accepted.",
    ),
    "grant_deed_cp_ros": TypeRules(
        fixed_vesting=True, requires_vesting=False,
        note="Vesting is fixed by the instrument: community property with right "
             "of survivorship. No vesting value is accepted.",
    ),
    "grant_deed_corp": TypeRules(
        required_entity_facts=("entity_state",),
        note="Corporate grantor. The deed recites the state under whose laws the "
             "corporation is organized.",
    ),
    "grant_deed_partnership": TypeRules(
        required_entity_facts=("entity_state", "partnership_type"),
        note="Partnership grantor. The deed recites the partnership type and the "
             "state under whose laws it is organized.",
    ),
}


def rules_for(api_slug: str) -> TypeRules:
    return TYPE_REQUIREMENTS.get(api_slug, TypeRules())
