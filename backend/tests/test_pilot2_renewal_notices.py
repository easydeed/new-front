"""PILOT2 — nobody is charged without being told first.

═══ WHAT THIS PINS, AND WHY EACH ONE IS HERE ═══

The date. Two of the three candidates were wrong and one of them is
wrong in a way that would have been WORSE than silence:
`current_period_end` on a 3×monthly 100%-off coupon is the next invoice
date, one month out, for a $0 invoice — three "you will be charged"
notices before the one that is true. So the first group below asserts
that a zero invoice produces NO notice, which is the property that makes
the coupon path safe.

The schedule. A daily job misses days, so the windows are AT OR INSIDE
rather than exactly-N, and a run that finds both windows open sends the
tightest and records the other as superseded rather than sending two
emails a minute apart.

The discipline. Nothing persisted is ever read back as an input:
`renewal_at` is written after the decision, from what Stripe said, and
the decision is made from the live answer every time.
"""
from __future__ import annotations

import os
from datetime import date

import pytest

#: The suite runs in TWO jobs: one with a Postgres service and one
#: without. The convention every DB-backed test here follows is to skip
#: rather than fail when there is no database — the no-Postgres job is a
#: real gate for everything else, and a test that cannot run must not
#: turn it red. Caught by CI, which is where it should have been caught,
#: but it should have been written this way.
needs_db = pytest.mark.skipif(not os.getenv("DATABASE_URL"),
                              reason="live test DB required")

from services import renewal_notice as rn


# ── The decision ─────────────────────────────────────────────────────

def charge(days_out: int, amount: int = 24900, today: date = date(2026, 9, 1)):
    return rn.UpcomingCharge(charge_date=date.fromordinal(today.toordinal() + days_out),
                             amount_cents=amount, currency="usd")


TODAY = date(2026, 9, 1)


@pytest.mark.parametrize("days_out,expected", [
    (40, None),               # nothing is due yet
    (16, None),               # one day before the first window opens
    (15, "renewal_15day"),    # AT the threshold, not merely inside it
    (14, "renewal_15day"),
    (6, "renewal_15day"),
    (5, "renewal_5day"),      # the tighter window takes over
    (1, "renewal_5day"),
    (0, "renewal_5day"),      # the morning of the charge
])
def test_which_notice_is_due(days_out, expected):
    assert rn.decide(charge(days_out), TODAY).send == expected


def test_a_zero_invoice_produces_no_notice():
    """THE PIN THE COUPON PATH RESTS ON.

    During the discounted months the next invoice is $0. A notice fired
    off `current_period_end` would announce a charge on each of them —
    three false alarms before the real one, which is worse than sending
    nothing, because the fourth arrives with the credibility of the
    three that did not happen.
    """
    decision = rn.decide(charge(3, amount=0), TODAY)
    assert decision.send is None
    assert "zero" in decision.reason


def test_no_charge_means_no_guess():
    """Stripe unreachable, no preview, no answer — and no email.

    A failure never becomes a date (MONEY1). The reason is carried so the
    run report can say why somebody was not written to.
    """
    decision = rn.decide(None, TODAY)
    assert decision.send is None
    assert decision.reason


def test_a_past_charge_date_is_not_announced():
    assert rn.decide(charge(-1), TODAY).send is None


def test_a_notice_already_recorded_is_not_repeated():
    assert rn.decide(charge(14), TODAY, recorded=["renewal_15day"]).send is None
    assert rn.decide(charge(3), TODAY, recorded=["renewal_5day"]).send is None


def test_a_missed_run_still_sends_the_notice_it_can_still_mean():
    """A daily job WILL miss a day.

    Exactly-N windows would drop the notice silently and the failure
    would be indistinguishable from it never being due. At-or-inside
    means the notice is still owed — and the run sends the TIGHT one,
    recording the wide one as superseded rather than sending two emails
    a minute apart that say the same thing.
    """
    decision = rn.decide(charge(4), TODAY)   # cron down through day 15..5
    assert decision.send == "renewal_5day"
    assert decision.supersede == ("renewal_15day",)


