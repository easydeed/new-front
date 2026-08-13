"""PRICING1 — one price, and only things we can deliver are for sale.

═══ WHAT WAS TRUE BEFORE ═══

The same plan was advertised at two prices at the same time: the
marketing page said Professional **$149/month**, the billing tab said
**$29**. Neither was what Stripe would charge, because the amount billed
comes from a price ID in an environment variable that had no
relationship to either number.

Three sources of truth for one price is a structure, not a typo, and the
structure produces a customer quoted one figure and charged another. So
the surfaces now derive from `frontend/src/lib/pricing.ts` and this file
asserts no second hardcoded price survives.
"""
import re
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

import pytest

REPO = BACKEND.parent
CONFIG = REPO / "frontend" / "src" / "lib" / "pricing.ts"
SURFACES = [
    REPO / "frontend" / "src" / "app" / "page.tsx",
    REPO / "frontend" / "src" / "app" / "account-settings" / "page.tsx",
]


def _config() -> str:
    """The config WITHOUT its prose.

    Eleventh trip: `test_enterprise_is_gone` first read this raw and
    failed on the docstring explaining why Enterprise was deleted. The
    file that documents a removal necessarily names the thing removed.
    """
    return _strip_ts_comments(CONFIG.read_text(encoding="utf-8"))


def _strip_ts_comments(src: str) -> str:
    """Block and line comments out of TSX.

    The Python `code_only` tokenizes PYTHON and cannot help here — the
    lesson TRIAL1 learned twice. Prices are quoted in the comments
    explaining their removal ("Professional at $149 while the billing tab
    said $29"), and a price pin that reads those is the eleventh trip of
    the same family.
    """
    src = re.sub(r"/\*.*?\*/", "", src, flags=re.DOTALL)
    src = re.sub(r"^[^\S\n]*//.*$", "", src, flags=re.MULTILINE)
    return src


# ── 1. One price, everywhere ─────────────────────────────────────────

def test_the_pricing_config_exists_and_is_the_only_place_a_price_is_written():
    assert CONFIG.exists()
    src = _config()
    assert "priceMonthly: 99" in src, "Professional is not $99"


@pytest.mark.parametrize("surface", SURFACES, ids=lambda p: p.name)
def test_no_surface_hardcodes_a_price(surface):
    """THE pin. Not "the two numbers currently agree" — "there is no
    second number to disagree with"."""
    code = _strip_ts_comments(surface.read_text(encoding="utf-8"))
    literals = re.findall(r"[\"'`]\$\d[\d,]*(?:\.\d+)?[\"'`/]", code)
    assert literals == [], (
        f"{surface.name} spells a price itself: {literals}. Prices come "
        f"from lib/pricing.ts — that is the whole ticket.")


@pytest.mark.parametrize("surface", SURFACES, ids=lambda p: p.name)
def test_every_surface_reads_the_config(surface):
    code = _strip_ts_comments(surface.read_text(encoding="utf-8"))
    assert "@/lib/pricing" in code


# A dollar figure is only a PLAN PRICE when it is one. The first cut of
# the sweep below flagged `"transfer_tax": {"amount": "$825.00"}` and
# "County rate: $1.10 per $1,000" in the API documentation — real
# numbers, correct where they are, with nothing to do with what we
# charge. A pin that cries about documentary transfer tax is a pin
# people learn to ignore.
#
# So the property is narrowed to what it always meant: a dollar figure
# presented as a SUBSCRIPTION price — assigned to a price-ish key, or
# sitting next to a billing cadence.
_PLAN_PRICE = re.compile(
    r"""(?:price\w*\s*[:=]\s*[\"'`]?\$?\d)"""
    r"""|(?:\$\d[\d,]*(?:\.\d+)?[^\n]{0,40}?"""
    # No leading \b: the cadence often follows markup ("</span>/month"),
    # where there is no word character to anchor against. Self-tested
    # below, because this exact boundary silently made the sweep blind.
    r"""(?:\bper\s+(?:user\s+)?month\b|/\s*month\b|/\s*mo\b|\ba\s+month\b|\bmonthly\b))""",
    re.IGNORECASE)


