"""The schema authority must be runnable against an EMPTY database.

═══ WHAT THIS EXISTS TO CATCH ═══

`create_tables()` is a single transaction with one commit at the very
end. Every statement in it either succeeds or the whole thing rolls
back — so a statement that references a table created LATER in the same
list does not produce a missing column. It produces NO SCHEMA AT ALL.

That is exactly what EMAIL2 shipped to CI: an
`ALTER TABLE signing_requests ADD COLUMN IF NOT EXISTS offered_fee TEXT`
placed thirty lines above the CREATE for `signing_requests`. Sixty-odd
tests failed with `relation "users" does not exist` — users, a table
created nine hundred lines earlier and entirely innocent.

═══ AND WHY IT WAS INVISIBLE UNTIL CI ═══

§14.2, again, and in its purest form. Every database a human runs this
against ALREADY HAS the tables, because it ran successfully once before
the mistake was made. Production has them. My local database had them.
The statement is correct on every database except a new one — and a new
one is the only kind CI ever sees, and the only kind the next
deployment will be.

So the property is checked STATICALLY, from the source order, because
the only environment that can observe it dynamically is one nobody
develops against.
"""
import ast
import re
from pathlib import Path

import pytest

from tests.source_text import code_only

BACKEND = Path(__file__).resolve().parents[1]
DATABASE = BACKEND / "database.py"


def _code():
    """`database.py` with comments and docstrings blanked.

    Not a formality. The fix for the bug this file pins added a fifteen-
    line comment to `database.py` explaining the ordering rule — and two
    of the tests below work by substring position. A raw read would let
    that comment satisfy a pin about the statement it describes, which is
    the precise trip `code_only` was built to end. Positions are
    preserved, so the ordering comparisons still mean what they say.
    """
    return code_only(DATABASE)

# `CREATE TABLE IF NOT EXISTS x` / `CREATE TABLE x`
CREATES = re.compile(r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-z_][a-z0-9_]*)", re.I)
# Everything that RESOLVES a table name and therefore needs it to exist.
NEEDS = (
    ("ALTER TABLE", re.compile(r"ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?([a-z_][a-z0-9_]*)", re.I)),
    ("CREATE INDEX", re.compile(r"CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:CONCURRENTLY\s+)?"
                                r"(?:IF\s+NOT\s+EXISTS\s+)?\S+\s+ON\s+([a-z_][a-z0-9_]*)", re.I)),
    ("UPDATE", re.compile(r"^\s*UPDATE\s+([a-z_][a-z0-9_]*)", re.I)),
    ("INSERT INTO", re.compile(r"^\s*INSERT\s+INTO\s+([a-z_][a-z0-9_]*)", re.I)),
    ("REFERENCES", re.compile(r"REFERENCES\s+([a-z_][a-z0-9_]*)\s*\(", re.I)),
)


def _statements():
    """Every SQL literal inside create_tables(), IN SOURCE ORDER.

    ast.walk() is unordered and would defeat the entire point of this
    file, so the nodes are sorted by position. The list-driven loop and
    the older inline cursor.execute() calls are both just string
    constants in that function, which is why this reaches both without
    knowing how either is dispatched.
    """
    tree = ast.parse(_code(), str(DATABASE))
    fn = next(n for n in ast.walk(tree)
              if isinstance(n, ast.FunctionDef) and n.name == "create_tables")
    doc = ast.get_docstring(fn, clean=False)
    nodes = [n for n in ast.walk(fn)
             if isinstance(n, ast.Constant) and isinstance(n.value, str)
             and n.value != doc]
    nodes.sort(key=lambda n: (n.lineno, n.col_offset))
    return [n.value for n in nodes]


def test_the_function_is_one_transaction_which_is_why_order_matters():
    """The premise this whole file rests on, pinned so it cannot quietly
    stop being true. If create_tables() ever commits per statement, a
    mis-ordered ALTER costs one column instead of the schema — still a
    bug, but a different one, and this file's reasoning would need
    rewriting rather than just passing."""
    src = _code()
    body = src[src.index("def create_tables"):]
    body = body[:body.index("\ndef ", 1)]
    assert body.count("conn.commit()") == 1, (
        "create_tables no longer has exactly one commit — re-read this file's "
        "docstring before changing the assertion")


def test_nothing_touches_a_table_before_the_statement_that_creates_it():
    """THE PIN THIS FILE EXISTS FOR."""
    created = set()
    problems = []
    for sql in _statements():
        if not any(k in sql.upper() for k in
                   ("CREATE", "ALTER", "UPDATE ", "INSERT ", "DROP")):
            continue
        # A DO $$ ... $$ block is a guarded conditional — its ALTER runs
        # only when a catalogue query says the column is there, so it
        # cannot fail on an absent table. Excluded deliberately, not
        # because it was awkward.
        guarded = sql.lstrip().upper().startswith("DO $$")
        # WITHIN a statement, its own CREATEs count as already done —
        # `superseded_by UUID REFERENCES document_authenticity(id)` inside
        # the CREATE for document_authenticity is a self-referencing key,
        # which is legal and which the first version of this pin called a
        # defect. Registering before checking fixes that without weakening
        # the cross-statement ordering this file is actually about.
        for m in CREATES.finditer(sql):
            created.add(m.group(1).lower())
        for kind, pattern in NEEDS:
            if guarded:
                continue
            for m in pattern.finditer(sql):
                table = m.group(1).lower()
                if table in created:
                    continue
                # Only tables THIS FUNCTION creates are in scope. A name
                # it never creates is a different defect (or a catalogue
                # view) and is caught by the test below.
                if not any(table == c.group(1).lower()
                           for s in _statements() for c in CREATES.finditer(s)):
                    continue
                problems.append(f"{kind} {table} — before its CREATE: {sql.strip()[:90]}")

    assert not problems, (
        "create_tables() runs in ONE transaction, so each of these rolls back "
        "the ENTIRE schema on a fresh database:\n  " + "\n  ".join(problems))


def test_every_table_it_alters_is_a_table_it_also_creates():
    """The other half of the same property: an ALTER against a table no
    statement here creates depends on a migration that lives somewhere
    else, and on a new database there is no somewhere else."""
    all_sql = _statements()
    created = {m.group(1).lower() for s in all_sql for m in CREATES.finditer(s)}
    altered = set()
    for sql in all_sql:
        if sql.lstrip().upper().startswith("DO $$"):
            continue
        for m in NEEDS[0][1].finditer(sql):
            altered.add(m.group(1).lower())
    assert not (altered - created), (
        f"altered but never created here: {sorted(altered - created)}")


def test_the_email2_column_is_ordered_correctly_and_would_be_caught_if_it_moved():
    """A mutation probe on the pin above, kept because the pin's whole
    claim is that it catches THIS mistake — the one that shipped."""
    src = _code()
    alter = src.index("ALTER TABLE signing_requests ADD COLUMN IF NOT EXISTS offered_fee")
    create = src.index("CREATE TABLE IF NOT EXISTS signing_requests")
    assert create < alter, "the column is added before the table exists again"


@pytest.mark.parametrize("table", ["signing_requests", "signing_participants",
                                   "signing_windows", "signing_responses",
                                   "deed_shares", "deed_pdfs", "users", "deeds"])
def test_the_tables_ci_reported_missing_are_all_created_here(table):
    """The failure named sixty tests and eleven tables. It was one
    statement — but the reason it LOOKED like a schema-wide collapse is
    that it was one, so this pins that the authority does hold all of
    them and the collapse was the transaction, not absent DDL."""
    assert any(m.group(1).lower() == table
               for s in _statements() for m in CREATES.finditer(s)), table