def test_the_superseded_notice_is_not_left_to_fire_later():
    """Once superseded and recorded, it is not due again."""
    after = rn.decide(charge(3), TODAY, recorded=["renewal_5day", "renewal_15day"])
    assert after.send is None


# ── Reading Stripe ───────────────────────────────────────────────────

class FakeInvoiceAPI:
    def __init__(self, preview=None, raises=None):
        self._preview, self._raises = preview, raises
        self.calls = []

    def create_preview(self, **kwargs):
        self.calls.append(kwargs)
        if self._raises:
            raise self._raises
        return self._preview


class FakeStripe:
    VERSION = "12.3.0"

    def __init__(self, **kw):
        self.Invoice = FakeInvoiceAPI(**kw)


def test_the_amount_and_date_come_from_the_invoice_preview():
    """One object, computed by Stripe with the discount applied.

    `next_payment_attempt` is preferred over `period_end`: it is when
    Stripe will attempt the card, which is the date the customer's
    statement will show.
    """
    stripe = FakeStripe(preview={
        "amount_due": 24900, "currency": "usd",
        "next_payment_attempt": 1788480000,  # 2026-09-04Z
        "period_end": 1790000000,
    })
    found, why = rn.upcoming_charge(stripe, "sub_123")
    assert why == "ok"
    assert found.amount_cents == 24900
    assert found.charge_date == date(2026, 9, 4)
    assert stripe.Invoice.calls == [{"subscription": "sub_123"}]


def test_a_stripe_failure_never_becomes_a_date():
    stripe = FakeStripe(raises=RuntimeError("connection reset"))
    found, why = rn.upcoming_charge(stripe, "sub_123")
    assert found is None
    assert "connection reset" in why


def test_the_sdk_operation_is_the_one_this_sdk_actually_has():
    """`Invoice.upcoming` is the method every example uses, and it does
    not exist in the pinned SDK — the operation is `create_preview`.

    Pinned against the INSTALLED stripe module rather than a fake,
    because the failure mode is version drift: calling the absent method
    raises AttributeError, which an `except Exception` around a billing
    call would quietly turn into "no upcoming invoice" and a customer
    charged with no warning.
    """
    import stripe as real_stripe
    assert hasattr(real_stripe.Invoice, "create_preview"), (
        "the SDK's invoice-preview operation has moved again — "
        "services/renewal_notice.py must be updated with it"
    )


def test_a_preview_without_a_payment_date_is_refused():
    stripe = FakeStripe(preview={"amount_due": 24900, "currency": "usd"})
    found, why = rn.upcoming_charge(stripe, "sub_123")
    assert found is None
    assert "payment date" in why


# ── What the customer reads ──────────────────────────────────────────

def test_the_amount_is_exact():
    """A notice quoting $249 for a $249.37 charge is a small lie that
    arrives on somebody's bank statement."""
    assert rn.amount_text(24937) == "$249.37"
    assert rn.amount_text(24900) == "$249.00"


def test_the_date_is_a_date_and_not_a_duration():
    """Owner-ruled: trial copy states the date, not the number of days.
    A duration has to be counted from something the reader remembers."""
    assert rn.date_text(date(2026, 9, 4)) == "4 September 2026"


def test_the_link_lands_on_the_cancel_control(monkeypatch):
    """NOT a Stripe portal session URL, and the reason is the ticket's
    own timescale: those links expire, and a 15-day notice is by
    definition read late. This lands on PILOT1's ungated cancel control,
    which mints a fresh session on click."""
    monkeypatch.setenv("FRONTEND_URL", "https://deedpro.io")
    assert rn.billing_url() == "https://deedpro.io/account-settings?tab=billing"


def test_the_email_says_the_date_the_amount_and_the_way_out():
    from utils import email_templates
    subject, html, text = email_templates.renewal_notice(
        "Dana", "4 September 2026", "$249.00",
        "https://deedpro.io/account-settings?tab=billing", "5 days from today")
    for needed in ("4 September 2026", "$249.00", "account-settings?tab=billing"):
        assert needed in html
        assert needed in text or needed in subject or needed in text
    assert "4 September 2026" in subject


