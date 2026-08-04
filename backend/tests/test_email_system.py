"""E1 — the email system's pins: one transport, ten templates, golden HTML.

What is pinned here and why:

- GOLDEN SNAPSHOTS: every template's exact HTML is committed under
  tests/snapshots/emails/. A template change is a deliberate, reviewed
  visual change — regenerate with
      python -m tests.test_email_system --regen   (from backend/)
  and the diff shows in the PR.

- REMOVED-FOR-CAUSE STRINGS (owner ruling, named in the E1 PR): three
  copy strings were removed for cause and are pinned against recurrence
  in source AND in every rendered output:
    * "ready for recording" — a legal-outcome claim no email may make;
    * "Great news!" — editorializing tone; facts, plainly;
    * "secure and only accessible to invited collaborators" — an untrue
      security claim about a bearer link. THE security-claim pin: any
      resurrection of this sentence (or fragment) fails the build.

- SUBJECT CONVENTION (locked): fact + short address, no emoji — subjects
  are pure ASCII.

- ONE TRANSPORT: utils/email.py is the only module that touches
  SendGridAPIClient, and the boolean-swallowing `send_email` wrapper is
  dead — every sender returns (ok, reason).

- STREET ADDRESS ONLY: bodies carry the first comma segment of the
  property address, never the full address, never a legal description.

- UNLOSABLE APPROVAL: the approve path creates the in-app record BEFORE
  attempting email — an approval must survive a transport failure.

All CI-safe: no database, no network.
"""
import os
import re
import sys
from pathlib import Path

import pytest

from utils import email_templates
from tests.source_text import code_only

BACKEND = Path(__file__).resolve().parents[1]
SNAP_DIR = Path(__file__).resolve().parent / "snapshots" / "emails"

FORBIDDEN = [
    "ready for recording",
    "Great news",
    "secure and only accessible",  # the bearer-link security claim — pinned hard
]

ADDR_FULL = "1234 Sycamore Lane, Los Angeles, CA 90001"
ADDR_STREET = "1234 Sycamore Lane"
LINK = "https://app.example.test/approve/tok123"


class _FixedDatetime:
    """Deterministic clock for golden renders (password_changed stamps
    the change time into the body)."""
    @staticmethod
    def utcnow():
        import datetime as _dt
        return _dt.datetime(2026, 8, 3, 12, 0, 0)


@pytest.fixture(autouse=True)
def _stable_render_env(monkeypatch):
    monkeypatch.setenv("FRONTEND_URL", "https://deedpro-frontend-new.vercel.app")
    monkeypatch.setattr(email_templates, "datetime", _FixedDatetime)


def _samples():
    """name -> (subject, html, text) for every template, fixed inputs."""
    t = email_templates
    return {
        "share_invite": t.share_invite(
            "Pat Reviewer", "Jordan Owner", "Grant Deed", ADDR_FULL, LINK, "August 5, 2026"),
        "share_reminder": t.share_reminder(
            "", "Jordan Owner", "Grant Deed", ADDR_FULL, LINK, 18),
        "share_approved": t.share_approved(
            "Jordan Owner", "Grant Deed", ADDR_FULL, "pat@escrow.test",
            "Vesting matches the title report.", LINK),
        "share_rejected": t.share_rejected(
            "Jordan Owner", "Grant Deed", ADDR_FULL, "pat@escrow.test",
            "Grantee name is misspelled — see title report.", LINK),
        "deed_completed": t.deed_completed(
            "Jordan Owner", "Interspousal Transfer Deed", ADDR_FULL, 42, LINK),
        "password_reset": t.password_reset("Jordan Owner", LINK, 1),
        "verify_email": t.verify_email("Jordan Owner", LINK),
        "password_changed": t.password_changed("Jordan Owner"),
        "welcome": t.welcome("Jordan Owner"),
        "admin_new_user": t.admin_new_user(
            "newuser@example.test", 77, registered_at="2026-08-03 12:00 UTC"),
    }


# ── Golden snapshots ─────────────────────────────────────────────────

