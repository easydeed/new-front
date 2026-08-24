"""T-3 — the county form registry: (county, form_code, revision) → a
stored PDF and a field map that is DATA, not code.

═══ WHY A REGISTRY AND NOT A FILL FUNCTION ═══

The BOE-502-A is a state form usable in all 58 California counties, and
LA County overprints it as ASSR-70. That means TWO revision numbers move
independently — BOE's (REV 18, 05-23) and the county's (REV 5-24) — and
counties re-publish under the SAME URL. A form fetched at generation time
is a form that can change under you between two deeds.

So: the PDF is stored, hashed, and pinned. The map is per-revision data
keyed by our own stable names. Nothing is fetched at runtime.

═══ THE THREE TRAPS IN THE ACTUAL FORM ═══

These are why the map carries an EXPORT VALUE per checkbox rather than
assuming "/Yes" and "/Off", and why a test asserts every one of them
against the stored PDF's own /_States_:

1. EXPORT VALUES ARE INCONSISTENTLY CASED. 23 checkboxes on this form use
   "/no"; 4 use "/No". Writing the wrong case does not error — the box
   simply stays unchecked. A silent miss on a government form.

2. A COUNTY AUTHORING ERROR. Question H's *NO* checkbox has the on-state
   "/Yes". Checking "no" means writing "/Yes". Any mapper that infers
   export values from the field's label gets this backwards.

3. AN INDISTINGUISHABLE PAIR. Both Part-1 P sub-checkboxes ("leased" and
   "owned" solar) carry the export state
   "/grantors trustors registered domestic partner" — pasted from
   question L2 — so they cannot be told apart by value at all. Neither is
   in our fill set; the collision is recorded so nobody later assumes
   they can be.

Field NAMES on this form are English prose containing typos
("commissino", "informatino", "engery", "documentI") and at least one
soft hyphen. They are unstable across revisions, which is exactly why
our side of the map uses our own keys.
"""
from pathlib import Path
from typing import Dict, List, NamedTuple, Optional

FORMS_ROOT = Path(__file__).resolve().parents[1] / "forms"


class TextField(NamedTuple):
    """One text target. `key` is ours and stable; `field` is the county's
    and is expected to churn between revisions."""
    key: str
    field: str


class CheckField(NamedTuple):
    """One checkbox target.

    `on_value` is REQUIRED and must match the widget's own /_States_ —
    see trap 1 and trap 2 above. It is never inferred.
    """
    key: str
    field: str
    on_value: str


class CountyForm(NamedTuple):
    county: str
    form_code: str
    revision: str
    """The county's own overprint revision, which moves independently of
    the state form's."""
    county_revision: Optional[str]
    path: Path
    sha256: str
    text_fields: List[TextField]
    check_fields: List[CheckField]
    """Fields that exist and are DELIBERATELY never written. Pinned."""
    never_fill: List[str]
    source_url: str


# ── The certification block ──────────────────────────────────────────
#
# DOCTRINE, and the sharpest line in the whole ticket. The form has NO
# /Sig field — the signature line is printed artwork, so we could not
# forge a signature even by accident. But the surrounding fields ARE
# fillable, and filling them is the same act by a quieter route:
#
#   printing the buyer's NAME under a certification they have not signed
#   is pre-filling a sworn statement.
#
# The certification is the buyer's act under penalty of perjury (the form
# says so in those words). Every element of it stays blank, including the
# printed-name line, and an occurrence pin asserts each one by name.
CERTIFICATION_BLOCK = [
    "Date signed by buyer/transferee or corporate officer",
    "Name of buyer/transferee/personal representative/corporate officer (please print)",
    "title",
    "email address",
    "telephone number of buyer/transferee or corporate officer",
    "area code3",
]