def test_the_email_does_not_try_to_change_her_mind():
    """It is not a retention email. A message whose whole purpose is that
    nobody is surprised must not also be arguing a side."""
    from utils import email_templates
    _, html, text = email_templates.renewal_notice(
        "Dana", "4 September 2026", "$249.00", "https://x/y", "5 days from today")
    for pitch in ("hate to see you go", "special offer", "discount if you stay",
                  "are you sure"):
        assert pitch not in html.lower()
        assert pitch not in text.lower()


def test_the_notice_kinds_are_real_template_names():
    """§14.3-adjacent: `email_log.template` is the record somebody counts,
    and a name that is not in the TEMPLATES tuple is vocabulary drift in
    a log that is supposed to be stable."""
    from utils.notifications import TEMPLATES
    for kind in rn.NOTICE_KINDS:
        assert kind in TEMPLATES


def test_an_unknown_notice_kind_is_refused_rather_than_logged():
    from utils.notifications import send_renewal_notice_with_reason
    ok, reason = send_renewal_notice_with_reason(
        "a@b.c", "Dana", "renewal_99day", "4 September 2026", "$249.00",
        "https://x/y", "99 days")
    assert ok is False
    assert "renewal_99day" in reason


# ── The webhook's second signal ──────────────────────────────────────

def test_trial_will_end_is_handled_rather_than_silently_accepted():
    """It used to fall through every branch and return a bare 200 —
    indistinguishable, from Stripe's side, from being handled."""
    from tests.source_text import code_only
    from pathlib import Path
    src = code_only(Path(__file__).resolve().parents[1]
                    .joinpath("phase23_billing/router_webhook.py").read_text())
    assert 'etype == "customer.subscription.trial_will_end"' in src
    assert "_run_renewal_notice_for" in src


def test_trial_end_is_persisted_and_not_coalesced():
    """When a trial converts, Stripe sends `trial_end: null` and that
    null IS the fact. COALESCE would keep the old date forever and leave
    the record claiming a trial ends on a day that has passed — the same
    shape as every stale-record finding in the ledger."""
    from tests.source_text import code_only
    from pathlib import Path
    src = code_only(Path(__file__).resolve().parents[1]
                    .joinpath("phase23_billing/router_webhook.py").read_text())
    assert "trial_end = EXCLUDED.trial_end" in src
    assert "trial_end = COALESCE" not in src


# ── The job ──────────────────────────────────────────────────────────

def test_the_script_asserts_its_database_and_its_stripe_key():
    """Precedent: `purge_signer_contact.py`. EXPECTED_DATABASE matters
    here for a different irreversible act — that job deletes rows, this
    one sends mail to real people about money."""
    from tests.source_text import code_only
    from pathlib import Path
    src = code_only(Path(__file__).resolve().parents[1]
                    .joinpath("scripts/send_renewal_notices.py").read_text())
    assert "expected_database()" in src
    assert "assert_tables(" in src
    assert "STRIPE_SECRET_KEY" in src
    assert "--dry-run" in src


def test_a_failed_send_is_a_failed_run():
    """A cron that exits 0 while nobody was told is the shape this ticket
    exists to remove."""
    from tests.source_text import code_only
    from pathlib import Path
    src = code_only(Path(__file__).resolve().parents[1]
                    .joinpath("scripts/send_renewal_notices.py").read_text())
    assert "return 1 if report.failed else 0" in src


# ── The run, against a real database ─────────────────────────────────
#
# Everything above is the decision in isolation. This is the loop that
# uses it: who gets asked about, what gets recorded, and — the property
# the whole design rests on — that the persisted date is written AFTER
# the decision and never read back into one.

def _db():
    import os
    import psycopg2
    from db_rows import ROW_FACTORY
    return psycopg2.connect(os.environ["DATABASE_URL"], cursor_factory=ROW_FACTORY)


