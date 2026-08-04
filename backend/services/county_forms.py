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


REGISTRY: Dict[str, CountyForm] = {
    "los angeles:BOE-502-A": LA_BOE_502A_REV18,
}


def lookup_form(county: str, form_code: str = "BOE-502-A") -> Optional[CountyForm]:
    """Exact lookup on a normalized county name — the same discipline
    T-2's jurisdictions registry uses, and for the same reason."""
    key = f"{' '.join((county or '').strip().lower().split())}:{form_code}"
    return REGISTRY.get(key)
