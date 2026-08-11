"""FLOW1 item 4 — a name is not a pronoun, and the agenda sends its dates.

═══ THE DEFECT ═══

`share_signing_request` told a notary, in a live email:

    "Picking a time tells {owner_name} you are available then; SHE
     confirms the appointment with the signers HERSELF."

`owner_name` is a real escrow officer whose pronouns this product has
never been told and has no way to learn. The message goes to her own
professional contact. So the product was making a claim about its
customer, to her colleague, on no information — and the same sentence
existed twice, once in HTML and once in plain text, because a defect in
one template is a defect in every rendering of it.

The screen had it too: `RequestSigningModal` said the notary "posts the
times SHE is free" about somebody the officer picked out of her rolodex
moments earlier.

This is the same error family as FLOW1's "filed as" constraint. There,
the product must not infer what a partner is PERMITTED to do from how
she filed them. Here, it must not infer what a person IS from their
name or their role. Both are the product asserting something about a
human being that nobody told it.

═══ WHY THE SWEEP HAS EXEMPTIONS, AND WHY THEY ARE NOT COWARDICE ═══

Two habitats keep gendered pronouns and MUST:

  * The California all-purpose acknowledgement (Civil Code §1189) —
    "acknowledged to me that he/she/they executed the same in
    his/her/their authorized capacity". That wording is PRESCRIBED. It
    is a certificate a notary signs under penalty of perjury, not our
    prose about a user, and it does not name anybody — it says
    "person(s)". Rewriting it would be a legal choice auto-applied
    (§1), on the one kind of text §2 says we never pre-fill.

  * Vesting terms of art — "a married man as his sole and separate
    property". A legal characterization the officer selects and the
    recorder expects, not a description of a user.

The distinction the sweep encodes is exactly the owner's wording:
**pronouns referring to a NAMED PARTY**. The statutory text refers to no
one; our email named her.

Every exemption is a file plus a stated reason, and a test asserts each
exempted file still exists — an allowlist that outlives its entries
grants exemptions nobody decided on.
"""
from __future__ import annotations

import ast
import re
from pathlib import Path

import pytest

from tests.source_text import code_only

BACKEND = Path(__file__).resolve().parents[1]
REPO = BACKEND.parent

PRONOUNS = re.compile(r"\b(she|her|hers|herself|he|him|his|himself)\b", re.I)

# path (relative to repo root) -> why it may keep gendered wording.
PRONOUN_EXEMPT = {
    "backend/templates/grant_deed_template.html": (
        "The California all-purpose acknowledgement, Civil Code §1189. "
        "'he/she/they' and 'his/her/their' are the prescribed wording of a "
        "certificate a notary signs under penalty of perjury. It names no "
        "party — it says 'person(s)'. Editing it would be a legal choice "
        "auto-applied (§1) to text §2 says we never pre-fill."
    ),
}


def _rendered_lines(path: Path):
    """Lines of a .py file that are CODE, with docstrings removed.

    Prose about a role in a docstring is not a claim made to anybody. The
    sweep is about what the product SAYS, so it reads what the product
    renders.
    """
    src = path.read_text(encoding="utf-8")
    tree = ast.parse(src)
    doc_lines: set[int] = set()
    for node in ast.walk(tree):
        if isinstance(node, (ast.Module, ast.FunctionDef, ast.AsyncFunctionDef,
                             ast.ClassDef)):
            if ast.get_docstring(node, clean=False) is not None and node.body:
                first = node.body[0]
                doc_lines.update(range(first.lineno,
                                       (first.end_lineno or first.lineno) + 1))
    for i, line in enumerate(src.splitlines(), 1):
        if i in doc_lines or line.lstrip().startswith("#"):
            continue
        yield i, line


def test_no_template_asserts_a_pronoun_for_a_named_party():
    """Fail-closed across every email template and every Jinja template.

    Sweeping the whole tree rather than the two known sites, because the
    next one will be written by somebody who never read this file.
    """
    offenders = []

    for path in sorted((BACKEND / "utils").glob("*.py")):
        for lineno, line in _rendered_lines(path):
            if PRONOUNS.search(line):
                offenders.append(f"{path.relative_to(REPO)}:{lineno}: {line.strip()[:90]}")

    for path in sorted((BACKEND / "templates").rglob("*")):
        if not path.is_file():
            continue
        rel = str(path.relative_to(REPO))
        if rel in PRONOUN_EXEMPT:
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        for lineno, line in enumerate(text.splitlines(), 1):
            if PRONOUNS.search(line):
                offenders.append(f"{rel}:{lineno}: {line.strip()[:90]}")

    assert offenders == [], (
        "these assert a pronoun in rendered copy — use the name, or "
        "neutral phrasing:\n" + "\n".join(offenders))


@pytest.mark.parametrize("rel,reason", sorted(PRONOUN_EXEMPT.items()))
def test_every_pronoun_exemption_still_exists_and_is_explained(rel, reason):
    """An allowlist that outlives its entries quietly grants exemptions
    nobody decided on."""
    assert (REPO / rel).exists(), f"stale exemption for {rel}"
    assert len(reason) > 40, f"exemption for {rel} needs a real reason"
    assert "§" in reason or "Civil Code" in reason, (
        f"the exemption for {rel} must cite what makes the wording "
        "prescribed rather than merely traditional")


def test_the_statutory_acknowledgement_is_untouched():
    """The exemption is only honest if the thing it exempts is still the
    statutory text, rather than a file that once was."""
    text = (BACKEND / "templates" / "grant_deed_template.html").read_text(encoding="utf-8")
    assert "he/she/they" in text
    assert "his/her/their" in text
    assert "PENALTY OF PERJURY" in text


def test_the_officer_agenda_sends_when_she_asked():
    """FLOW1 item 4: the stuck signal's input, as a fact rather than an
    inference.

    The screen used to reconstruct a request's age as
    `expires_at - 21 days`, duplicating default_expiry()'s constant into
    TypeScript as a bare number. Changing the default would have silently
    re-aimed every stuck badge, and nothing would have failed.
    """
    source = code_only(BACKEND / "routers" / "signing.py")
    agenda = source[source.index("def officer_agenda"):]
    agenda = agenda[: agenda.index("\n@router.")]
    assert '"created_at": _iso(row.get("created_at"))' in agenda, (
        "the agenda does not send a creation time, so the screen has to "
        "guess one")

    payload = source[source.index("def _officer_payload"):]
    assert '"created_at": _iso(req.get("created_at"))' in payload


def test_the_frontend_no_longer_reconstructs_the_age():
    """The other half of the same fix — pinned from here too, because a
    server that sends the fact and a screen that ignores it is the same
    defect with an extra step."""
    page = (REPO / "frontend" / "src" / "app" / "signings" / "page.tsx").read_text(
        encoding="utf-8")
    assert "21 * 86400_000" not in page
    assert "ageInDays(r.created_at)" in page
