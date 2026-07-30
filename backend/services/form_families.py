"""Family facts the backend needs about instrument types.

Mirror of the frontend FORMS registry (frontend/src/lib/formRegistry.ts) —
a jest pin in formRegistry.test.ts reads this file and holds the two maps
in sync, so a type cannot exist with different family facts on the two
sides of the wire.

Families:
- deed         two parties (grantor/grantee columns, authoritative), DTT.
- affidavit    two REAL parties aliased onto the columns (decedent →
               grantor_name, affiant → grantee_name; owner-accepted).
- declaration  single-party instruments (homestead declarant, certifying
               trustee(s), revoking TOD grantor). Their parties CANNOT map
               onto grantor/grantee — they live in the deeds.parties JSONB
               column (owner-ledgered migration), and the generate path's
               two-party requirement is relaxed to "at least one named
               party" for these types only.
"""

FAMILY_BY_DEED_TYPE = {
    "grant-deed": "deed",
    "grant_deed": "deed",           # legacy slug alias (matches deed_pdf)
    "quitclaim-deed": "deed",
    "quitclaim": "deed",            # legacy slug alias
    "interspousal-transfer": "deed",
    "warranty-deed": "deed",
    "tax-deed": "deed",
    "grant-deed-jt": "deed",
    "grant-deed-cp-ros": "deed",
    "grant-deed-corp": "deed",
    "grant-deed-partnership": "deed",
    "affidavit-death-jt": "affidavit",
    "affidavit-death-cp-spouse": "affidavit",
    "affidavit-death-trustee": "affidavit",
    "affidavit-death-jt-dp": "affidavit",
    "affidavit-death-cp-dp": "affidavit",
    "homestead-declaration": "declaration",
    "trust-certification": "declaration",
    "tod-revocation": "declaration",
    "homestead-declaration-spouses": "declaration",
    "homestead-abandonment": "declaration",
}

SINGLE_PARTY_FAMILIES = {"declaration"}

# Property-less instruments describe no parcel: no APN, no legal
# description (the certification of trust certifies a TRUST — Prob C
# §18100.5). Everything else still requires a legal description on the
# generate path.
PROPERTYLESS_TYPES = {"trust-certification"}


def family_of(deed_type):
    """Unknown types default to 'deed' — the strictest validation path."""
    return FAMILY_BY_DEED_TYPE.get(deed_type or "", "deed")


def is_single_party(deed_type):
    return family_of(deed_type) in SINGLE_PARTY_FAMILIES


def requires_legal_description(deed_type):
    return deed_type not in PROPERTYLESS_TYPES
