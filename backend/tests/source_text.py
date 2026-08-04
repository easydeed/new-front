"""One helper for reading source as CODE, without its prose.

═══ WHY THIS FILE EXISTS ═══

Six times now, a forbidden-pattern pin has failed on the comment
EXPLAINING the removal it was guarding. The shape is always the same:

    # This used to apply a generic $2.20 to any city at all.
    ...
    assert "2.20" not in src   # <- trips on the sentence above

The pin is right, the code is right, and the test fails because prose
that describes a defect necessarily quotes it. Every occurrence got its
own local `code_only()`/AST-strip, and by T-2 there were four of them in
this directory with slightly different behaviour — one stripped comments
but not docstrings, which is exactly how the sixth trip happened.

Owner-ruled into T-3. One helper, one behaviour: docstrings AND comments
removed, code preserved verbatim.

═══ WHAT IT DOES NOT DO ═══

It does not strip string literals. A pin searching for a value that
legitimately appears in a STRING (an error message, a SQL fragment) is
asking a different question and should say so at the call site.
"""
import ast
from pathlib import Path
from typing import Union


def code_only(source: Union[str, Path]) -> str:
    """Return `source` with docstrings and `#` comments removed.

    Accepts a path or the source text itself. Line structure is
    preserved for comments (the line becomes empty rather than
    disappearing), so a failure message's line numbers stay usable.
    """
    src = Path(source).read_text(encoding="utf-8") if isinstance(source, Path) else source

    # Docstrings first: they are the half that the pre-T-3 comment-only
    # variants missed.
    try:
        tree = ast.parse(src)
    except SyntaxError:
        tree = None
    if tree is not None:
        for node in ast.walk(tree):
            if isinstance(node, (ast.Module, ast.FunctionDef,
                                 ast.AsyncFunctionDef, ast.ClassDef)):
                doc = ast.get_docstring(node, clean=False)
                if doc:
                    src = src.replace(doc, "")

    return "\n".join(
        "" if line.lstrip().startswith("#") else line
        for line in src.splitlines()
    )