def test_no_plan_price_is_written_anywhere_but_the_config():
    """Counted across the whole frontend, not just the two surfaces: a
    third screen quoting a price is the same defect arriving later."""
    hits = []
    for path in (REPO / "frontend" / "src").rglob("*.tsx"):
        if "node_modules" in str(path):
            continue
        code = _strip_ts_comments(path.read_text(encoding="utf-8"))
        for m in _PLAN_PRICE.finditer(code):
            hits.append(f"{path.relative_to(REPO)}: {m.group(0)[:60]}")
    assert hits == [], f"plan-price literals outside the config: {hits}"


def test_the_sweep_would_catch_the_defect_it_was_written_for():
    """The two prices that actually shipped, and the two documentation
    figures that must NOT trip it."""
    assert _PLAN_PRICE.search('price: "$149",')
    assert _PLAN_PRICE.search("<span>$99</span><span>/month</span>")
    assert _PLAN_PRICE.search("$249 per user month")
    assert not _PLAN_PRICE.search('"transfer_tax": { "amount": "$825.00" }')
    assert not _PLAN_PRICE.search("County rate: $1.10 per $1,000 (R&T 11911).")


# ── 2. Tier structure, honestly ──────────────────────────────────────

def test_the_three_tiers_are_free_professional_business():
    keys = re.findall(r"key:\s*'([a-z]+)'", _config())
    assert keys == ["free", "professional", "business"]


def test_enterprise_is_gone_from_the_product():
    """Deleted, not hidden. Its differentiators were SSO/SAML and custom
    branding — zero files each."""
    assert "enterprise" not in _config().lower()

    from routers.users_auth import PAID_PLANS
    assert "enterprise" not in PAID_PLANS

    for surface in SURFACES:
        code = _strip_ts_comments(surface.read_text(encoding="utf-8"))
        assert "Enterprise" not in code, surface.name


def test_business_is_visible_and_not_purchasable():
    """Priced and shown so the ladder is legible; unsellable because the
    multi-user org model it implies (RED-S5) does not exist. `deeds`
    carries one user_id and every query is scoped to it."""
    src = _config()
    business = src[src.index("key: 'business'"):]
    assert "purchasable: false" in business[:400]
    assert "Coming soon" in business[:600]


def test_an_unpurchasable_tier_is_not_a_valid_checkout_plan():
    """The pin that matters more than the badge: a plan key checkout
    accepts is a plan somebody can buy."""
    from routers.users_auth import PAID_PLANS
    assert "business" not in PAID_PLANS
    assert PAID_PLANS == ("professional",)


@pytest.mark.parametrize("surface", SURFACES, ids=lambda p: p.name)
def test_no_surface_renders_a_buy_control_for_an_unpurchasable_tier(surface):
    code = _strip_ts_comments(surface.read_text(encoding="utf-8"))
    assert "purchasable" in code, (
        f"{surface.name} renders tiers without consulting `purchasable` — "
        f"it will offer Business for sale")


# ── 3. A missing price ID fails loudly, never falls back ─────────────

def test_there_is_no_placeholder_price_id():
    """The SECOND independent break the trial audit found: an unset env
    var handed Stripe the literal 'price_professional_default'. A default
    that makes an unconfigured system look configured."""
    from tests.source_text import code_only
    src = code_only(BACKEND / "routers" / "users_auth.py")
    assert "price_professional_default" not in src
    assert "price_enterprise_default" not in src
    assert "STRIPE_ENTERPRISE_PRICE_ID" not in src


def test_a_missing_price_id_names_the_variable():
    from tests.source_text import code_only
    src = code_only(BACKEND / "routers" / "users_auth.py")
    block = src[src.index("price_map = {"):src.index("session = stripe.checkout")]
    assert "503" in block, "an unconfigured service is unavailable, not a bad request"
    assert "PRICE_ID is not set" in block or "_PRICE_ID" in block


