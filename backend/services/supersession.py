"""T-5 — correction lineage. A new instrument, and a pointer to it.

═══ WHAT SUPERSESSION IS, AND WHAT IT IS NOT ═══

It is a NEW ROW plus a POINTER. It is never a mutation of the old deed
and never a deletion of it.

The superseded deed keeps everything: its stored PDF, its hash, its
recording details, its status. The only thing that changes on it is that
`superseded_by` stops being NULL. That is the whole edit, and §9's
insert-or-refuse already stands guard over the artifacts underneath —
this layer must never tempt anything past it.

The temptation is real and worth naming, because it is the natural next
feature request: "the officer made a typo, just fix the deed." A deed
that has been generated is an instrument. It was rendered, hashed and
stored; it may have been printed, signed, notarised, recorded. Editing
the row would leave the world holding a document our record no longer
describes — and would do so silently, which is the worst version.

So the officer-facing language is deliberate and repeated in the UI: a
corrected deed is A NEW INSTRUMENT REQUIRING ITS OWN EXECUTION. We track
lineage. We do not un-record documents.

═══ WHY THE HISTORY IS VISIBLE ═══

A superseded deed stays fully readable, with its state shown. The chain
is the feature, not the embarrassment: an officer asked six months later
which version was recorded needs to see both and see which replaced
which. Hiding the superseded one would recreate, in the UI, exactly the
un-recording the data model refuses.
"""
from typing import Any, Dict, List, Optional


class SupersessionRefused(Exception):
    """A supersession that would corrupt the chain rather than extend it.

    Deliberately the same posture as StoredPdfConflict (§9): refuse
    loudly rather than take the write and leave a record nobody can
    reason about.
    """


def is_superseded(row: Dict[str, Any]) -> bool:
    return row.get("superseded_by") is not None


def lineage_state(row: Dict[str, Any]) -> str:
    """DERIVED, not stored — see the note in database.py. `status` keeps
    its lifecycle vocabulary; this is the orthogonal fact."""
    return "superseded" if is_superseded(row) else "active"


def is_recorded(row: Dict[str, Any]) -> bool:
    """Did the officer state that this one recorded? RED-S4.

    The distinction this module's docstring rests on — a draft you may
    edit versus an instrument in the world you may only supersede — was
    enforced by `status == 'completed'`, which means ONLY that a PDF was
    rendered. So a deed generated, previewed and thrown away was
    indistinguishable from one that now encumbers real title.

    That is not merely imprecise. `walk_chain` returns a lineage that
    LOOKS authoritative, and an officer asking six months later "which
    version recorded?" — the exact scenario this file's docstring
    invokes — was getting the drafting history instead.

    Note what this is NOT: verification. It is her recorded statement,
    with her name and the moment she made it. We never learn this from
    the county, and a system that inferred it would be asserting
    something nobody checked.
    """
    return row.get("recorded_at") is not None


def recorded_in_chain(rows_by_id: Dict[int, Dict[str, Any]],
                      start_id: int) -> List[int]:
    """The ids in this chain the officer has stated recorded.

    Usually zero or one. MORE THAN ONE IS NOT AN ERROR TO SUPPRESS: a
    correcting deed is a new instrument requiring its own execution, and
    both it and the original can genuinely have been recorded. Surfacing
    two is the honest answer to "what is on record", and hiding one would
    recreate the un-recording the data model refuses.
    """
    return [i for i in walk_chain(rows_by_id, start_id)
            if is_recorded(rows_by_id.get(i) or {})]


def validate_supersession(old: Optional[Dict[str, Any]],
                          new: Optional[Dict[str, Any]]) -> None:
    """Every way this can be wrong, refused by name.

    Each check exists because the alternative is a chain that cannot be
    read backwards — and a lineage you cannot walk is worse than none,
    since it invites trust it has not earned.
    """
    if old is None or new is None:
        raise SupersessionRefused("Both documents must exist.")

    if old["id"] == new["id"]:
        raise SupersessionRefused("A document cannot supersede itself.")

    if old.get("user_id") != new.get("user_id"):
        raise SupersessionRefused(
            "Both documents must belong to the same account.")

    # You do not supersede a draft — you edit it. Supersession is for
    # instruments that already exist in the world.
    if old.get("status") != "completed":
        raise SupersessionRefused(
            "Only a generated document can be superseded. A draft is still "
            "editable — change it directly.")

    if new.get("status") != "completed":
        raise SupersessionRefused(
            "The correcting document must be generated first. Lineage points "
            "at an instrument, not at an intention.")

    # The pointer is written ONCE. A second write would silently redirect
    # history — the same class of harm §9 refuses on the artifacts.
    if old.get("superseded_by") is not None:
        raise SupersessionRefused(
            f"Document #{old['id']} is already superseded by "
            f"#{old['superseded_by']}. To correct again, supersede the "
            f"current version.")

    # A two-step cycle is the one an ordinary mistake produces.
    if new.get("superseded_by") == old["id"]:
        raise SupersessionRefused(
            "That would create a loop — the correcting document is already "
            "superseded by this one.")


def walk_chain(rows_by_id: Dict[int, Dict[str, Any]],
               start_id: int) -> List[int]:
    """Follow superseded_by forward to the current version.

    Cycle-guarded even though validate_supersession refuses the ways a
    cycle can be created: a reader that can hang on bad data is a reader
    that will hang on data some future migration produced.
    """
    seen: List[int] = []
    cursor: Optional[int] = start_id
    while cursor is not None and cursor not in seen:
        seen.append(cursor)
        row = rows_by_id.get(cursor)
        cursor = row.get("superseded_by") if row else None
    return seen
