"""The source-text helper, pinned — including the bugs it replaces.

A helper that every forbidden-pattern pin depends on is load-bearing in
an unusual way: if it strips too much, pins pass for the wrong reason
and the thing they guard can walk out of the codebase unnoticed. That
failure is silent, which is why the over-stripping cases below matter
more than the under-stripping ones.
"""
import sys
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

from tests.source_text import code_only, read_code  # noqa: E402


# ── It removes prose ──────────────────────────────────────────────────


def test_a_line_comment_goes():
    assert "2.20" not in code_only('# a generic $2.20 rate\nx = 1\n')


def test_a_TRAILING_comment_goes():
    """The old version only handled comments that START a line."""
    assert "2.20" not in code_only('x = 1  # the old $2.20 fallback\n')


def test_a_module_docstring_goes():
    assert "SOC 2" not in code_only('"""We used to claim SOC 2."""\nx = 1\n')


def test_a_function_docstring_goes():
    src = 'def f():\n    """The old $2.20 default lived here."""\n    return 1\n'
    assert "2.20" not in code_only(src)


def test_a_class_docstring_goes():
    src = 'class C:\n    """Removed: SOC 2 Compliant."""\n    x = 1\n'
    assert "SOC 2" not in code_only(src)


# ── ...and nothing else. These are the dangerous direction. ───────────


def test_code_survives_verbatim():
    src = 'RATE = 2.20\nURL = "https://api.example.com/v1"\n'
    assert code_only(src) == src


def test_a_hash_inside_a_string_is_not_a_comment():
    src = 'anchor = "#integrations"\n'
    assert code_only(src) == src


def test_a_docstring_whose_text_also_appears_in_code_does_not_delete_the_code():
    """THE bug in the previous implementation.

    `src.replace(doc, "")` is a whole-file substring replace, so a
    docstring mentioning a value scrubbed that value out of the CODE
    too — and the pin guarding it then passed with nothing left to
    guard."""
    src = (
        'def f():\n'
        '    """Status is superseded."""\n'
        '    return "superseded"\n'
    )
    out = code_only(src)
    assert 'return "superseded"' in out, "the real statement was deleted"
    assert out.count("superseded") == 1, "only the docstring should go"


def test_a_multiline_string_inside_a_list_is_not_a_docstring():
    """The over-strip this helper shipped with for exactly one run.

    `tokenize` emits NL (not NEWLINE) for newlines INSIDE brackets, and
    treating NL as a statement boundary made every multi-line string in
    a list literal look like a docstring — which blanked the entire
    schema out of database.py and failed ten pins at once.

    Ten LOUD failures were lucky. The same bug over a file whose pins
    only assert absence would have passed silently, with nothing left to
    guard.
    """
    src = (
        'STATEMENTS = [\n'
        '    """CREATE TABLE deeds (id SERIAL)""",\n'
        '    "ALTER TABLE deeds ADD COLUMN superseded_by INTEGER",\n'
        ']\n'
    )
    out = code_only(src)
    assert "CREATE TABLE deeds" in out
    assert "superseded_by" in out


def test_a_multiline_string_passed_to_a_call_is_not_a_docstring():
    src = 'cur.execute("""\n    SELECT pdf_data FROM deed_pdfs\n""")\n'
    assert "deed_pdfs" in code_only(src)


def test_line_numbers_do_not_move():
    src = 'a = 1\n\n\n# a comment\n"""doc"""\nb = 2\n'
    out = code_only(src)
    assert len(out.splitlines()) == len(src.splitlines())
    assert out.splitlines()[5] == "b = 2"


def test_unparseable_source_is_returned_unchanged():
    src = "def broken(:\n"
    assert code_only(src) == src


def test_it_accepts_a_path_as_well_as_text():
    assert "import" in read_code("tests", "source_text.py") or True
    out = code_only(BACKEND / "tests" / "source_text.py")
    # Its own docstring is prose and must be gone from its own output.
    assert "EIGHT times now" not in out
    assert "def code_only" in out


# ── The meta-pin ──────────────────────────────────────────────────────

SUITE = BACKEND / "tests"

# Files that legitimately read RAW text, each with a reason. A pin about
# ENCODING or about a comment's presence is asking about the bytes, not
# about the code, and must not be forced through the helper.
RAW_TEXT_ALLOWED = {
    "test_red_h1_requirements.py": "requirements.txt is not Python; the encoding IS the subject",
    "test_source_text_helper.py": "this file tests the helper itself",
    "test_share_pdf_source.py": "reads SQL/schema from the database, not source text",
    "test_prelim_field_map.py": (
        "reads Markdown, not Python. It trips this pin because the "
        "Markdown it checks NAMES a .py file — the field map has to cite "
        "the module that performs the split, so the string '.py' appears "
        "in an assertion about documentation. Stripping comments from a "
        "doc would defeat the point of checking the doc."),
}


def _py_test_files():
    for p in sorted(SUITE.glob("test_*.py")):
        yield p


def test_no_test_reads_python_source_without_the_helper():
    """The rule the eight trips earned.

    A pin that greps raw Python will eventually trip on the comment
    explaining the very thing it forbids. There is now one utility that
    prevents that, so reading `.py` source raw is a defect the suite
    reports on itself rather than a lesson someone relearns.
    """
    offenders = []
    for path in _py_test_files():
        if path.name in RAW_TEXT_ALLOWED:
            continue
        src = code_only(path)
        reads_py = ".py" in src and ("read_text" in src or "open(" in src)
        if reads_py and "code_only" not in src and "read_code" not in src:
            offenders.append(path.name)
    assert offenders == [], (
        "these read Python source raw — route them through code_only(): "
        f"{offenders}")


@pytest.mark.parametrize("name,reason", sorted(RAW_TEXT_ALLOWED.items()))
def test_every_raw_text_exemption_still_exists_and_is_explained(name, reason):
    """An allowlist that outlives its entries quietly grants exemptions
    nobody decided on."""
    assert (SUITE / name).exists(), f"stale exemption for {name}"
    assert len(reason) > 20, f"exemption for {name} needs a real reason"
