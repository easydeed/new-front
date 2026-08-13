"""render.yaml is the environment contract, and something checks it.

═══ THE DEFECT ═══

`FRONTEND_URL` is read in sixteen places. Three are Stripe redirect URLs
written as `os.getenv('FRONTEND_URL', 'http://localhost:3000')`, so an
unset variable sends a paying customer to a page on their own machine —
silently, with nothing raised and nothing logged.

**It appeared in no configuration file in this repository.** Nothing
declared it should exist, so nothing could notice it did not. That is the
defect class this engagement keeps closing: a fact the system depends on,
that nothing checks.

═══ WHAT THESE PINS PROTECT ═══

 1. THE MANIFEST AND render.yaml AGREE. Two declarations of one contract,
    in two files, with nothing comparing them is how eight field names
    drifted in FLOW1 item 0. Every REQUIRED variable is declared in the
    YAML; every variable the YAML declares is classified in the manifest.

 2. A REQUIRED VARIABLE HAS NO PRODUCTION-INVALID DEFAULT. This is the
    sharp one, and it is the pin that would have caught the original:
    `os.getenv('FRONTEND_URL', 'http://localhost:3000')` is not a
    fallback, it is a wrong answer with a straight face. PRICING1 ruled
    the specific case (a placeholder price ID); this is the class.

 3. EVERY CLASSIFICATION CARRIES ITS REASONING. A required/optional split
    without a stated reason is a guess somebody will re-guess
    differently, and the owner ruled the classification must be
    deliberate.

 4. THE REPORT IS UNMISSABLE AND THE REFUSAL IS OPT-IN. Loud by default;
    `STRICT_ENV=1` makes it fatal. The ordering is deliberate — see
    `services/environment.py` — because a process that refuses to start
    on an unverified condition turns a wrong redirect into an outage.
"""
from __future__ import annotations

import re
from pathlib import Path

import pytest

from services import environment as env
from tests.source_text import code_only

BACKEND = Path(__file__).resolve().parents[1]
REPO = BACKEND.parent
RENDER = REPO / "render.yaml"


def _declared_keys() -> set:
    """Keys declared under the main API's envVars.

    Parsed rather than imported: PyYAML would read the commented-out
    STRICT_ENV block as absent, which is correct, and would also make
    this pin depend on a package the gate does not otherwise need.

    `render.yaml` is read RAW and not through `code_only()`, which the
    suite's own meta-pin would otherwise require. It is YAML, not Python;
    `code_only` parses Python and would refuse it, and the `#` lines here
    are the file's reasoning rather than commented-out code. The
    commented STRICT_ENV block is deliberately invisible to this parser —
    that is the pin two tests below.
    """
    text = RENDER.read_text(encoding="utf-8")
    return set(re.findall(r"^\s*-\s*key:\s*([A-Z_0-9]+)\s*$", text, re.M))


# ── 1. The two declarations agree ────────────────────────────────────

def test_every_required_variable_is_declared_in_render_yaml():
    """The pin that would have caught FRONTEND_URL.

    A variable the code requires and no file mentions cannot be missed by
    a human, because there is nothing to read.
    """
    declared = _declared_keys()
    undeclared = [k for k in env.REQUIRED_KEYS if k not in declared]
    assert undeclared == [], (
        "required by the code, declared nowhere: " + ", ".join(undeclared) +
        " — add it to render.yaml (with `sync: false` if the value is a "
        "secret; the NAME is what needs declaring)")


def test_every_declared_variable_is_classified():
    """The other direction. A key in the YAML that the manifest does not
    know about is a variable nobody has decided the importance of."""
    declared = _declared_keys()
    # Build/QA-only keys the process never reads are out of scope for the
    # manifest by design — the manifest is about RUNTIME behaviour.
    build_or_qa = {
        "DYNAMIC_WIZARD_ENABLED", "TEMPLATE_VALIDATION_STRICT",
        "PDF_GENERATION_TIMEOUT", "AI_ASSIST_TIMEOUT",
        "MAX_CONCURRENT_REQUESTS", "BACKEND_LOGGING_LEVEL", "ENVIRONMENT",
        "QA_INSTRUMENTATION_ENABLED", "QA_DETAILED_LOGGING",
        "PERFORMANCE_MONITORING",
    }
    unclassified = [k for k in sorted(declared)
                    if k not in env.BY_KEY and k not in build_or_qa]
    assert unclassified == [], (
        "declared in render.yaml, classified nowhere: " +
        ", ".join(unclassified))


