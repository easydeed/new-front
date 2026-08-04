"""One helper for reading source as CODE, without its prose.

═══ WHY THIS FILE EXISTS ═══

EIGHT times now, a forbidden-pattern pin has failed on the comment
EXPLAINING the removal it was guarding. The shape is always the same:

    # This used to apply a generic $2.20 to any city at all.
    ...
    assert "2.20" not in src   # <- trips on the sentence above

The pin is right, the code is right, and the test fails because prose
that describes a defect necessarily quotes it. Every occurrence got its
own local strip, and by T-2 there were four of them in this directory
with slightly different behaviour — one stripped comments but not
docstrings, which is exactly how the sixth trip happened.

T-3 consolidated the Python side. The eighth trip (RED-H1.4, on a
comment recording an `OPENAI_AVAILABLE` removal) cost one import instead
of a debugging session, which is the argument for this file.

═══ WHAT CHANGED, AND WHY THE OLD VERSION WAS NOT ENOUGH ═══

The first implementation did:

    for node in ast.walk(tree):
        doc = ast.get_docstring(node)
        if doc:
            src = src.replace(doc, "")     # <- text replace

That is a substring replace over the WHOLE FILE. Two consequences:

  1. If a docstring's text also appears in code — a SQL fragment, an
     error message, a status literal — the replace deletes it THERE too,
     and a pin then passes because the thing it was guarding vanished
     from the text it searched. A pin that passes for the wrong reason is
     worse than one that fails.
  2. It removed the docstring's CONTENT but left its quotes, and took the
     newlines with it, so every line number below shifted and a failure
     message pointed at the wrong line.

It also only stripped comments on lines that START with `#`, so a
trailing `x = 1  # ...` survived and could trip a pin.

This version tokenizes. `tokenize` knows which `#` is a comment and which
is inside a string, and it reports exact positions, so comments and
docstrings are blanked IN PLACE. Line and column numbers survive.

Same lesson as everywhere else in this project, in its narrowest form:
match STATEMENTS, not strings. A tokenizer knows what a comment is; a
pattern only knows what one looks like.

═══ WHAT IT DOES NOT DO ═══

It does not strip ordinary string literals. A pin searching for a value
that legitimately appears in a STRING (an error message, a SQL fragment)
is asking a different question and should say so at the call site.
"""
import io
import tokenize
from pathlib import Path
from typing import Union


def _blank_span(lines, start, end):
    """Replace the source between two (row, col) points with spaces,
    keeping newlines so every later position stays where it was."""
    srow, scol = start
    erow, ecol = end
    if srow == erow:
        line = lines[srow - 1]
        lines[srow - 1] = line[:scol] + " " * (ecol - scol) + line[ecol:]
        return
    first = lines[srow - 1]
    lines[srow - 1] = first[:scol] + " " * (len(first) - scol)
    for row in range(srow + 1, erow):
        lines[row - 1] = " " * len(lines[row - 1])
    last = lines[erow - 1]
    lines[erow - 1] = " " * ecol + last[ecol:]


def code_only(source: Union[str, Path]) -> str:
    """Return `source` with docstrings and `#` comments blanked out.

    Accepts a path or the source text itself. Positions are preserved:
    a comment becomes spaces, not nothing, so `line N` in a failure
    message still refers to line N of the real file.

    Falls back to the raw text if the source does not tokenize — a test
    helper must never turn a syntax error into a confusing assertion
    failure somewhere else.
    """
    src = Path(source).read_text(encoding="utf-8") if isinstance(source, Path) else source

    # keepends so column offsets line up with the original exactly.
    lines = src.splitlines(keepends=True)
    if not lines:
        return src

    try:
        tokens = list(tokenize.generate_tokens(io.StringIO(src).readline))
    except (tokenize.TokenError, IndentationError, SyntaxError):
        return src

    # A STRING token is a docstring when it is the first meaningful token
    # of a logical line — which covers module, class and function
    # docstrings AND the bare string-expression case, without ast's
    # node walk or its whole-file text replace.
    at_statement_start = True
    spans = []
    for tok in tokens:
        if tok.type == tokenize.COMMENT:
            spans.append((tok.start, tok.end))
            continue
        if tok.type in (tokenize.NL, tokenize.NEWLINE, tokenize.INDENT,
                        tokenize.DEDENT, tokenize.ENCODING):
            # ONLY the logical NEWLINE starts a new statement. NL is the
            # non-logical newline tokenize emits INSIDE brackets, and
            # treating it as a statement boundary was a real bug caught
            # by the existing suite: in
            #
            #     for stmt in [
            #         \"\"\"CREATE TABLE ...\"\"\",
            #
            # the SQL follows `[` + NL, so resetting here marked it a
            # docstring and blanked the entire schema out of database.py.
            # Ten pins failed at once — the over-stripping direction,
            # which is the one that makes pins pass for the wrong reason.
            if tok.type == tokenize.NEWLINE:
                at_statement_start = True
            continue
        if tok.type == tokenize.STRING and at_statement_start:
            spans.append((tok.start, tok.end))
        at_statement_start = False

    for start, end in reversed(spans):
        _blank_span(lines, start, end)

    return "".join(lines)


def read_code(*segments: str) -> str:
    """Read a file relative to `backend/` and return it as code only."""
    return code_only(Path(__file__).resolve().parent.parent.joinpath(*segments))
