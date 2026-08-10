"""TRIAL1 — a user can actually pay us.

Before this ticket the paid path was dead at step one and nothing said
so. `/users/upgrade` destructured a HybridRow, `customer_id` became the
string 'stripe_customer_id' (truthy), so the Stripe customer was never
created and Checkout was called with `customer='stripe_customer_id'`.
Every upgrade attempt returned 400. The webhook half was sound and
unreachable — BILL1's pins were green the whole time, because they start
at the webhook and the break was upstream of it.

That is the shape this file exists to prevent: two correct halves with
nothing pinning the join. So the load-bearing test here runs the WHOLE
path — upgrade call → checkout session → webhook → plan on the row.
"""
import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import text

from tests.source_text import code_only  # noqa: E402

REPO = BACKEND.parent
LIVE_DB = os.getenv("DATABASE_URL")
needs_db = pytest.mark.skipif(not LIVE_DB, reason="needs a database")

TEST_EMAIL = "trial1@paidpath.test"
CUSTOMER_ID = "cus_trial1_created"


# ── 1. The trial exists, and its length is not two numbers ───────────

def test_the_checkout_session_carries_a_trial():
    src = code_only(BACKEND / "routers" / "users_auth.py")
    assert "trial_period_days" in src
    assert "subscription_data" in src


def test_the_advertised_trial_length_matches_the_one_we_charge_on():
    """THE mirror. A "14-day trial" in the copy and a 7-day trial on the
    session is a promise the customer discovers is broken on day 8 — by
    being charged. Same class as the DTT rate mirror: two numbers that
    must be one number.
    """
    from routers.users_auth import TRIAL_PERIOD_DAYS

    import re
    page = (REPO / "frontend" / "src" / "app" / "page.tsx").read_text(encoding="utf-8")
    claimed = {int(n) for n in re.findall(r"(\d+)[\s-]day trial", page, re.I)}
    assert claimed, "the marketing page no longer states a trial length"
    assert claimed == {TRIAL_PERIOD_DAYS}, (
        f"the page advertises {sorted(claimed)}-day trial(s); the server "
        f"opens Checkout with trial_period_days={TRIAL_PERIOD_DAYS}")


def test_the_trial_can_be_turned_off_without_a_deploy():
    src = code_only(BACKEND / "routers" / "users_auth.py")
    assert "STRIPE_TRIAL_PERIOD_DAYS" in src
    assert "if trial_days > 0 else {}" in src


# ── 2. One plan vocabulary ───────────────────────────────────────────

def _quoted_values(src: str, key: str):
    """Every `key: "value"` / `key="value"` literal in a TSX file.

    STRUCTURAL ON PURPOSE, and this is the ninth and tenth trip of the
    family the code_only docs describe — walked into while implementing
    the note about it, which is the most honest possible demonstration
    that the rule is not obvious.

    Both this test and the "5 deeds/month" one below first read the TSX
    RAW and failed on the comments explaining the removals. The Python
    `code_only` cannot help: it tokenizes PYTHON, and a `//` comment in a
    .tsx file is not a Python comment, so passing TS source through it
    changes nothing.

    So neither test asks "does this string appear in the file". They ask
    what the VALUES are — prose cannot forge a `key: "..."` literal, and
    the next person to write an explanatory comment here will not have to
    rediscover any of this.
    """
    import re
    return re.findall(rf'{key}\s*[:=]\s*[\'"]([^\'"]+)[\'"]', src)


def test_the_free_plan_has_exactly_one_name():
    """'free' is what the database stores; 'starter' lived only in the
    billing UI and matched nothing, so every free user's plan card
    rendered a blank name over a blank price."""
    from routers.users_auth import FREE_PLAN, PAID_PLANS
    assert FREE_PLAN == "free"

    billing = (REPO / "frontend" / "src" / "app" / "account-settings" /
               "page.tsx").read_text(encoding="utf-8")
    # Scoped to the PLANS array. A first cut read `key:` across the whole
    # file and swept up React `key={...}` props and notification
    # preference keys — a pin that reports 'marketing' as a pricing tier
    # is noise, and noise is how a real failure gets skimmed past.
    import re
    block = re.search(r"const plans = \[(.*?)\n  \]", billing, re.S)
    assert block, "the plans array moved — re-scope this pin"
    keys = set(_quoted_values(block.group(1), "key"))
    assert keys == {FREE_PLAN, *PAID_PLANS}, (
        f"the billing tab offers plan keys the product does not know: {keys}")

    admin = (REPO / "frontend" / "src" / "app" / "admin" / "users" / "[id]" /
             "page.tsx").read_text(encoding="utf-8")
    options = set(_quoted_values(admin, "value"))
    assert "starter" not in options, (
        "an admin can still set a plan key nothing else recognises")