def test_the_upgrade_endpoint_refuses_when_billing_is_unconfigured():
    """Executable, not read off the page."""
    import os
    from unittest.mock import patch
    from fastapi import FastAPI, HTTPException
    from fastapi.testclient import TestClient

    import routers.users_auth as ua
    from auth import get_current_user_id

    app = FastAPI()
    app.include_router(ua.router)
    app.dependency_overrides[get_current_user_id] = lambda: 1
    client = TestClient(app, raise_server_exceptions=False)

    from unittest.mock import MagicMock
    conn = MagicMock()
    conn.cursor.return_value.__enter__.return_value.fetchone.return_value = {
        "stripe_customer_id": "cus_x", "email": "a@b.test", "full_name": "A"}

    env = {k: v for k, v in os.environ.items() if k != "STRIPE_PROFESSIONAL_PRICE_ID"}
    with patch.dict(os.environ, env, clear=True):
        # `new=` explicitly: patch.object without it introspects the
        # original, and `db.conn` is a proxy whose whole job is to react
        # to attribute access. See test_the_connection_proxy_* below.
        with patch.object(ua.db, "conn", new=conn):
            resp = client.post("/users/upgrade", json={"plan": "professional"})

    assert resp.status_code == 503, resp.text
    assert "PRICE_ID" in resp.json()["detail"]


def test_an_unknown_plan_is_refused_before_stripe_is_touched():
    from tests.source_text import code_only
    src = code_only(BACKEND / "routers" / "users_auth.py")
    assert "if req.plan not in PAID_PLANS" in src


# ── 4. The instrument count is checked against the registry ──────────

def test_the_advertised_instrument_count_matches_the_catalog():
    """"21 recordable instruments" is a claim on a purchase surface. It
    is counted from the registry rather than by hand, because a number
    that drifts on a pricing page is discovered by a customer."""
    from services.form_families import FAMILY_BY_DEED_TYPE

    # Legacy slug aliases are the same instrument under an older name.
    aliases = {"grant_deed", "quitclaim"}
    actual = len([k for k in FAMILY_BY_DEED_TYPE if k not in aliases])

    claimed = int(re.search(r"INSTRUMENT_COUNT\s*=\s*(\d+)", _config()).group(1))
    assert claimed == actual, (
        f"the pricing surfaces advertise {claimed} instruments; the "
        f"registry has {actual}")


# ── 5. Copy states what is true ──────────────────────────────────────

def test_the_copy_claims_only_things_the_product_does():
    src = _config()
    for truth in ("PCOR", "hash-stamped", "lineage", "confirmed by you"):
        assert truth in src, truth


def test_no_sla_uptime_or_phantom_integration_survives_in_the_pricing_config():
    """The red team called the integration line items the single most
    credible objection in the audit.

    SCOPED TO THE CONFIG, and the reason is worth writing down: a first
    cut ran the rule patterns over the marketing page too and failed on
    the FAQ entry "Does it connect to SoftPro, Qualia, or ResWare?" —
    which carries an explicit `banned-claims: allow` escape because
    naming the systems is what makes the truthful "no" useful.

    That was my test re-implementing rule application and skipping the
    escape handling the real gate has. The surfaces are already covered
    by `scripts/check_banned_claims.py` in CI, honestly, escapes and all.
    What is added here is the new file that gate did not exist to guard.
    """
    sys.path.insert(0, str(REPO / "scripts"))
    import importlib
    gate = importlib.import_module("check_banned_claims")

    hits = [r.name for r in gate.RULES if r.rx.search(_config())]
    assert hits == [], f"the pricing config claims: {hits}"


def test_the_real_gate_passes_over_the_whole_product():
    """And the surfaces, through the gate's own logic rather than a
    lookalike of it."""
    import subprocess
    result = subprocess.run([sys.executable, "scripts/check_banned_claims.py"],
                            cwd=str(REPO), capture_output=True, text=True)
    assert result.returncode == 0, result.stdout + result.stderr


# ── 6. The founding-rate path: Stripe Payment Links ──────────────────
#
# Item 4 of the ticket assumed no code was needed — "BILL1's webhook
# already handles checkout.session.completed correctly" with
# client_reference_id set. Checked against the live handler, and the
# assumption is half right: the reference resolves the USER, but the
# handler also needs `metadata.plan` to know what they bought.
#
# Without it: HTTP 200, plan unchanged, customer charged, nobody told.
# That is the founding-rate flow's silent failure mode, so it is pinned
# from both directions and made loud in the handler.

