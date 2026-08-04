"""RED-H1.1 — the banned-claims gate, pinned against its own failure modes.

═══ WHY THE CHECKER NEEDS TESTS AT ALL ═══

Because it is BLOCKING. A gate that can produce a false FAIL stops every
push in the repository until someone reasons out why a correct file is
being rejected, and a gate that can produce a false PASS is worse than no
gate — it certifies an audit that did not happen.

The specific failure this project keeps rediscovering is a matcher that
cannot tell CONTEXT from CONTENT. Three times now: a `\\d+%` pin that fired
on CSS keyframes, a deeds-scoped pin that fired on `document_authenticity`'s
own legitimate `status IN ('active','revoked','superseded')`, and the
recurring one — a comment EXPLAINING a removal read as the removal coming
back.

This checker walks straight into all three, because every removal in this
ticket is documented in a comment that quotes what it removed. So the
behaviour is pinned in BOTH directions, which is the part that matters: it
is easy to write a test proving a checker catches things, and the bug that
actually bites is the one where it catches too much.
"""
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import check_banned_claims as bc  # noqa: E402


def _scan_text(tmp_path, monkeypatch, body: str, name: str = "sample.tsx"):
    """Run the real scanner over one synthetic file."""
    src = tmp_path / "frontend" / "src"
    src.mkdir(parents=True)
    (src / name).write_text(body, encoding="utf-8")
    monkeypatch.setattr(bc, "ROOT", tmp_path)
    monkeypatch.setattr(bc, "SEARCH_DIRS", [src])
    return bc.scan()


# ── The claim itself is caught ────────────────────────────────────────


@pytest.mark.parametrize("claim", [
    "SOC 2 Compliant",
    "SOC2 compliant",
    "ALTA Best Practices",
    "ISO 27001 certified",
    "Bank-level security",
    "bank level encryption",
    "99.9% uptime",
    "99.9% SLA",
    "Uptime SLA",
    "military-grade encryption",
    "SoftPro integration",
    "Qualia GraphQL Sync",
    "Works with ResWare",
    "PCI-DSS",
    "HIPAA",
])
def test_a_claim_in_rendered_text_fails(tmp_path, monkeypatch, claim):
    body = f'export default function P() {{ return <p>{claim}</p> }}'
    assert _scan_text(tmp_path, monkeypatch, body), f"{claim!r} was not caught"


def test_every_instance_this_ticket_removed_would_be_caught():
    """The eleven real strings, verbatim from the files RED0 found them in.

    If someone reintroduces one by reverting a component, this is the
    test that names what came back.
    """
    removed = [
        "SOC 2 Compliant",                       # Footer.tsx:78
        "ALTA Best Practices",                   # Footer.tsx:84
        "99.9% Uptime",                          # Footer.tsx:90
        "99.9% Uptime SLA",                      # Features.tsx:118
        "99.9% API uptime",                      # Hero.tsx:100
        "SOC2 • GDPR • CCPA",                    # security/page.tsx:229
        "Bank-level security",                   # register/page.tsx:559
        "SoftPro integration",                   # Pricing.tsx:31
        "Qualia GraphQL sync",                   # Pricing.tsx:37
        "SOC 2 / ALTA aligned",                  # escrow/WhyTiles.tsx:4
        "Import from SoftPro/Qualia",            # escrow/WhyTiles.tsx:2
    ]
    for phrase in removed:
        assert any(r.rx.search(phrase) for r in bc.RULES), \
            f"no rule would catch {phrase!r} if it came back"


# ── ...and prose ABOUT the claim is NOT ───────────────────────────────


def test_a_banned_phrase_inside_a_line_comment_passes(tmp_path, monkeypatch):
    body = (
        "export default function P() {\n"
        "  // RED-H1.1: this used to say SOC 2 Compliant, which was untrue.\n"
        "  return <p>California deeds</p>\n"
        "}\n"
    )
    assert _scan_text(tmp_path, monkeypatch, body) == []