def test_the_billing_tab_can_find_the_plan_the_database_stores():
    """The exact break: `currentPlan` defaulted to "starter", the guard
    read `!== "starter"`, and `plans.find(key === 'free')` was undefined."""
    src = code_only((REPO / "frontend" / "src" / "app" / "account-settings" /
                     "page.tsx").read_text(encoding="utf-8"))
    assert 'userProfile?.plan || "free"' in src
    assert 'key: "free"' in src


# ── 3. Dunning runs on the renewal event ─────────────────────────────

def test_the_renewal_failure_event_is_handled_at_all():
    """`payment_intent.payment_failed` is the wrong event for a
    subscription — it wrote a payment_history row with user_id NULL and
    told nobody. `invoice.payment_failed` carries the customer."""
    src = code_only(BACKEND / "phase23_billing" / "router_webhook.py")
    assert 'etype == "invoice.payment_failed"' in src


def test_the_handler_resolves_a_real_user_and_emails_through_the_one_transport():
    src = code_only(BACKEND / "phase23_billing" / "router_webhook.py")
    handler = src[src.index('etype == "invoice.payment_failed"'):
                  src.index('etype == "payment_intent.payment_failed"')]
    assert "_resolve_user_id" in handler, "a failure nobody can attribute"
    assert "send_payment_failed_with_reason" in handler
    assert ":uid" in handler, "the payment_history row must carry the user"


def test_notifying_never_makes_stripe_retry_an_event_we_recorded():
    src = code_only(BACKEND / "phase23_billing" / "router_webhook.py")
    handler = src[src.index('etype == "invoice.payment_failed"'):
                  src.index('etype == "payment_intent.payment_failed"')]
    assert "except Exception" in handler


def test_the_template_goes_through_the_e1_choke_point():
    from utils.notifications import TEMPLATES
    assert "payment_failed" in TEMPLATES
    src = code_only(BACKEND / "utils" / "notifications.py")
    assert '_send("payment_failed"' in src


def test_the_email_does_not_threaten_an_account_that_is_still_live():
    """Stripe retries. At this point the account is untouched, and an
    email implying otherwise turns an expired card into a support call."""
    from utils import email_templates
    subject, html, textbody = email_templates.payment_failed(
        "Dana", " of $29.00", "https://example.test/account-settings")
    assert "unaffected" in textbody
    for word in ("suspended", "cancelled", "canceled", "terminated", "deleted"):
        assert word not in textbody.lower(), word


# ── 4. Feature claims are gated like compliance claims ───────────────

@pytest.mark.parametrize("claim", [
    "SSO/SAML", "single sign-on", "Custom branding", "white-label",
    "team management",
])
def test_the_banned_claims_gate_now_covers_feature_claims(claim, tmp_path):
    """The gate shipped guarding certifications, so a pricing page could
    say "SSO/SAML" — zero files implement it — and pass cleanly while
    "SOC 2" failed. Both are things a buyer pays for and does not
    receive; the rule had been drawn around the examples that prompted
    it rather than around the property."""
    sys.path.insert(0, str(REPO / "scripts"))
    import importlib
    mod = importlib.import_module("check_banned_claims")
    hits = [r.name for r in mod.RULES if r.rx.search(claim)]
    assert hits, f"{claim!r} passes the gate"


def test_the_claims_are_actually_absent_from_the_product():
    """A gate is only honest if the thing it forbids is also gone."""
    import re
    page = (REPO / "frontend" / "src" / "app" / "page.tsx").read_text(encoding="utf-8")
    listed = []
    for block in re.findall(r"features:\s*\[(.*?)\]", page, re.S):
        listed += re.findall(r"[\'\"]([^\'\"]+)[\'\"]", block)
    assert listed, "no feature lists found on the marketing page"
    for claim in ("SSO", "SAML", "custom branding", "deeds/month"):
        hits = [f for f in listed if claim.lower() in f.lower()]
        assert hits == [], f"still advertised: {hits}"


def test_the_unenforced_limit_is_gone_from_both_purchase_surfaces():
    """`check_plan_limits` has zero call sites and `plan_limits` is never
    seeded at boot, so "5 deeds/month" was never enforced. An unenforced
    limit on a purchase surface is a promise we are not keeping — in our
    favour, which is the harmless direction and still not something to
    leave written down."""
    import re
    for rel in (("app", "page.tsx"), ("app", "account-settings", "page.tsx")):
        src = (REPO / "frontend" / "src").joinpath(*rel).read_text(encoding="utf-8")
        # The FEATURE LISTS, not the file — see _quoted_values above for
        # why these tests read values rather than text.
        for block in re.findall(r"features:\s*\[(.*?)\]", src, re.S):
            listed = re.findall(r"[\'\"]([^\'\"]+)[\'\"]", block)
            offenders = [f for f in listed if re.search(r"deeds\s*/\s*month", f, re.I)]
            assert offenders == [], f"{rel[-1]} still advertises {offenders}"