def test_golden_snapshots_match():
    samples = _samples()
    missing = [n for n in samples if not (SNAP_DIR / f"{n}.html").exists()]
    assert not missing, (
        f"Missing golden files {missing} — regenerate with "
        "`python -m tests.test_email_system --regen` from backend/"
    )
    for name, (subject, html, _text) in samples.items():
        golden = (SNAP_DIR / f"{name}.html").read_text(encoding="utf-8")
        rendered = f"<!-- subject: {subject} -->\n{html}"
        assert rendered == golden, (
            f"Template '{name}' drifted from its golden snapshot. If the "
            "change is deliberate, regenerate goldens and include the diff "
            "in the PR: python -m tests.test_email_system --regen"
        )


def test_every_template_has_a_plain_text_part():
    for name, (subject, html, text) in _samples().items():
        assert isinstance(text, str) and text.strip(), f"{name}: empty text part"
        assert subject.strip(), f"{name}: empty subject"
        assert "<table" in html, f"{name}: not on the table-based base"


# ── Removed-for-cause copy (owner ruling) ────────────────────────────

def test_forbidden_strings_never_render():
    for name, parts in _samples().items():
        blob = "\n".join(parts).lower()
        for phrase in FORBIDDEN:
            assert phrase.lower() not in blob, f"{name} contains removed-for-cause copy: {phrase!r}"


def test_forbidden_strings_not_in_sender_source():
    """The pin against recurrence: the sentence must not come back in ANY
    email-adjacent source file, not just the rendered set."""
    for rel in ["utils/email_templates.py", "utils/notifications.py",
                "utils/email.py", "routers/sharing.py", "routers/auth_extra.py",
                "routers/deeds_crud.py", "routers/users_auth.py"]:
        src = code_only(BACKEND / rel).lower()
        for phrase in FORBIDDEN:
            assert phrase.lower() not in src, f"{rel} contains removed-for-cause copy: {phrase!r}"


# ── Subject convention: fact + short address, no emoji ───────────────

def test_subjects_have_no_emoji():
    """Typography (the em-dash) is fine; symbols and emoji are not —
    the old subjects opened with a checkmark and an arrow-cycle glyph."""
    for name, (subject, _html, _text) in _samples().items():
        assert subject == subject.strip()
        for c in subject:
            assert ord(c) < 0x2100, f"{name}: emoji/symbol in subject {subject!r}"


def test_deed_subjects_use_street_address_only():
    for name in ["share_invite", "share_reminder", "share_approved",
                 "share_rejected", "deed_completed"]:
        subject = _samples()[name][0]
        assert ADDR_STREET in subject, f"{name}: subject lacks the short address"
        assert "Los Angeles" not in subject, f"{name}: subject leaks past the street segment"


# ── Street address only / no NPI in bodies ───────────────────────────

def test_short_addr_takes_first_comma_segment():
    assert email_templates._short_addr(ADDR_FULL) == ADDR_STREET
    assert email_templates._short_addr(None) == ""
    assert email_templates._short_addr("No Commas Rd") == "No Commas Rd"


def test_bodies_never_carry_full_address_or_legal_description():
    for name, (subject, html, text) in _samples().items():
        for part in (html, text):
            assert "Los Angeles, CA 90001" not in part, f"{name}: full address in body"
    src = code_only(BACKEND / "utils/email_templates.py")
    assert "legal_description" not in src, "templates must never touch legal descriptions"


def test_deed_related_templates_carry_the_not_legal_advice_footer():
    for name in ["share_invite", "share_reminder", "share_approved",
                 "share_rejected", "deed_completed"]:
        html = _samples()[name][1]
        assert "Nothing in this email is legal advice" in html, f"{name}: missing footer sentence"


# ── One transport, no boolean swallow ────────────────────────────────

def test_sendgrid_client_touched_only_by_the_one_transport():
    offenders = []
    for path in BACKEND.rglob("*.py"):
        if "tests" in path.parts or path.name == "email.py":
            continue
        if "SendGridAPIClient" in code_only(path.read_text(encoding="utf-8", errors="ignore")):
            offenders.append(str(path.relative_to(BACKEND)))
    assert offenders == [], f"second transport detected: {offenders}"


