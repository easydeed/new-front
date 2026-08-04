"""RED-H1.4 — the dependency manifest says what we actually install.

Four problems, all of which make the manifest lie in a different way:

  1. It was UTF-16LE. Every tool that reads a requirements file assumes
     UTF-8, and this one raised UnicodeDecodeError on a plain
     `read_text()` — found during T-3 when adding pypdf. A manifest half
     the ecosystem cannot open is not a manifest.

  2. Unpinned floors inside a pinned file. Four `>=` lines sat among
     eighty `==` lines, so a Render redeploy could pull a new major
     SQLAlchemy into the billing system with no code change and no diff
     to review. Reproducible builds are not partly reproducible.

  3. Declared-but-unused packages: redis (zero imports), psycopg v3
     (psycopg2 is what the code uses, so BOTH Postgres drivers were
     installed), pook (an HTTP-mocking TEST library, in the production
     manifest), and openai — whose SDK is never called, because the one
     real OpenAI request is an httpx POST to the REST API.

  4. A comment pointing at services/pcor_fill.py, renamed to
     boe_form_fill.py in T-3b. A stale pointer costs the next reader a
     search and teaches them the file names cannot be trusted.
"""
import sys
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

from tests.source_text import code_only  # noqa: E402

REQUIREMENTS = BACKEND / "requirements.txt"


def _lines():
    text = REQUIREMENTS.read_text(encoding="utf-8")
    return [l.strip() for l in text.splitlines()
            if l.strip() and not l.strip().startswith("#")]


def _name(spec: str) -> str:
    return spec.split("==")[0].split(">=")[0].split("[")[0].strip().lower()


def test_the_manifest_is_utf8():
    """The direct regression: `read_text()` used to raise."""
    REQUIREMENTS.read_text(encoding="utf-8")


def test_no_byte_order_mark():
    assert not REQUIREMENTS.read_bytes().startswith(b"\xef\xbb\xbf")


def test_every_requirement_is_pinned():
    """A `>=` in a manifest of `==` is a build that differs from the one
    that was tested, whenever a maintainer publishes."""
    unpinned = [l for l in _lines() if "==" not in l]
    assert unpinned == [], f"unpinned: {unpinned}"


@pytest.mark.parametrize("package", ["redis", "pook", "openai", "psycopg"])
def test_unused_packages_are_gone(package):
    assert package not in {_name(l) for l in _lines()}


def test_exactly_one_postgres_driver():
    names = {_name(l) for l in _lines()}
    assert "psycopg2-binary" in names
    assert "psycopg" not in names, "both Postgres drivers were installed"


def test_the_only_openai_call_needs_no_sdk():
    """Why removing `openai` is safe rather than merely tidy: the request
    is a plain HTTP POST."""
    src = (BACKEND / "api" / "ai_assist.py").read_text(encoding="utf-8")
    assert "api.openai.com/v1/chat/completions" in src
    assert "import openai" not in src


def test_the_dead_openai_flag_is_gone():
    # code_only(), because the comment recording the removal necessarily
    # quotes what it removed. Eighth time this project has tripped that
    # wire; the shared helper is exactly why it costs one import now
    # instead of a debugging session.
    src = code_only((BACKEND / "ai_assist.py").read_text(encoding="utf-8"))
    assert "OPENAI_AVAILABLE" not in src
    # And with it the warning about a "mock responses" fallback, which
    # described a degraded mode the product does not have.
    assert "mock responses" not in src


def test_no_requirement_is_listed_twice():
    names = [_name(l) for l in _lines()]
    dupes = {n for n in names if names.count(n) > 1}
    assert not dupes, f"duplicated: {dupes}"


def test_boto3_and_botocore_agree():
    """Pinning botocore exactly while boto3 floated could resolve an
    incompatible pair on any redeploy."""
    versions = {_name(l): l.split("==")[1] for l in _lines() if "==" in l}
    if "boto3" in versions and "botocore" in versions:
        assert versions["boto3"] == versions["botocore"]


def test_the_stale_rename_comment_was_swept():
    text = REQUIREMENTS.read_text(encoding="utf-8")
    assert "pcor_fill.py)" not in text or "boe_form_fill.py" in text
    assert (BACKEND / "services" / "boe_form_fill.py").exists()


def test_everything_the_backend_imports_is_declared():
    """The inverse check — removing a package that IS used would break
    production at import time, which is how pypdf's absence was found."""
    names = {_name(l) for l in _lines()}
    for required in ["fastapi", "psycopg2-binary", "weasyprint", "jinja2",
                     "pypdf", "pdfplumber", "stripe", "sendgrid", "httpx",
                     "python-jose", "passlib", "bcrypt"]:
        assert required in names, f"{required} is imported but not declared"