def _make_subscriber(conn, email: str, sid: str, status: str = "active"):
    with conn.cursor() as cur:
        cur.execute("DELETE FROM billing_notices WHERE stripe_subscription_id = %s", (sid,))
        cur.execute("DELETE FROM subscriptions WHERE stripe_subscription_id = %s", (sid,))
        cur.execute("DELETE FROM users WHERE email = %s", (email,))
        cur.execute(
            "INSERT INTO users (email, password_hash, full_name, is_active, plan) "
            "VALUES (%s, 'x', %s, TRUE, 'professional') RETURNING id",
            (email, "Dana Officer"))
        user_id = dict(cur.fetchone())["id"]
        cur.execute(
            "INSERT INTO subscriptions (user_id, stripe_subscription_id, status, "
            "plan_name) VALUES (%s, %s, %s, 'professional')",
            (user_id, sid, status))
    conn.commit()
    return user_id


class Recorder:
    """A sender that records rather than sends."""

    def __init__(self, ok=True, reason=""):
        self.calls, self.ok, self.reason = [], ok, reason

    def __call__(self, email, name, kind, charge_text, amount, url, days, user_id=None):
        self.calls.append({"email": email, "kind": kind, "charge_text": charge_text,
                           "amount": amount, "url": url, "days": days})
        return self.ok, self.reason


@needs_db
def test_the_run_sends_once_and_records_what_it_sent():
    conn = _db()
    try:
        user_id = _make_subscriber(conn, "pilot2.run@example.com", "sub_pilot2_run")
        stripe = FakeStripe(preview={
            "amount_due": 24900, "currency": "usd",
            "next_payment_attempt": int(__import__("datetime").datetime(
                2026, 9, 10, tzinfo=__import__("datetime").timezone.utc).timestamp()),
        })
        sender = Recorder()
        report = renewal_run(conn, stripe, date(2026, 9, 1), sender)
        # Asserted against THIS subscriber rather than the run totals:
        # `run()` sweeps every live subscription in the database, and
        # other tests leave their own behind.
        mine = [c for c in sender.calls if c["email"] == "pilot2.run@example.com"]
        assert report.sent >= 1
        assert len(mine) == 1
        assert mine[0]["kind"] == "renewal_15day"
        assert mine[0]["amount"] == "$249.00"
        assert mine[0]["charge_text"] == "10 September 2026"

        # SECOND RUN, SAME DAY: idempotent. A cron that runs twice — or a
        # webhook arriving beside it — must not write to her twice.
        renewal_run(conn, stripe, date(2026, 9, 1), sender)
        assert len([c for c in sender.calls
                    if c["email"] == "pilot2.run@example.com"]) == 1

        with conn.cursor() as cur:
            cur.execute("SELECT notice_kind, ok, amount_cents, charge_date "
                        "FROM billing_notices WHERE stripe_subscription_id = %s",
                        ("sub_pilot2_run",))
            rows = [dict(r) for r in cur.fetchall()]
        assert len(rows) == 1
        assert rows[0]["notice_kind"] == "renewal_15day"
        assert rows[0]["ok"] is True
        assert rows[0]["amount_cents"] == 24900
        assert rows[0]["charge_date"] == date(2026, 9, 10)
    finally:
        conn.close()


@needs_db
def test_what_stripe_said_is_recorded_but_never_consulted():
    """THE DISCIPLINE, PINNED.

    `renewal_at` is written from Stripe's answer after the decision is
    made. To prove it is not an input, the column is poisoned with a
    date that would trigger a notice, and Stripe is then made to say
    there is no upcoming invoice: if the column were being read, a
    notice would go out on a date nobody confirmed.
    """
    conn = _db()
    try:
        _make_subscriber(conn, "pilot2.record@example.com", "sub_pilot2_record")
        with conn.cursor() as cur:
            cur.execute("UPDATE subscriptions SET renewal_at = %s, "
                        "renewal_amount_cents = 24900 "
                        "WHERE stripe_subscription_id = %s",
                        (date(2026, 9, 3), "sub_pilot2_record"))
        conn.commit()

        silent = FakeStripe(raises=RuntimeError("Stripe is unreachable"))
        sender = Recorder()
        outcome = _one(conn, silent, "sub_pilot2_record", date(2026, 9, 1), sender)
        assert sender.calls == []
        assert outcome["sent"] is None
        assert "unreachable" in outcome["reason"]
    finally:
        conn.close()