def test_boolean_send_email_is_dead():
    """The (ok, reason) contract is total: no module defines or imports a
    boolean `send_email` any more."""
    for path in BACKEND.rglob("*.py"):
        if "tests" in path.parts:
            continue
        src = path.read_text(encoding="utf-8", errors="ignore")
        rel = str(path.relative_to(BACKEND))
        assert not re.search(r"^\s*def send_email\(", src, re.M), f"{rel} defines send_email"
        assert not re.search(r"import .*\bsend_email\b(?!_with_reason)", src), \
            f"{rel} imports the dead boolean sender"


def test_dead_modules_stay_deleted():
    assert not (BACKEND / "services/email_service.py").exists()
    assert not (BACKEND / "services/notifications_service.py").exists()


def test_transport_sends_the_plain_text_part():
    src = (BACKEND / "utils/email.py").read_text(encoding="utf-8")
    assert "plain_text_content=text" in src


# ── Orchestration wiring ─────────────────────────────────────────────

def test_admin_new_user_notice_is_defined_and_wired():
    """This import failed silently on every registration since Phase 7."""
    from utils.notifications import notify_new_user_registration  # must exist
    src = (BACKEND / "routers/users_auth.py").read_text(encoding="utf-8")
    assert "notify_new_user_registration" in src
    assert "ADMIN_EMAIL" in src


def test_approval_creates_in_app_record_before_email():
    """The E1 PR's most important line: an approval must be unlosable
    regardless of email transport — the in-app record is written FIRST."""
    src = (BACKEND / "routers/sharing.py").read_text(encoding="utf-8")
    approve_at = src.index("share_approved")
    block = src[src.index("Deed approved: share_id"):src.index("REJECTION PATH")]
    notif_at = block.index("create_notification")
    email_at = block.index("send_share_approved_with_reason")
    assert notif_at < email_at, "in-app approval record must precede the email attempt"
    assert 'ntype="share_approved"' in block


def test_every_sender_returns_reason_tuples():
    """Every sender reaches the one honest transport, and its (ok, reason)
    survives.

    ADMIN3 changed this pin DELIBERATELY, and the reason is the lesson
    from #113: it asserted that each sender's source contained the
    literal `send_email_with_reason(` — the SPELLING of the arrangement,
    not the property. When ADMIN3 put a recording step between the
    senders and the transport, every sender still reached the transport
    and still returned its reason; only the spelling moved. A pin that
    fails on a strictly stronger arrangement is guarding syntax.

    What is asserted now is the property in two halves: each sender goes
    through the single choke point, and that choke point is the only
    thing that touches the transport (pinned in
    test_admin3_email_outcomes.py, which fails if a second call appears).
    """
    import inspect
    from utils import notifications as n
    # `send_email_with_reason` is imported into this namespace and its
    # name starts with "send_", so the old collector swept up the
    # TRANSPORT and asserted the transport called itself — which passed
    # only because its own `def` line contains its own name. Excluded by
    # name: it is the thing being reached, not a thing that reaches.
    TRANSPORT = {"send_email_with_reason"}
    senders = [f for name, f in vars(n).items()
               if callable(f) and name not in TRANSPORT
               and (name.startswith("send_") or name.startswith("notify_"))]
    assert len(senders) >= 9
    for f in senders:
        src = inspect.getsource(f)
        assert "_send(" in src, f"{f.__name__} bypasses the choke point"
    # And the choke point still preserves the reason it was built for.
    choke = inspect.getsource(n._send)
    assert "send_email_with_reason(" in choke
    assert "return ok, reason" in choke


def test_viewed_revoked_expired_stay_email_silent():
    """Owner ruling: these three lifecycle events are deliberately
    email-silent — no renderer exists for them."""
    names = set(vars(email_templates))
    for banned in ["share_viewed", "share_revoked", "share_expired"]:
        assert banned not in names


# ── Regen entrypoint ─────────────────────────────────────────────────

def _regen():
    os.environ["FRONTEND_URL"] = "https://deedpro-frontend-new.vercel.app"
    email_templates.datetime = _FixedDatetime
    SNAP_DIR.mkdir(parents=True, exist_ok=True)
    for name, (subject, html, _text) in _samples().items():
        (SNAP_DIR / f"{name}.html").write_text(
            f"<!-- subject: {subject} -->\n{html}", encoding="utf-8")
        print(f"wrote {name}.html")


if __name__ == "__main__" and "--regen" in sys.argv:
    _regen()