LA_BOE_502A_REV18 = CountyForm(
    county="Los Angeles",
    form_code="BOE-502-A",
    revision="REV 18 (05-23)",
    county_revision="ASSR-70 (REV. 5-24)",
    path=FORMS_ROOT / "county/ca/los_angeles/boe502a_rev18.pdf",
    # Pinned. A county re-publishing under the same URL is the failure
    # this catches — the bytes change, the hash changes, the test fails
    # before a single deed is filled against the wrong revision.
    sha256="3345c62541712ec8777e1c180e8b56c7cde9cd206ec0c8fa74faceaa08152940",
    source_url="https://content.lavote.gov/docs/rrcc/documents/preliminary-change-of-ownership.pdf",
    text_fields=[
        TextField("buyer_name_address", "Name and mailing address of buyer/transferee"),
        TextField("buyer_zip", "ZIP code"),
        TextField("apn", "Assessors parcel number"),
        TextField("seller", "seller transferor"),
        TextField("property_address", "street address or physical location of real property"),
        TextField("mail_to_name", "mail property tax information to (name)"),
        # sic — "informatino" is the county's typo, and the map must
        # reproduce it exactly or the write silently misses.
        TextField("mail_to_address", "Mail property tax informatino to address"),
        TextField("mail_to_city", "city"),
        TextField("mail_to_state", "state"),
    ],
    # Deliberately EMPTY at launch.
    #
    # Every checkbox on Part 1 is an exclusion CLAIM with tax
    # consequences — a wrong one can trigger reassessment plus penalty,
    # which makes it a heavier legal choice than the DTT exemption the
    # builder already gates. Doctrine §1: legal choices are never
    # auto-applied. They are PROPOSED to the officer in violet and
    # written only on acceptance, and that acceptance happens in the
    # officer's UI, not in this fill layer.
    #
    # The three property-type boxes in Part 2 are facts rather than
    # claims, but we do not hold property type today — see the T-3
    # report's "genuinely new asks".
    check_fields=[],
    never_fill=CERTIFICATION_BLOCK,
)


# ── The 502-D's certification block ──────────────────────────────────
#
# Same doctrine, different form, and it needed its own list because the
# field names share nothing with the 502-A's. Note field 94 in
# particular: "Printed name of wet signature ..." — the form itself calls
# the signature WET, which is as explicit as a document gets about the
# act being a human's. It stays blank like the rest.
DEATH_STATEMENT_CERTIFICATION = [
    "Name",
    "title",
    "date",
    "telephone",
    "area code",
    "email",
    "pt mailing address",
    "pt mailing city",
    "pt mailing state",
    "pt mailing zip",
    "Printed name of wet signature spouse/registered domestic partner/personal represenatitve to the left",
]


LA_BOE_502D_REV15 = CountyForm(
    county="Los Angeles",
    form_code="BOE-502-D",
    revision="REV 15 (07-25)",
    # NEWER than the 502-A's overprint, and on its own track entirely —
    # which is the case for two-revision versioning made by the second
    # form we added rather than argued in the abstract.
    county_revision="ASSR-176 (REV. 10-25)",
    path=FORMS_ROOT / "county/ca/los_angeles/boe502d_rev15.pdf",
    sha256="cbe6b781f264200014bb88efd9d6bfe18aeca8a554a970454013639306a435f9",
    source_url=(
        "https://res.cloudinary.com/los-angeles-county-assessor/image/upload/"
        "v1622784606/Form/BOE-502-D.pdf"
    ),
    text_fields=[
        TextField("decedent_name", "name of decedent"),
        TextField("date_of_death", "date of death"),
        TextField("apn", "APN of real property"),
        TextField("property_street", "street address of real property"),
        TextField("property_city", "city of real property"),
        TextField("property_zip", "zip of real property"),
        TextField("affiant_name_address", "name and mailing address"),
    ],
    # EMPTY, for the same reason as the 502-A's.
    #
    # This form's checkboxes are the succession questions — "succession
    # without a will", "decree of distribution pursuant to will", "action
    # of trustee pursuant to terms of a trust", "affidavit of death of
    # joint tenant", and the beneficiary-relationship set. Every one is a
    # statement about HOW title passed, which is the legal characterisation
    # at the heart of the instrument. Doctrine §1: proposed, accepted,
    # never applied.
    #
    # They are derivable from the affidavit variant, and that derivation
    # belongs in the officer's violet proposal — not here.
    check_fields=[],
    never_fill=DEATH_STATEMENT_CERTIFICATION,
)