def test_a_banned_phrase_inside_a_block_comment_passes(tmp_path, monkeypatch):
    body = (
        "export default function P() {\n"
        "  /* Was: 'Seamless integration with SoftPro, Qualia and RamQuest.'\n"
        "     None of the three exist, so the section went. */\n"
        "  return <p>California deeds</p>\n"
        "}\n"
    )
    assert _scan_text(tmp_path, monkeypatch, body) == []


def test_a_banned_phrase_inside_a_jsx_comment_passes(tmp_path, monkeypatch):
    body = 'export default function P() { return <div>{/* no ALTA claim here */}<p>ok</p></div> }\n'
    assert _scan_text(tmp_path, monkeypatch, body) == []


def test_the_removal_comments_in_this_very_repo_do_not_trip_the_gate():
    """The end-to-end version: the real tree, with the real comments.

    THE regression this ticket is most likely to cause. Every file it
    touched now carries a comment quoting a banned phrase.
    """
    assert bc.scan() == [], "the repo's own remediation comments trip the gate"


# ── The escape hatch is narrow and must say why ───────────────────────


def test_an_allow_marker_exempts_only_its_own_line(tmp_path, monkeypatch):
    body = (
        "export default function P() {\n"
        '  const q = "Do you connect to SoftPro?" // banned-claims: allow a denial names the system\n'
        '  const bad = "Full SoftPro integration included"\n'
        "  return <p>{q}{bad}</p>\n"
        "}\n"
    )
    found = _scan_text(tmp_path, monkeypatch, body)
    assert len(found) == 1, "the marker should exempt its line and no other"
    assert found[0][1] == 3, "the surviving violation is the unmarked line"


def test_an_allow_marker_without_a_reason_does_not_exempt(tmp_path, monkeypatch):
    """An unexplained exemption is a silent one, which is the thing the
    marker exists to prevent."""
    body = 'const x = "SoftPro integration" // banned-claims: allow\n'
    assert _scan_text(tmp_path, monkeypatch, body), \
        "a bare marker with no reason must not suppress anything"


# ── Line numbers, because a wrong one sends the next person hunting ───


def test_reported_line_numbers_survive_comment_stripping(tmp_path, monkeypatch):
    """Found the hard way: `^\\s*//` ate blank lines along with the comment
    (because `\\s` matches `\\n`), and every line number below drifted."""
    body = (
        "const a = 1\n"
        "\n"
        "\n"
        "// a comment preceded by blank lines\n"
        "/* a block\n"
        "   comment\n"
        "   spanning lines */\n"
        "\n"
        'const bad = "SOC 2 Compliant"\n'
    )
    found = _scan_text(tmp_path, monkeypatch, body)
    assert len(found) == 1
    assert found[0][1] == 9, f"expected line 9, got {found[0][1]}"


def test_stripping_never_changes_the_line_count(tmp_path, monkeypatch):
    body = "a\n/* x\ny\nz */\n// c\n\n// d\nb\n"
    assert len(bc.strip_comments(body, ".tsx").splitlines()) == len(body.splitlines())


# ── Scope ─────────────────────────────────────────────────────────────


def test_tests_are_not_scanned(tmp_path, monkeypatch):
    """A test asserting a phrase is ABSENT has to name it to do that."""
    src = tmp_path / "frontend" / "src"
    (src / "__tests__").mkdir(parents=True)
    (src / "__tests__" / "x.test.ts").write_text('expect(s).not.toContain("SOC 2")', encoding="utf-8")
    monkeypatch.setattr(bc, "ROOT", tmp_path)
    monkeypatch.setattr(bc, "SEARCH_DIRS", [src])
    assert bc.scan() == []


def test_the_deleted_marketing_components_are_really_gone():
    """Deletion, not exemption, was the ruling — a dead component carrying
    a SOC 2 badge is one `import` away from being live again."""
    for name in ["Footer.tsx", "Features.tsx", "Hero.tsx", "Pricing.tsx"]:
        assert not (ROOT / "frontend" / "src" / "components" / name).exists(), \
            f"{name} is back"
    assert not (ROOT / "frontend" / "src" / "components" / "escrow").exists()
