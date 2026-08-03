"""ONE row contract for every database connection in this codebase.

Why this module exists — the history, because it is the argument:

This codebase had two connection helpers that returned DIFFERENT ROW
TYPES. `database.get_db_connection` handed out RealDictCursor
connections (rows are dicts, `row['name']`); `db.get_db_connection`
returned the shared connection with the default cursor (rows are tuples,
`row[0]`). Nothing in either name said so, and reading one as the other
fails in whichever way is quietest:

- The partner API's auth read a dict row as a tuple, so `key_hash`
  became the literal string "key_hash" and EVERY valid API key 401'd.
  That shipped and stayed broken for months (fixed in A1).
- `routers/notifications.py` did the reverse — reading RealDictCursor
  rows by integer index, a KeyError hidden behind a feature flag that
  defaults off.
- The A3 request-funnel router hit the same trap in its first draft.

PR #107 unified those two onto psycopg2's `DictCursor`, whose rows
answer to BOTH `row[0]` and `row['name']`. That fixed the reading
problem and introduced a serialising one, because a `DictRow` is a LIST
subclass, not a dict subclass — so any endpoint returning rows straight
to FastAPI emitted a JSON **array** instead of an object. The admin
console's user and deed lists went blank and their drill-downs requested
`/admin/users/undefined/real`, because every field the frontend read by
name was undefined. #107 documented that caveat and pinned it, but the
pin only matched `return cur.fetchall()` written literally; the real
call sites assign first (`rows = cur.fetchall(); return {"items": rows}`)
and walked straight past it.

So the contract is now a row type that is genuinely both:

    HybridRow(RealDictRow)  →  a dict subclass, so json.dumps and
                               FastAPI produce an OBJECT
                            →  with integer indexing, so the ~66
                               existing `row[0]` call sites keep working

There is no access style that fails and no serialisation that surprises.
That is what "one row contract" was supposed to mean.
"""
from psycopg2.extras import RealDictCursor, RealDictRow


class HybridRow(RealDictRow):
    """A record that answers to both `row['name']` and `row[0]`.

    Inherits from RealDictRow — hence `isinstance(row, dict)` is True and
    it serialises as a JSON object — and adds positional access on top.
    Column order is insertion order, which is SELECT order, so `row[0]`
    means what it means in a plain tuple cursor.
    """

    def __getitem__(self, key):
        if isinstance(key, int):
            return list(self.values())[key]
        return super().__getitem__(key)


class HybridCursor(RealDictCursor):
    """RealDictCursor that builds HybridRow records.

    RealDictCursor.__init__ hardcodes `row_factory = RealDictRow`, so the
    factory is replaced after construction rather than passed in.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.row_factory = HybridRow


# The single cursor factory. Both helpers use it; a test forbids a third.
ROW_FACTORY = HybridCursor
