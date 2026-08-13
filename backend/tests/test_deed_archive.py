"""UX2 items 8/9 — archiving a dead draft, without destroying it.

═══ ARCHIVE IS ITS OWN COLUMN, NOT A STATUS VALUE ═══

Two reasons, and the second is the one that would have bitten.

`status` carries the lifecycle — draft, completed, deleted. Archiving is
ORTHOGONAL to all of it: an archived draft is still a draft, and she may
want it back. `supersession.lineage_state` records the same reasoning for
supersession: "`status` keeps its lifecycle vocabulary; this is the
orthogonal fact."

And practically: NINE query sites filter `status <> 'deleted'`. A new
status value leaks into every one I do not find, and the failure mode of
missing one is that archived rows appear where they should not — which
is quiet. A nullable timestamp cannot leak by omission: a query that
ignores it shows archived rows, which is visible, rather than hiding live
ones, which is not.

═══ DRAFTS ONLY ═══

A completed deed is an INSTRUMENT (§9): stored PDF, fingerprint, possibly
sent, signed or recorded. The way to retire one is supersession, which
records a relationship. Archiving one would be a filing decision quietly
standing in for a legal one.
"""
import inspect

import pytest

import routers.deeds_crud as crud


def test_archive_is_a_timestamp_column_not_a_status():
    import database
    src = inspect.getsource(database)
    assert "ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ" in src
    # And the reasoning travels with it, because the next person to want
    # an "archived" status will look here first.
    assert "orthogonal" in src


def test_the_status_vocabulary_did_not_grow():
    """The check that would have caught the other design.

    If `archived` had become a status, these nine sites would each need
    finding. Asserting the string is absent is cheap and says why.
    """
    from pathlib import Path
    backend = Path(__file__).resolve().parents[1]
    offenders = []
    for path in backend.rglob("*.py"):
        if "__pycache__" in path.parts or "tests" in path.parts:
            continue
        text = path.read_text(encoding="utf-8")
        if "'archived'" in text or '"archived"' in text:
            offenders.append(path.relative_to(backend).as_posix())
    assert offenders == [], f"`archived` used as a status value: {offenders}"


def test_a_completed_deed_is_refused_and_told_what_to_do_instead():
    """THE PIN THIS FILE EXISTS FOR.

    A refusal that only says no leaves her with a deed she wants out of
    the way and no route. This one names supersession, which is the act
    that actually applies.
    """
    src = inspect.getsource(crud.archive_deed_endpoint)
    assert "status_code=409" in src
    assert "superseding deed" in src
    assert "records the relationship" in src


def test_the_refusal_reads_status_before_it_writes():
    src = inspect.getsource(crud.archive_deed_endpoint)
    assert src.index("SELECT status") < src.index("UPDATE deeds")


def test_archiving_and_unarchiving_are_one_endpoint():
    """Two routes would be two places to forget the draft-only rule."""
    assert "archived" in crud.ArchiveRequest.model_fields
    assert crud.ArchiveRequest.model_fields["archived"].default is True
    src = inspect.getsource(crud.archive_deed_endpoint)
    assert "if body.archived else None" in src


def test_nothing_is_destroyed():
    """It is not a delete, and the statement proves it: one column moves
    and no row goes anywhere.

    Read through `code_only` because the first draft caught its OWN
    docstring — the phrase "it is not a delete" contains DELETE. A sweep
    that cannot tell a description of a rule from a violation of it gets
    widened until it means nothing. Same lesson the frontend
    "times offered" sweep learned an hour earlier.
    """
    from tests.source_text import code_only
    body = code_only(inspect.getsource(crud.archive_deed_endpoint))
    # `deleted` the STATUS is fine; `DELETE` the statement is not.
    assert "DELETE FROM" not in body.upper()
    assert "SET archived_at" in body


def test_the_default_list_omits_archived_and_can_be_asked_for_them():
    src = inspect.getsource(crud.list_deeds_endpoint)
    assert "include_archived" in src
    assert "archived_at IS NULL OR %s" in src


def test_the_row_carries_the_flag_so_a_screen_can_show_it():
    """A list that hides archived rows without saying which they are
    cannot offer a filter she can trust."""
    src = inspect.getsource(crud.list_deeds_endpoint)
    assert "archived_at" in src.split("SELECT")[1].split("FROM")[0]


@pytest.mark.parametrize("blocked", ["completed", "deleted"])
def test_both_terminal_states_are_refused(blocked):
    src = inspect.getsource(crud.archive_deed_endpoint)
    assert f'== "{blocked}"' in src
