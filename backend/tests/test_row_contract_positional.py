"""A database row is NEVER destructured positionally. Repo-wide.

═══ WHY A PROPERTY AND NOT SIX FIXES ═══

This defect has now appeared SIX times, in four years' worth of code
written by different hands:

    A1          the partner API's auth read a dict row as a tuple, so
                `key_hash` became the literal string "key_hash" and every
                valid API key 401'd — for months
    ADMIN1.5    the admin serializers, same shape
    TRIAL1      /users/upgrade            nobody could reach Checkout
    TRIAL1      /users/verify-email/request  an unverified user was told
                                          "Email already verified"
    TRIAL1      shared-deed feedback      the deed's own owner got 403
    TRIAL1      check_plan_limits         a limit check that always says
                                          yes (uncalled, fixed anyway)

Six independent authors did not each make a careless mistake. They wrote
the obvious thing, and the obvious thing is wrong here for a reason that
is invisible at the call site.

═══ THE MECHANISM ═══

`db_rows.HybridRow` is a `RealDictRow` subclass — a DICT — with integer
indexing added:

    def __getitem__(self, key):
        if isinstance(key, int):
            return list(self.values())[key]
        return super().__getitem__(key)

It overrides `__getitem__`. It does NOT override `__iter__`.

So `row[0]` returns the first VALUE, and `a, b = row` — which iterates —
returns the first two KEYS. Both spellings look like "read this row
positionally"; one works and one silently yields column names. Every
occurrence above is that gap.

And the failure is always quiet, because a column name is a non-empty
string: truthy, comparable, JSON-serialisable. `if not customer_id` took
the wrong branch. `if verified` took the wrong branch. `owner != user_id`
was permanently true. Nothing raised. Nothing logged.

═══ WHY THE RULE IS ABSOLUTE, WITH NO ALLOWLIST ═══

The tempting version of this pin allows positional destructuring in
files that use a plain psycopg2 cursor, where it is genuinely correct.
That version fails at the only moment it matters: a reader looking at
`a, b = row` cannot tell which kind of cursor produced `row` without
tracing the connection, and THAT AMBIGUITY IS THE BUG. An allowlist
would encode the ambiguity as policy.

So TRIAL1 converged the five plain-cursor sites that actually
destructured (`migrations/fix_user5_password`,
`scripts/backfill_plan_sync`, `scripts/init_db`, and two test helpers)
onto `db_rows.ROW_FACTORY` and made them read by key. The rule is now
sayable in one line with no exceptions — **read rows by name,
everywhere**.

═══ WHAT THIS PIN DOES NOT CLAIM ═══

Stated because the first draft of this file over-reached and asserted it.

Roughly 25 scripts and test helpers still open their own
`psycopg2.connect(...)` with no cursor factory, and their rows really
are plain tuples. NONE of them destructure — verified — so none are
broken, and converging all 25 is not this ticket.

That leaves one honest wrinkle: in those files `a, b = cur.fetchone()`
would WORK, and this pin forbids it anyway. Deliberate. The whole defect
is that `a, b = row` is right or wrong depending on a cursor factory
chosen in another file, and no reader can tell which by looking. A rule
with an "unless the cursor is plain" carve-out reproduces exactly the
ambiguity that produced six bugs. The way to comply in such a file is to
give it `ROW_FACTORY` — the direction we want anyway.
"""
import ast
import re
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

import pytest

FETCH = re.compile(r"^fetch(one|all|many)$")


def _is_fetch_call(node) -> bool:
    return (isinstance(node, ast.Call)
            and isinstance(node.func, ast.Attribute)
            and bool(FETCH.match(node.func.attr)))


def _python_files():
    for path in sorted(BACKEND.rglob("*.py")):
        if "__pycache__" in str(path):
            continue
        yield path