import os
import pytest as _pytest

needs_db = _pytest.mark.skipif(not os.getenv("DATABASE_URL"), reason="needs a database")


def _fire_checkout(session_obj):
    from unittest.mock import MagicMock, patch
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from sqlalchemy import text
    from phase23_billing.deps import SessionLocal, get_db
    from phase23_billing.router_webhook import router

    se = SessionLocal()
    se.execute(text("DELETE FROM users WHERE email = 'founding@pricing1.test'"))
    se.execute(text(
        "INSERT INTO users (email, password_hash, full_name, role, state, plan) "
        "VALUES ('founding@pricing1.test','x','Founding','escrow_officer','CA','free')"))
    se.commit()
    uid = se.execute(text(
        "SELECT id FROM users WHERE email = 'founding@pricing1.test'")).scalar()

    obj = dict(session_obj)
    obj["client_reference_id"] = str(uid)
    stub = MagicMock()
    stub.Webhook.construct_event.return_value = {
        "type": "checkout.session.completed", "data": {"object": obj}}

    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_db] = lambda: se
    _settings = MagicMock()
    _settings.STRIPE_WEBHOOK_SECRET = 'whsec_test'
    # MONEY1: the secret is set because this test is about what the
    # handler DOES with a verified event. Verification is now two
    # distinct refusals (not configured / mismatched), pinned in
    # test_phase23_webhook.py. Before that split, FIVE test files
    # exercised this endpoint with NO secret — proving handler
    # behaviour in exactly the configuration that refuses every
    # real Stripe event, which is why none of them could catch it.
    with patch("phase23_billing.router_webhook.init_stripe", return_value=stub), \
         patch("phase23_billing.router_webhook.get_settings", return_value=_settings):
        resp = TestClient(app).post("/payments/webhook", json={},
                                    headers={"stripe-signature": "t=1,v1=stub"})
    plan = se.execute(text("SELECT plan FROM users WHERE id = :i"), {"i": uid}).scalar()
    se.execute(text("DELETE FROM users WHERE id = :i"), {"i": uid})
    se.commit()
    se.close()
    return resp, plan


@needs_db
def test_a_payment_link_with_metadata_upgrades_the_user():
    """THE founding-rate path, as it must be configured. A $79 link with
    client_reference_id AND metadata.plan works through the existing
    handler — no code needed, exactly as the ticket expected."""
    resp, plan = _fire_checkout({
        "customer": "cus_founding", "subscription": "sub_founding",
        "metadata": {"plan": "professional"},
    })
    assert resp.status_code == 200
    assert plan == "professional"


@needs_db
def test_a_payment_link_without_metadata_does_not_silently_upgrade(capfd):
    """And the trap. The reference alone resolves the user but not the
    product, so the plan cannot change — and the one thing that must not
    happen is for that to be quiet, because the customer has paid."""
    resp, plan = _fire_checkout({
        "customer": "cus_founding", "subscription": "sub_founding",
        "metadata": {},
    })
    assert resp.status_code == 200, "Stripe must not retry a well-formed event"
    assert plan == "free", "we do not guess which product somebody bought"

    out = capfd.readouterr().out
    assert "PAID BUT NOT UPGRADED" in out
    assert "metadata" in out, "the log must name the fix, not just the symptom"


# ── 7. The proxy answers introspection without raising HTTP ──────────

def test_the_connection_proxy_reports_absent_attributes_as_absent():
    """`db.conn` used to raise HTTPException for EVERY attribute name, so
    any library asking "what kind of object is this?" got an HTTP 500
    from a line that never touched a database.

    `hasattr` only swallows AttributeError, so the exception escaped:
    `unittest.mock.patch.object(db, "conn")` probes `__func__` and then
    `_is_coroutine` and blew up with "Database connection not
    available". It cost a CI run that was green locally — and green
    locally only because an earlier test had left a connection in the
    contextvar, which makes it a failure that depends on test order.
    """
    import db as db_module

    for probe in ("__func__", "_is_coroutine", "__await__", "not_a_real_attr"):
        assert not hasattr(db_module.conn, probe), probe


