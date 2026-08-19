"""A `BUILT — yes` row names evidence, and the evidence exists.

═══ WHY THIS EXISTS ═══

The 2026-08-19 sweep found the RED0 queue table wrong about six of its
eight rows — five shipped tickets listed as work still to do. The fix was
a person reading the code. The owner's ruling on the follow-up:

    "A table that goes stale the same way will be swept again in six
    weeks, which is the diligence-over-mechanism trade §14.7 rejects."

So this is the mechanism. Each `BUILT` cell names its evidence in
backticks; every path-shaped token in one must resolve to a file that
exists, and a row claiming **yes** must name at least one.

═══ WHAT IT CATCHES, AND WHAT IT CANNOT ═══

**It catches ROT and OVER-CLAIMING.** A `BUILT — yes` citing
`services/foo.py` goes red the day that module is renamed or deleted,
which is how a true row becomes a false one without anybody editing it.
A new row asserting **yes** with no evidence goes red immediately.

**IT CANNOT CATCH UNDER-CLAIMING, WHICH IS WHAT THE SWEEP ACTUALLY
FOUND.** Nothing mechanical distinguishes "queued, correctly" from
"queued, but shipped three weeks ago" — the second requires somebody to
go and look at code the row does not mention. This pin closes the
direction that was *not* the problem, and saying so plainly is the point:
a mechanism that is believed to cover more than it does is the same
defect as a ledger entry that is.

The honest mitigation for the other direction stays what it is — the
sweep runs again, deliberately, rather than never.

═══ WHY THE EVIDENCE IS NOT ITS OWN COLUMN ═══

The ruling asked for "a structured path or module field". The rows
already carry their paths in backticks, which is machine-readable as it
stands; a separate column would state the same fact twice in one row —
two declarations, one contract, and nothing comparing them, which is the
disease this whole convention exists to treat (§14.3). The backtick IS
the structured field. Flagged in the PR rather than decided quietly.
"""
from __future__ import annotations

import re
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
LEDGER = REPO / "docs" / "OWNER_LEDGER.md"

#: Where a bare module path may be rooted. `services/x.py` is a backend
#: path; `lib/x.ts` is a frontend one; `docs/x.md` is repo-relative.
ROOTS = (REPO, REPO / "backend", REPO / "frontend" / "src")

#: A token is a PATH if it carries a directory separator and a suffix we
#: ship. Deliberately narrow: `status='completed'` and `recorded_at` are
#: backticked too, and neither is a file.
PATH_TOKEN = re.compile(r"^[\w.\-/\[\]]+/[\w.\-\[\]]+\.(py|ts|tsx|js|md|json|yml|yaml|css|html)$")


def _queue_rows():
    """The RED0 queue table's rows, as (number, ticket, decided, built)."""
    rows = []
    in_table = False
    for line in LEDGER.read_text(encoding="utf-8").splitlines():
        if line.startswith("| # | ticket |"):
            in_table = True
            continue
        if in_table:
            if not line.startswith("|"):
                break
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if len(cells) < 4 or set(cells[0]) <= {"-"}:
                continue
            rows.append(tuple(cells[:4]))
    return rows


def _paths_in(cell: str):
    return [tok for tok in re.findall(r"`([^`]+)`", cell) if PATH_TOKEN.match(tok)]


def _resolves(token: str) -> bool:
    return any((root / token).exists() for root in ROOTS)


def test_the_queue_table_is_findable_at_all():
    """§14.2 — the control is checked before its result is believed.

    Every assertion below sweeps `_queue_rows()`, and a sweep over an
    empty list is green. If the table is renamed or reformatted, this
    fails LOUDLY rather than letting the rest of the file pass while
    reading nothing.
    """
    rows = _queue_rows()
    assert len(rows) >= 8, (
        f"found {len(rows)} queue rows — the table's shape changed, so "
        "every other assertion in this file is now reading nothing"
    )


def test_every_row_answers_built():
    """An absent field reads as an oversight, which is the whole thing
    the convention exists to make impossible."""
    for number, ticket, _decided, built in _queue_rows():
        assert built, f"row {number} ({ticket[:40]}…) has an empty BUILT cell"


@pytest.mark.parametrize("row", _queue_rows(), ids=lambda r: r[0])
def test_a_built_row_names_evidence_that_exists(row):
    """THE PIN. Rot goes red without anybody editing the table."""
    number, ticket, _decided, built = row
    lowered = built.lower()
    claims_built = "yes" in lowered.split("—")[0]

    paths = _paths_in(built)
    if claims_built:
        assert paths, (
            f"row {number} claims BUILT and names no evidence. A `yes` with "
            "nothing behind it is the assertion this convention replaced — "
            "name a module, script or document in backticks."
        )
    missing = [p for p in paths if not _resolves(p)]
    assert not missing, (
        f"row {number} cites evidence that no longer exists: {missing}. "
        "Either the file moved and the row needs updating, or the row was "
        "wrong when it was written."
    )


def test_the_pin_would_notice_a_path_that_stopped_existing():
    """The probe, kept in the suite rather than run once by hand.

    A pin over paths is worthless if its matcher silently declines to
    recognise them — so this asserts the two halves separately: a real
    path resolves, and an invented one does not.
    """
    assert PATH_TOKEN.match("services/artifact_store.py")
    assert _resolves("services/artifact_store.py")
    assert PATH_TOKEN.match("services/there_is_no_such_module.py")
    assert not _resolves("services/there_is_no_such_module.py")
    # And a backticked thing that is NOT a path is not treated as one —
    # the table is full of `status='completed'` and `recorded_at`.
    assert not PATH_TOKEN.match("recorded_at")
    assert not PATH_TOKEN.match("status = 'completed'")


def test_what_this_cannot_do_is_written_down():
    """The limit belongs where the mechanism is, not only in a PR.

    A mechanism believed to cover more than it does is the same defect as
    a ledger entry believed to — which is the defect this file exists
    downstream of.

    READ FROM `__doc__`, NOT FROM THE SOURCE, and the reason is a pin
    catching a pin: `test_no_test_reads_python_source_without_the_helper`
    requires every Python source read to route through `code_only()` —
    which strips docstrings, i.e. exactly the text this asserts. Reading
    the module's own `__doc__` asks the runtime for the value instead of
    parsing the file, so there is no source read to launder.
    """
    import sys
    assert "CANNOT CATCH UNDER-CLAIMING" in (sys.modules[__name__].__doc__ or "")