# ── 2. No required variable has a production-invalid default ─────────

LOCALHOST = re.compile(r"localhost|127\.0\.0\.1", re.I)


def _python_sources():
    for path in BACKEND.rglob("*.py"):
        if {"tests", "__pycache__", "venv", ".venv", "scripts"} & set(path.parts):
            continue
        yield path


def test_no_required_variable_falls_back_to_localhost():
    """THE PIN THAT MATTERS.

    `os.getenv('FRONTEND_URL', 'http://localhost:3000')` is not a
    fallback. It is a wrong answer delivered with a straight face, on a
    path that ends at a customer's card being charged.

    Matched as the SHAPE — any required key read with a localhost default
    — rather than as the one spelling, because the next one will be
    written by somebody who never read this file.
    """
    pattern = re.compile(
        r"getenv\(\s*['\"](" + "|".join(env.REQUIRED_KEYS) + r")['\"]\s*,\s*([^)]*)\)")
    offenders = []
    for path in _python_sources():
        src = code_only(path)
        for match in pattern.finditer(src):
            if LOCALHOST.search(match.group(2)):
                line = src[: match.start()].count("\n") + 1
                offenders.append(
                    f"{path.relative_to(BACKEND)}:{line} → {match.group(1)}")
    assert offenders == [], (
        "a REQUIRED variable falls back to a localhost URL: " +
        "; ".join(offenders) + " — in production that is a confidently "
        "wrong answer, not a default. Fail loudly with a named reason.")


# ── 3. Every classification carries its reasoning ────────────────────

@pytest.mark.parametrize("var", env.MANIFEST, ids=lambda v: v.key)
def test_every_variable_states_what_breaks(var):
    """Owner-ruled: classify deliberately and record the reasoning.

    A classification without a reason is a guess somebody will re-guess
    differently — and the two directions of that guess are "an outage
    nobody wanted" and "a silent wrong answer nobody caught".
    """
    assert var.level in (env.REQUIRED, env.OPTIONAL)
    assert len(var.consequence) > 60, (
        f"{var.key}'s reasoning is too short to be reasoning")
    # It says what HAPPENS, not what the variable is for.
    assert not var.consequence.lower().startswith("used by"), (
        f"{var.key} describes its purpose rather than its absence")


def test_every_required_variable_is_actually_read_by_something():
    """THE PIN THIS FILE WAS MISSING, added because it was needed.

    `ALLOWED_ORIGINS` sat here classified REQUIRED, with a consequence
    describing a CORS failure, for the whole life of #166. **Nothing read
    it.** `main.py` hardcodes its origin list and the name appeared in
    exactly one place in the backend: the manifest declaring it required.

    The cost was not theoretical. The boot check named it missing on the
    first production deploy, and the owner set it on the strength of that
    — an action taken on a claim this file made and could not support.

    A manifest is a set of assertions about the running system. This is
    the one that checks the assertions are about something.
    """
    sources = {}
    for path in BACKEND.rglob("*.py"):
        if {"tests", "__pycache__", "venv", ".venv"} & set(path.parts):
            continue
        if path.name == "environment.py":
            continue        # the declaration is not a reading
        sources[path] = code_only(path)

    unread = [key for key in env.REQUIRED_KEYS
              if not any(key in src for src in sources.values())]
    assert unread == [], (
        "declared REQUIRED and read by nothing: " + ", ".join(unread) +
        " — either wire it up or reclassify it. A variable whose absence "
        "changes no behaviour is not required, whatever the manifest says, "
        "and somebody will act on this file believing otherwise.")