def test_a_real_attribute_still_resolves_or_fails_loudly(monkeypatch):
    """The half that must NOT be softened — stated as the contract
    actually is, rather than as I first assumed it.

    My first version asserted that touching `db.conn.cursor` outside a
    request always raises 500. It passed without a database and failed
    with one, because `_active()` deliberately falls back to a
    STANDALONE connection when DB_URL is set — that is how scripts and
    the six-flow harness use the module. Asserting a contract I had not
    read is the same error as a pin that guards a spelling.

    The real contract, both halves:

      DB_URL set    a real attribute resolves (standalone fallback)
      DB_URL unset  a real attribute is a loud 500

    Either way an ABSENT attribute is AttributeError, which is the
    change this ticket made and the one the tests above pin.
    """
    from fastapi import HTTPException
    import db as db_module

    # `_active` is the one function the proxy consults, so simulating
    # "no connection" means patching that — NOT the ContextVar's `get`,
    # which a first cut tried and which leaked out of the test and broke
    # six unrelated ones. A test that damages its neighbours is worse
    # than the assertion it was making.
    monkeypatch.setattr(db_module, "_active", lambda: None)
    for real in ("cursor", "commit", "rollback"):
        with pytest.raises(HTTPException) as excinfo:
            getattr(db_module.conn, real)
        assert excinfo.value.status_code == 500, real


def test_patch_object_works_on_the_proxy_both_ways():
    """The thing that actually broke. Pinned in both spellings, because
    the one that failed is the one people reach for first."""
    from unittest.mock import MagicMock, patch
    import db as db_module

    with patch.object(db_module, "conn", new=MagicMock()):
        assert db_module.conn
    with patch.object(db_module, "conn"):
        assert db_module.conn


# ── 8. The gate asserts the property, not the spellings ──────────────

def _gate():
    sys.path.insert(0, str(REPO / "scripts"))
    import importlib
    return importlib.import_module("check_banned_claims")


@pytest.mark.parametrize("claim", [
    # The two that were enumerated...
    "bank-level security",
    "military-grade encryption",
    # ...the third that walked past both and prompted the ruling...
    "Enterprise-grade security",
    # ...and the ones nobody has written yet, which is the point.
    "government-grade protection",
    "hospital-grade privacy",
    "industry-leading security",
    "world-class infrastructure",
    "carrier-class reliability",
])
def test_one_rule_covers_every_spelling_of_the_unearned_grade(claim):
    """Owner-ruled after the enterprise-grade catch: assert the property
    (unearned security framing), not a list of phrasings. Three
    spellings of one claim with two of them enumerated is the pin
    guarding a spelling while the property walks past."""
    assert any(r.rx.search(claim) for r in _gate().RULES), claim


@pytest.mark.parametrize("claim", [
    "security certified by a third party",
    "independently audited security",
    "accredited privacy program",
])
def test_the_audit_half_of_the_property_is_covered_too(claim):
    assert any(r.rx.search(claim) for r in _gate().RULES), claim


@pytest.mark.parametrize("innocent", [
    # Real vocabulary in this domain. A gate that cried about these is a
    # gate people learn to skip.
    "a certified copy of the recorded instrument",
    "Certification of Trust under Probate Code 18100.5",
    "commercial-grade paper stock",
    "the county recorder certified the document",
    "professional liability coverage",
])
def test_the_property_rule_does_not_swallow_real_domain_language(innocent):
    hits = [r.name for r in _gate().RULES if r.rx.search(innocent)]
    assert hits == [], f"{innocent!r} tripped {hits}"


def test_the_enumerated_spellings_were_replaced_not_merely_supplemented():
    """The ruling was to assert the property RATHER THAN enumerate. If
    the old per-phrase rules were still here, the next contributor would
    add a fourth phrase instead of trusting the shape."""
    names = {r.name for r in _gate().RULES}
    assert "bank-level security" not in names
    assert "military-grade" not in names
    assert "enterprise-grade" not in names
    assert "unearned security grade" in names
