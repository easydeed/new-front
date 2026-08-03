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
- `routers/notifications.py` does the reverse — it reads RealDictCursor
  rows by integer index (`r[0]`), which raises KeyError. It has never
  been noticed because the whole router is behind a feature flag that
  defaults off.
- The A3 request-funnel router hit the same trap in its first draft.

A landmine that caught its own author while he was documenting it is
past the point of being worth a comment. So: one factory, here, used by
every connection.

WHY DictCursor and not RealDictCursor. DictCursor rows support BOTH
access styles — `row[0]` and `row['name']` both work, and `dict(row)`
works. That makes the contract total instead of exclusive: no call site
can be "reading it the wrong way," because there is no wrong way. It
also means this change converges ~66 existing tuple-indexed call sites
without rewriting (and therefore without risking) any of them.

ONE CAVEAT, pinned below: a DictRow is a list subclass, not a dict
subclass, so returning one directly from a FastAPI endpoint would
serialize as a JSON ARRAY rather than an object. Every call site in this
repo builds its response explicitly or wraps in dict() — the pin in
test_db_row_contract.py keeps it that way.
"""
from psycopg2.extras import DictCursor

# The single cursor factory. Both helpers use it; a test forbids a third.
ROW_FACTORY = DictCursor