# ── 5. END TO END: the join BILL1's pins could not see ───────────────

@needs_db
def test_a_user_reaches_checkout_with_a_real_customer_id_and_the_webhook_upgrades_them():
    """THE test. Upgrade → session → webhook → plan on the row.

    Stripe is stubbed at the SDK boundary and nowhere else: the real
    endpoint runs, the real row is read, the real webhook handler
    executes against the real table. What is asserted is what Stripe was
    ASKED for — because the bug was entirely in the asking.
    """
    from phase23_billing.deps import SessionLocal
    from phase23_billing.router_webhook import router as webhook_router
    from routers.users_auth import TRIAL_PERIOD_DAYS

    session = SessionLocal()
    session.execute(text("DELETE FROM users WHERE email = :e"), {"e": TEST_EMAIL})
    session.execute(text("""
        INSERT INTO users (email, password_hash, full_name, role, state, plan)
        VALUES (:e, 'x', 'Trial Tester', 'escrow_officer', 'CA', 'free')
    """), {"e": TEST_EMAIL})
    session.commit()
    uid = session.execute(text("SELECT id FROM users WHERE email = :e"),
                          {"e": TEST_EMAIL}).scalar()

    # ── the upgrade call ──
    import routers.users_auth as ua
    from auth import get_current_user_id

    captured = {}

    def _session_create(**kwargs):
        captured.update(kwargs)
        return MagicMock(url="https://checkout.stripe.test/s/x", id="cs_trial1")

    app = FastAPI()
    app.include_router(ua.router)
    app.dependency_overrides[get_current_user_id] = lambda: uid
    client = TestClient(app)

    with patch.object(ua.stripe.Customer, "create",
                      return_value=MagicMock(id=CUSTOMER_ID)) as mk_cust, \
         patch.object(ua.stripe.checkout.Session, "create", side_effect=_session_create), \
         patch.dict(os.environ, {"STRIPE_PROFESSIONAL_PRICE_ID": "price_test_pro"}):
        resp = client.post("/users/upgrade", json={"plan": "professional"})

    assert resp.status_code == 200, resp.text
    assert resp.json()["session_url"].startswith("https://checkout.stripe.test")

    # The customer was CREATED — the branch the unpack bug skipped.
    assert mk_cust.called, (
        "no Stripe customer was created; `if not customer_id` took the "
        "wrong branch, which is exactly the original defect")

    # And Checkout was asked for a real customer, not a column name.
    assert captured["customer"] == CUSTOMER_ID
    assert captured["customer"] != "stripe_customer_id"
    assert captured["client_reference_id"] == str(uid)
    assert captured["metadata"]["plan"] == "professional"
    assert captured["subscription_data"]["trial_period_days"] == TRIAL_PERIOD_DAYS

    # And it was persisted, so the portal and the webhook can find them.
    stored = session.execute(
        text("SELECT stripe_customer_id FROM users WHERE id = :i"), {"i": uid}).scalar()
    assert stored == CUSTOMER_ID

    # ── the webhook half ──
    event = {"type": "checkout.session.completed", "data": {"object": {
        "client_reference_id": str(uid),
        "metadata": {"plan": "professional", "user_id": str(uid)},
        "customer": CUSTOMER_ID,
        "subscription": "sub_trial1",
    }}}
    stub = MagicMock()
    stub.Webhook.construct_event.return_value = event

    wapp = FastAPI()
    wapp.include_router(webhook_router)
    wapp.dependency_overrides[
        __import__("phase23_billing.deps", fromlist=["get_db"]).get_db] = lambda: session
    with patch("phase23_billing.router_webhook.init_stripe", return_value=stub):
        wr = TestClient(wapp).post("/payments/webhook", json={},
                                   headers={"stripe-signature": "t=1,v1=stub"})
    assert wr.status_code == 200, wr.text

    plan = session.execute(text("SELECT plan FROM users WHERE id = :i"),
                           {"i": uid}).scalar()
    assert plan == "professional", (
        "the webhook did not upgrade the user — the half BILL1 pinned "
        "was fine; this asserts the join")

    session.execute(text("DELETE FROM users WHERE email = :e"), {"e": TEST_EMAIL})
    session.commit()
    session.close()