def test_the_required_set_is_the_silent_ones():
    """The test is not importance — it is whether absence is SILENT and
    WRONG. A missing ADMIN_EMAIL loses a notification; a missing
    FRONTEND_URL produces a confidently wrong redirect."""
    assert "FRONTEND_URL" in env.REQUIRED_KEYS

    # MONEY1 — ADDED BECAUSE A MUTATION PROBE FOUND NOTHING HELD IT.
    #
    # This sat OPTIONAL, on reasoning that was right about security and
    # wrong about availability: "the webhook path already refuses
    # unverified payloads, so the failure is closed, not silent."
    # Closed-failure means a forged payload cannot fake an upgrade. It
    # equally means every LEGITIMATE Stripe event is refused, so a
    # customer is charged and stays on the free plan.
    #
    # The classification defeated the mechanism built to catch exactly
    # this — the boot report names missing REQUIRED variables, and this
    # one told it not to look. Reverting it to OPTIONAL passed the whole
    # file until this line existed.
    #
    # The inversion is the lesson: ALLOWED_ORIGINS was marked REQUIRED
    # and read by nothing; this was marked OPTIONAL and the paid path
    # depends on it. Both are a classification asserted rather than
    # checked.
    assert "STRIPE_WEBHOOK_SECRET" in env.REQUIRED_KEYS, (
        "the webhook secret is optional again — without it every Stripe "
        "event is refused and paid upgrades silently never happen")
    assert "STRIPE_PROFESSIONAL_PRICE_ID" in env.REQUIRED_KEYS
    assert "ADMIN_EMAIL" in env.OPTIONAL_KEYS
    assert "SENDGRID_API_KEY" in env.OPTIONAL_KEYS


# ── 4. Loud by default, fatal by choice ──────────────────────────────

def test_a_missing_required_variable_is_reported_by_name():
    text = env.report({"DATABASE_URL": "x", "JWT_SECRET_KEY": "x",
                       "STRIPE_SECRET_KEY": "x",
                       "STRIPE_PROFESSIONAL_PRICE_ID": "x",
                       "ALLOWED_ORIGINS": "x"})
    assert "FRONTEND_URL" in text
    assert "MISSING REQUIRED" in text
    # And it says what goes wrong, not just that something is absent.
    assert "customer pays" in text


def test_a_complete_environment_reports_nothing():
    full = {v.key: "x" for v in env.MANIFEST}
    assert env.report(full) == ""


def test_a_blank_value_counts_as_missing():
    """`FRONTEND_URL=` in a dashboard is not a value, and a check that
    accepts it is a check that passes on the defect."""
    partial = {v.key: "x" for v in env.MANIFEST}
    partial["FRONTEND_URL"] = "   "
    assert "FRONTEND_URL" in env.report(partial)


def test_strict_mode_refuses_and_is_off_by_default(monkeypatch):
    """The refusal is opt-in until production is verified.

    A process that refuses to start on a condition nobody has checked
    turns a wrong redirect into an outage — the fix causing a worse
    incident than the defect.
    """
    monkeypatch.delenv("STRICT_ENV", raising=False)
    assert env.strict() is False

    incomplete = {v.key: "x" for v in env.MANIFEST}
    del incomplete["FRONTEND_URL"]
    # Loud, but it returns.
    assert [v.key for v in env.check(incomplete)] == ["FRONTEND_URL"]

    monkeypatch.setenv("STRICT_ENV", "1")
    assert env.strict() is True
    with pytest.raises(env.EnvironmentError_) as raised:
        env.check(incomplete)
    assert "FRONTEND_URL" in str(raised.value)


def test_strict_env_is_declared_but_not_switched_on():
    """The stronger form is one uncommented line away, and the line is
    there so nobody has to invent it — but it stays off until the ticket
    that verifies production turns it on."""
    text = RENDER.read_text(encoding="utf-8")
    assert "STRICT_ENV" in text
    assert re.search(r"^\s*#\s*-\s*key:\s*STRICT_ENV", text, re.M), (
        "STRICT_ENV is live in render.yaml — if production has been "
        "verified, say so in the PR that switches it on")


def test_the_api_checks_its_environment_at_boot():
    src = code_only(BACKEND / "main.py")
    assert "from services.environment import check" in src
    assert "_check_environment()" in src
    # Before the app exists, so the block is at the top of the log rather
    # than buried under router-mount chatter.
    assert src.index("_check_environment()") < src.index("app = FastAPI(")