@needs_db
def test_a_failed_send_is_recorded_with_its_reason_and_fails_the_run():
    """§4. The row exists either way; what must not happen is a run that
    looks successful while nobody was told."""
    conn = _db()
    try:
        _make_subscriber(conn, "pilot2.fail@example.com", "sub_pilot2_fail")
        stripe = FakeStripe(preview={
            "amount_due": 24900, "currency": "usd",
            "next_payment_attempt": int(__import__("datetime").datetime(
                2026, 9, 4, tzinfo=__import__("datetime").timezone.utc).timestamp()),
        })
        sender = Recorder(ok=False, reason="SENDGRID_API_KEY is not set")
        outcome = _one(conn, stripe, "sub_pilot2_fail", date(2026, 9, 1), sender)
        assert outcome["sent"] == "renewal_5day"
        assert outcome["ok"] is False

        with conn.cursor() as cur:
            cur.execute("SELECT ok, reason FROM billing_notices "
                        "WHERE stripe_subscription_id = %s", ("sub_pilot2_fail",))
            row = dict(cur.fetchone())
        assert row["ok"] is False
        assert "SENDGRID" in row["reason"]
    finally:
        conn.close()


@needs_db
def test_a_superseded_notice_is_recorded_rather_than_dropped():
    """"Why did the 15-day notice never go out" has an answer in the
    table, rather than being a gap somebody has to infer."""
    conn = _db()
    try:
        _make_subscriber(conn, "pilot2.late@example.com", "sub_pilot2_late")
        stripe = FakeStripe(preview={
            "amount_due": 24900, "currency": "usd",
            "next_payment_attempt": int(__import__("datetime").datetime(
                2026, 9, 5, tzinfo=__import__("datetime").timezone.utc).timestamp()),
        })
        # Four days out and nothing sent: the cron was down through the
        # whole 15-day window.
        outcome = _one(conn, stripe, "sub_pilot2_late", date(2026, 9, 1), Recorder())
        assert outcome["sent"] == "renewal_5day"
        assert outcome["superseded"] == ["renewal_15day"]

        with conn.cursor() as cur:
            cur.execute("SELECT notice_kind, ok, reason FROM billing_notices "
                        "WHERE stripe_subscription_id = %s ORDER BY notice_kind",
                        ("sub_pilot2_late",))
            rows = [dict(r) for r in cur.fetchall()]
        kinds = {r["notice_kind"]: r for r in rows}
        assert kinds["renewal_5day"]["ok"] is True
        assert kinds["renewal_15day"]["ok"] is False
        assert "superseded" in kinds["renewal_15day"]["reason"]
    finally:
        conn.close()


@needs_db
def test_a_cancelled_subscription_is_not_asked_about():
    conn = _db()
    try:
        _make_subscriber(conn, "pilot2.gone@example.com", "sub_pilot2_gone",
                         status="canceled")
        rows = rn.subscriptions_to_check(conn)
        assert "sub_pilot2_gone" not in [r["stripe_subscription_id"] for r in rows]
    finally:
        conn.close()


def renewal_run(conn, stripe, today, sender):
    return rn.run(conn, stripe, today, sender=sender)


def _one(conn, stripe, sid, today, sender):
    """One subscription through the same code the run loop uses."""
    row = next(r for r in rn.subscriptions_to_check(conn)
               if r["stripe_subscription_id"] == sid)
    outcome = rn.process_subscription(conn, stripe, row, today, sender)
    conn.commit()
    return outcome
