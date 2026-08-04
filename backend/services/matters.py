"""T-4 — the file concept, v1: a matter is an escrow number.

═══ NO SCHEMA CHANGE, DELIBERATELY ═══

The grouping key already existed as data. `metadata.escrow_no` and
`metadata.title_order_no` have been collected by the builder and
persisted on every deed since T2, and nothing ever grouped by them. So v1
groups by what is already there and proves the workflow before asking for
a `matters` table — the proper model is deferred until the officer's use
of this tells us what it should look like.

═══ WHAT CARRIES, AND WHAT MUST NOT ═══

FACTS CARRY. The APN is the APN; the legal description is the legal
description. When the officer already confirmed one on the grant deed,
re-asking on the affidavit an hour later is the busywork this ticket
exists to kill.

They carry WITH THEIR ORIGINAL PROVENANCE — the source and the ORIGINAL
`confirmedAt`, never a fresh stamp. A confirmation is a record of a
moment a human looked at a value and said yes. Re-stamping it on copy
would forge a second look that never happened, and the record would claim
the officer confirmed the APN twice when they confirmed it once. Each
carried field is additionally marked `carriedFrom`, so the UI can say
where it came from rather than presenting inherited data as freshly
entered.

LEGAL CHOICES NEVER CARRY. Ruled, and it is the sharper half.

The documentary-transfer-tax treatment, an exemption claim, the
characterisation of how title passed — these are decisions ABOUT AN
INSTRUMENT, not facts about a property. The DTT exemption that was
correct on an interspousal transfer is not thereby correct on the
quitclaim that follows it, and the officer who accepted R&T 11927 on
Monday accepted it for Monday's document. Carrying it forward would
auto-apply a legal choice to a document nobody has read yet, which is
exactly what doctrine §1 forbids — and it would do so while wearing the
officer's own recorded acceptance, which makes it worse than an
auto-apply, not better.

So: `LEGAL_CHOICE_KEYS` never appear in a carry-forward payload, and a
test asserts each one by name.
"""
from typing import Any, Dict, List, Optional, Tuple

# Facts about the PROPERTY and the parties, safe to carry.
CARRYABLE_ROW_FIELDS = [
    "property_address", "apn", "county", "legal_description",
]
CARRYABLE_META_FIELDS = [
    "property_city", "property_state", "property_zip", "current_owner",
    "title_order_no", "escrow_no", "requested_by_address", "return_to",
]

# NEVER carried. Each is a decision about a particular instrument.
LEGAL_CHOICE_KEYS = [
    "dtt",           # transfer-tax treatment, incl. any exemption claim
    "dttDecision",   # the officer's recorded acceptance of one
    "provenance",    # re-derived per document from the carried fields
    "affidavit",     # facts sworn to in a specific affidavit
]


def matter_key(row: Dict[str, Any]) -> Optional[Tuple[str, str]]:
    """The thread. Escrow number first — it is the officer's own file
    number and the one they say out loud — then the title order.

    Returns (kind, value) or None when the deed carries neither, which is
    common and is not an error: a matter is opt-in, created by the
    officer having typed a number they already use.
    """
    meta = row.get("metadata") or {}
    for kind in ("escrow_no", "title_order_no"):
        value = (meta.get(kind) or "").strip() if isinstance(meta.get(kind), str) else meta.get(kind)
        if value:
            return kind, str(value)
    return None


def party_names(row: Dict[str, Any]) -> List[str]:
    """Both shapes.

    Two-party instruments keep authoritative `grantor_name`/`grantee_name`
    COLUMNS; single-party families (the declaration/affidavit shapes) carry
    their people in the `parties` JSONB instead, per the parties migration.
    A reader that knows only one shape silently misses half the library —
    and the half it misses is the affidavit family, which is precisely
    what an officer wants grouped with a deed.
    """
    names: List[str] = []
    for col in ("grantor_name", "grantee_name"):
        v = row.get(col)
        if v and str(v).strip():
            names.append(str(v).strip())
    parties = row.get("parties")
    if isinstance(parties, dict):
        for v in parties.values():
            if v and str(v).strip():
                names.append(str(v).strip())
    return names


def carry_forward(row: Dict[str, Any]) -> Dict[str, Any]:
    """Build the payload for "start a related document" from a deed.

    Provenance is copied VERBATIM — original source, original
    confirmedAt — and annotated with `carriedFrom`. Nothing is re-stamped.
    """
    meta = row.get("metadata") or {}
    carried: Dict[str, Any] = {}
    for f in CARRYABLE_ROW_FIELDS:
        if row.get(f):
            carried[f] = row[f]
    for f in CARRYABLE_META_FIELDS:
        if meta.get(f):
            carried[f] = meta[f]

    # The officer's earlier confirmations, preserved exactly.
    source_prov = meta.get("provenance") or {}
    provenance: Dict[str, Any] = {}
    for field, stamp in source_prov.items():
        if not isinstance(stamp, dict):
            continue
        provenance[field] = {
            **stamp,
            # The marker that keeps this honest on screen: inherited data
            # is never presented as freshly entered.
            "carriedFrom": row.get("id"),
        }

    return {
        "from_deed_id": row.get("id"),
        "carried": carried,
        "provenance": provenance,
        # Named, so the UI can say WHY the transfer-tax section is empty
        # rather than looking like it forgot.
        "not_carried": [
            "Transfer-tax treatment and any exemption — a legal choice, "
            "decided fresh for each instrument",
            "Affidavit facts — sworn to in a specific document",
        ],
    }