def _offenders(path: Path):
    """Every tuple/list destructure whose source is a database row.

    Catches three shapes, because the first cut of this sweep caught only
    the first and reported 8 sites when there were 11:

        a, b = cur.fetchone()          direct
        row = cur.fetchone(); a, b = row   via a variable
        for a, b in cur.fetchall():    loops and comprehensions
    """
    try:
        tree = ast.parse(path.read_text(encoding="utf-8"))
    except SyntaxError:
        return []

    row_vars = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign) and _is_fetch_call(node.value):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    row_vars[target.id] = node.lineno

    found = []
    for node in ast.walk(tree):
        target = value = None
        if isinstance(node, ast.Assign):
            tuples = [t for t in node.targets if isinstance(t, (ast.Tuple, ast.List))]
            if tuples:
                target, value = tuples[0], node.value
        elif isinstance(node, (ast.For, ast.comprehension)):
            if isinstance(node.target, (ast.Tuple, ast.List)):
                target, value = node.target, node.iter
        if target is None:
            continue
        from_row = _is_fetch_call(value) or (
            isinstance(value, ast.Name) and value.id in row_vars)
        if from_row:
            found.append((getattr(node, "lineno", 0), ast.unparse(target)))
    return found


def test_no_database_row_is_destructured_positionally():
    """THE pin. Not "these six call sites are fixed" — "this shape does
    not exist in the repository"."""
    offenders = []
    for path in _python_files():
        for lineno, target in _offenders(path):
            offenders.append(f"{path.relative_to(BACKEND)}:{lineno}  {target} = <row>")

    assert offenders == [], (
        "a database row is being destructured positionally — it yields "
        "COLUMN NAMES, not values (db_rows.HybridRow overrides "
        "__getitem__ but not __iter__). Read by key:\n  "
        + "\n  ".join(offenders))


def test_the_sweep_can_actually_see_all_three_shapes():
    """A detector that finds nothing proves nothing until you know it can
    find something. Each shape is fed to it explicitly, because the first
    version of this sweep silently missed loops and under-reported by
    three sites."""
    import tempfile

    samples = {
        "direct": "a, b = cur.fetchone()\n",
        "via variable": "row = cur.fetchone()\na, b = row\n",
        "for loop": "for a, b in cur.fetchall():\n    pass\n",
        "comprehension": "x = [a for a, b in cur.fetchall()]\n",
    }
    for label, src in samples.items():
        with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False) as fh:
            fh.write(src)
            tmp = Path(fh.name)
        try:
            assert _offenders(tmp), f"the sweep cannot see the {label} shape"
        finally:
            tmp.unlink()


def test_reading_by_index_still_works_and_is_not_what_this_forbids():
    """`row[0]` is correct — HybridRow overrides __getitem__ for ints on
    purpose, to keep ~66 legacy call sites working. The forbidden thing
    is specifically ITERATION, which was never overridden."""
    from db_rows import HybridRow

    row = HybridRow([("stripe_customer_id", None), ("email", "a@b.test")])
    assert row[0] is None
    assert row["email"] == "a@b.test"
    # And the trap itself, asserted so the reason is executable:
    assert list(row) == ["stripe_customer_id", "email"], (
        "if this ever returns VALUES, HybridRow gained an __iter__ and "
        "this whole pin can be retired")


def test_the_two_application_helpers_share_one_factory():
    """This pin only means something while the APP has one row type.

    Scoped to the two helpers every request goes through — `db.py` and
    `database.py`. Those are what PR #107 unified after two factories
    401'd every API key for months. Scripts opening their own connection
    are outside this claim (see the docstring); the destructure ban above
    covers them, and covers them absolutely.
    """
    from db_rows import ROW_FACTORY, HybridCursor
    from tests.source_text import code_only

    assert ROW_FACTORY is HybridCursor

    for name in ("db.py", "database.py"):
        src = code_only(BACKEND / name)
        connects = re.findall(r"psycopg2\.connect\(([^)]*)", src)
        assert connects, f"{name} no longer opens connections — re-scope this pin"
        for args in connects:
            assert "ROW_FACTORY" in args, (
                f"{name} opens a connection off the one row contract: "
                f"psycopg2.connect({args.strip()}...)")