REGISTRY: Dict[str, CountyForm] = {
    "los angeles:BOE-502-A": LA_BOE_502A_REV18,
    "los angeles:BOE-502-D": LA_BOE_502D_REV15,
}


# ══ WHICH BOE FORM BELONGS TO WHICH FAMILY ═══════════════════════════
#
# PCOR3's finding: the offer was never gated by family AT ALL. Both
# companion endpoints tested only `lookup_form(county, code)` — a county ×
# form registry — so in Los Angeles every instrument returned
# `available: True` for both forms. A grant deed was offered a death
# statement and an affidavit of death was offered a PCOR, with the same
# unconditionality, in both directions, since T-3b.
#
# Each surface's COPY made the mismatch worse by asserting the family it
# never checked: the PCOR block says "Required with this conveyance" (on
# an affidavit, which conveys nothing) and the 502-D's ask says "the
# affidavit variant on file did not record one" (on a deed that has no
# affidavit). **A sentence written to be unconditionally true will be true
# in the wrong context too**, which is how both survived.
#
# So the mapping is DERIVED from the family registry rather than written
# twice. `form_families.FAMILY_BY_DEED_TYPE` already decides what an
# instrument IS; a new instrument inherits its companion by construction,
# and adding one to that registry cannot leave this table stale.
#
# ── AND `None` IS A DECISION, WRITTEN AS ONE (owner-ruled 2026-08-21) ──
#
# **An unmapped family and a family mapped to nothing are identical in
# code and opposite in meaning.** `COMPANION_BY_FAMILY.get(family)`
# returns None for "we decided this family takes no BOE form" and for
# "nobody has thought about this family yet", and a future instrument
# would inherit the second while looking like the first.
#
# So every family carries an entry and a reason, and
# `test_pcor3_family_gate` fails when a new family appears in
# `FAMILY_BY_DEED_TYPE` without one here. A declaration-family instrument
# added next year inherits a RULING rather than an absence.
COMPANION_BY_FAMILY: Dict[str, Optional[str]] = {
    # The conveyance. R&T §480.3 — a deed presented without a PCOR may be
    # charged an extra $20 at recording.
    "deed": "BOE-502-A",
    # Change in Ownership — Death of Real Property Owner.
    "affidavit": "BOE-502-D",
    # NO COMPANION, and the reason is the statute rather than the filing.
    # **The PCOR's trigger is a CHANGE IN OWNERSHIP, not a recording.** A
    # homestead declaration and a trust certification are recorded
    # instruments that do not convey and do not change ownership, so
    # neither the 502-A nor the 502-D applies to them. Owner-ruled.
    "declaration": None,
}


def companion_form_code(deed_type: str) -> Optional[str]:
    """The one BOE form this instrument's family takes, or None.

    The single authority. Every surface that offers a companion asks
    HERE — a second opinion about which form fits which instrument is
    how the two directions went wrong independently.
    """
    from services.form_families import FAMILY_BY_DEED_TYPE

    # MEMBERSHIP, not `family_of`. That helper defaults an unknown type to
    # "deed" and its docstring calls that "the strictest validation path"
    # — true for VALIDATION, where deed demands the most required fields.
    #
    # It is the LOOSEST possible default here. The same fallback that
    # tightens a form's validation hands an unregistered instrument a
    # legal companion form. **A default's safety is a property of its
    # CONSUMER, not of the default**, and this one is consumed in both
    # directions from a single docstring asserting it is strict.
    #
    # So this gate fails CLOSED: an instrument nobody registered gets no
    # companion. Offering the wrong form is worse than offering none, and
    # a missing offer is visible to the officer while a wrong one is not.
    family = FAMILY_BY_DEED_TYPE.get((deed_type or "").strip())
    if family is None:
        return None
    return COMPANION_BY_FAMILY.get(family)


def lookup_form(county: str, form_code: str = "BOE-502-A") -> Optional[CountyForm]:
    """Exact lookup on a normalized county name — the same discipline
    T-2's jurisdictions registry uses, and for the same reason."""
    key = f"{' '.join((county or '').strip().lower().split())}:{form_code}"
    return REGISTRY.get(key)
