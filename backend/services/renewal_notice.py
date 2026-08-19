"""Telling a customer she is about to be charged, before she is charged.

═══ THE GAP, WHICH IS NOT PILOT-ONLY ═══

The 14-day trial already charges with no warning. `trial_end` is present
on `customer.subscription.created/.updated` while the status is
`trialing`; nothing persisted it, `customer.subscription.trial_will_end`
fell through the webhook chain to a bare 200, and no template existed. So
the first thing a trialling customer heard from us about money was the
receipt.

The 90-day pilot runs on a 100%-off coupon against the standard price
rather than a trial, which produces **no `trial_end` and no
`trial_will_end` event at all** — the subscription is `active` with a
discount. The notice is entirely ours to send on that path, and the trial
path was never covered either.

═══ WHICH DATE IS AUTHORITATIVE — THE PART THAT WAS RULED ═══

Three candidates were on the table and two of them are wrong:

**`current_period_end` is wrong, and wrong in the worst direction.** On a
3×monthly 100%-off coupon it is the NEXT INVOICE date — one month out —
and that invoice is **$0**. A notice fired off it says "you will be
charged on the 4th" three times about invoices that charge nothing,
before the one time it is true. A notice that cries wolf three times is
worse than no notice: the fourth is the one that matters and it arrives
with the credibility of the three that did not.

**`discount.end` is a coupon fact, not a charge date.** Converting one to
the other means assuming the billing cycle is aligned to the coupon, and
that assumption is exactly the parallel calculation MONEY1 forbids — a
date we computed, which can disagree with the date the card is charged
on, with the customer discovering the disagreement.

**The upcoming invoice is authoritative**, because Stripe computes it
with the discount already applied: one object carrying the true date and
the true amount. And the timing works out — by the time the first notice
is due, the previous $0 invoice has finalised, so the upcoming invoice IS
the first real charge.

═══ SO THIS MODULE PERSISTS NOTHING THAT DECIDES ANYTHING ═══

The job asks Stripe every day and acts on the answer. `subscriptions.
trial_end`, `renewal_at` and `renewal_amount_cents` are a RECORD — for
the admin view, and for a human reconstructing what we believed — never
an input. `billing_notices` exists for idempotency, which is a fact about
US (did we already write to her) rather than about the charge.

The cost is one Stripe call per active subscription per day, owner-priced
and accepted: it is what never computing a charge date ourselves costs.

═══ "AT OR INSIDE", NOT "EXACTLY N DAYS AGO" ═══

A daily job WILL miss a day. If the windows were exact, a missed run
silently drops a notice, and the failure looks identical to the notice
never having been due. So a window is open at or inside its threshold,
and a notice that has not been sent is still due.

The consequence is handled rather than ignored: when a run finds both
windows open (the job was down through the first one), it sends the
TIGHTEST one only and records the other as SUPERSEDED. Two emails in one
minute saying the same thing in different words is not thoroughness.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from typing import Any, Dict, Optional, Sequence, Tuple

#: (kind, days before the charge the window opens). Order is
#: widest-first; `decide` picks the tightest OPEN one.
NOTICE_WINDOWS: Tuple[Tuple[str, int], ...] = (
    ("renewal_15day", 15),
    ("renewal_5day", 5),
)

NOTICE_KINDS = tuple(kind for kind, _ in NOTICE_WINDOWS)


class StripeUnavailable(RuntimeError):
    """Stripe would not answer — distinct from "there is no invoice".

    ═══ WHY THIS IS A TYPE AND NOT A REASON STRING ═══

    Both were reported the same way at first, and the dry-run showed what
    that costs: with a wrong API key, every subscription was skipped with
    an honest reason and the job exited **0**. A cron with a bad key
    would have reported success every day while sending nothing, which is
    precisely the silence this ticket exists to remove.

    "Stripe has no upcoming invoice for this customer" is an ANSWER.
    "Stripe would not talk to us" is a FAILURE. They must not exit the
    same way, and telling them apart by matching on the reason text would
    be asserting the spelling rather than the property (§14.1).
    """


@dataclass(frozen=True)
class UpcomingCharge:
    """What Stripe says the next real charge is. Never assembled by us."""
    charge_date: date
    amount_cents: int
    currency: str
    #: Which Stripe object this came from, so the record names its source.
    source: str = "upcoming_invoice"


@dataclass(frozen=True)
class Decision:
    """What a run should do about one subscription, and why.

    `reason` is populated even when nothing happens, because "why did she
    not get a notice" is the question this job will actually be asked.
    """
    send: Optional[str] = None
    supersede: Tuple[str, ...] = ()
    reason: str = ""


def decide(charge: Optional[UpcomingCharge], today: date,
           recorded: Sequence[str] = ()) -> Decision:
    """Which notice, if any, is due for this subscription today.

    `recorded` is the notice kinds already written to `billing_notices`
    FOR THIS CHARGE DATE — sent or superseded alike. A different charge
    date is a different set, deliberately: if the date moves, she should
    hear about the one she will actually be charged on.
    """
    if charge is None:
        return Decision(reason="Stripe reports no upcoming invoice")
    if charge.amount_cents <= 0:
        # The discounted months. Nothing is owed, so nothing is announced.
        return Decision(reason="the next invoice is zero — nothing to warn about")

    days_left = (charge.charge_date - today).days
    if days_left < 0:
        return Decision(reason="the charge date has passed")

    done = set(recorded)
    # A WIDER NOTICE NEVER FIRES AFTER A TIGHTER ONE. Caught by this
    # file's own test: with the 5-day notice already sent and three days
    # to go, the 15-day window is still technically open (3 <= 15) and
    # still unsent — so a naive "open and not recorded" rule sends the
    # 15-day notice AFTER the 5-day one, which reads to the customer as
    # the date moving further away.
    tightest_done = min((days for kind, days in NOTICE_WINDOWS if kind in done),
                        default=None)
    open_windows = [(kind, days) for kind, days in NOTICE_WINDOWS
                    if days_left <= days and kind not in done
                    and (tightest_done is None or days < tightest_done)]
    if not open_windows:
        return Decision(reason=f"no window open {days_left} days out, or "
                               "already recorded")

    # Tightest open window wins; anything wider is superseded rather than
    # left to fire later as a second email saying the same thing.
    open_windows.sort(key=lambda pair: pair[1])
    send, _ = open_windows[0]
    supersede = tuple(kind for kind, _ in open_windows[1:])
    return Decision(send=send, supersede=supersede,
                    reason=f"{days_left} days before the charge")


def upcoming_charge(stripe_module, subscription_id: str) -> Tuple[Optional[UpcomingCharge], str]:
    """Ask Stripe what the next invoice is. Returns (charge, reason).

    ═══ WHY `create_preview` AND NOT `Invoice.upcoming` ═══

    `stripe.Invoice.upcoming` is the method every example on the internet
    uses and it does not exist in the SDK this service pins (12.3.0) —
    the operation is `Invoice.create_preview`. Named here because calling
    the old one raises `AttributeError`, which an `except Exception`
    around a billing call would turn into "no upcoming invoice" and a
    customer charged with no warning. Checked against the installed
    version rather than remembered.

    A failure NEVER becomes a date. It becomes (None, reason), the job
    records the reason, and nobody is told anything about money on the
    strength of an exception.
    """
    preview_fn = getattr(stripe_module.Invoice, "create_preview", None)
    if preview_fn is None:  # pragma: no cover - version drift
        return None, ("this Stripe SDK has no invoice-preview operation "
                      f"({getattr(stripe_module, 'VERSION', 'unknown')})")
    try:
        preview = preview_fn(subscription=subscription_id)
    except Exception as exc:  # stripe.error.* and transport failures alike
        raise StripeUnavailable(
            f"Stripe would not preview the next invoice: {exc}") from exc

    amount = _as_int(_get(preview, "amount_due"))
    if amount is None:
        return None, "the invoice preview carried no amount_due"

    when = _get(preview, "next_payment_attempt") or _get(preview, "period_end")
    charge_date = _as_date(when)
    if charge_date is None:
        return None, "the invoice preview carried no payment date"

    currency = (_get(preview, "currency") or "usd")
    return UpcomingCharge(charge_date=charge_date, amount_cents=amount,
                          currency=str(currency).lower()), "ok"


# ── Money and dates, in the words a customer reads ───────────────────

def amount_text(amount_cents: int, currency: str = "usd") -> str:
    """`$249.00`. Not localised, and deliberately not rounded.

    A pre-charge notice quoting `$249` for a `$249.37` charge is a small
    lie that reaches somebody's bank statement.
    """
    symbol = "$" if currency.lower() in ("usd", "cad", "aud") else ""
    return f"{symbol}{amount_cents / 100:,.2f}" + ("" if symbol else f" {currency.upper()}")


def date_text(when: date) -> str:
    """`4 September 2026` — the date, never a duration.

    Owner-ruled in PILOT1's sibling: trial copy states the date, not the
    number of days, because a duration has to be counted from something
    the reader has to remember.
    """
    return f"{when.day} {when.strftime('%B %Y')}"


def billing_url() -> str:
    """Where the cancel control lives (PILOT1).

    ═══ WHY NOT A PORTAL SESSION URL, WHICH IS WHAT WAS ASKED ═══

    A Stripe billing-portal session link is short-lived. Embedded in an
    email that may be opened days later — which is precisely what a
    15-day notice is — it expires into an error page, and the customer's
    experience of "cancel before you are charged" becomes a broken link
    at the moment she trusted it.

    So the link goes to the Billing tab, where PILOT1's ungated "Cancel
    subscription" control opens a FRESH portal session on click. One
    extra click, and it works every time instead of most of the time.
    """
    # REQUIRED, not defaulted. Unset, this returned
    # `/account-settings?tab=billing` — a RELATIVE path, which in an
    # email client resolves against nothing and is simply a dead link.
    # The notice would still be sent, still say the right date and
    # amount, and fail at the one action it exists to enable.
    #
    # `require()` raises with the manifest's own consequence sentence
    # (services/environment.py), so a misconfigured cron says which
    # variable and why rather than mailing a broken link.
    from services.environment import require
    return f"{require('FRONTEND_URL').rstrip('/')}/account-settings?tab=billing"


def _get(obj: Any, key: str):
    if isinstance(obj, dict):
        return obj.get(key)
    return getattr(obj, key, None)


def _as_int(value) -> Optional[int]:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _as_date(value) -> Optional[date]:
    """Stripe timestamps are UNIX seconds; tests pass dates directly."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    seconds = _as_int(value)
    if seconds is None:
        return None
    return datetime.fromtimestamp(seconds, tz=timezone.utc).date()


# ── The run itself ───────────────────────────────────────────────────
#
# Kept here rather than in the script so it is testable without a cron,
# and so the webhook can call the same code for one subscription. The
# script is a thin main() around `run()`; the `trial_will_end` handler is
# a thin call to `process_subscription()`.

@dataclass
class RunReport:
    """What a run did, in the terms somebody debugging it will ask.

    Counted rather than logged-only, because "the job ran" and "the job
    did anything" are different claims and only one of them is usually
    true.
    """
    considered: int = 0
    sent: int = 0
    superseded: int = 0
    failed: int = 0
    #: Subscriptions Stripe would not answer about. Counted apart from
    #: `skipped` because a skip is a decision and this is an absence of
    #: one.
    unreachable: int = 0
    skipped: list = field(default_factory=list)

    def as_dict(self) -> Dict[str, Any]:
        return {"considered": self.considered, "sent": self.sent,
                "superseded": self.superseded, "failed": self.failed,
                "unreachable": self.unreachable, "skipped": self.skipped}


#: Statuses worth asking Stripe about. A cancelled or unpaid subscription
#: has no upcoming charge to warn anybody about, and `trialing`/`active`
#: are the two the pilot and the 14-day trial live in.
LIVE_STATUSES = ("active", "trialing", "past_due")


def subscriptions_to_check(conn) -> list:
    """Live subscriptions with a user who can be emailed."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT s.stripe_subscription_id, s.user_id, s.status,
                   u.email, u.full_name
            FROM subscriptions s
            JOIN users u ON u.id = s.user_id
            WHERE s.stripe_subscription_id IS NOT NULL
              AND s.status = ANY(%s)
              AND u.email IS NOT NULL
              AND u.is_active = TRUE
            ORDER BY s.id
            """,
            (list(LIVE_STATUSES),),
        )
        return [dict(row) for row in cur.fetchall()]


def recorded_kinds(conn, subscription_id: str, charge_date: date) -> list:
    """Notices already written FOR THIS CHARGE DATE.

    Scoped to the date, deliberately — see the schema comment. A moved
    charge date is a new conversation.
    """
    with conn.cursor() as cur:
        cur.execute(
            "SELECT notice_kind FROM billing_notices "
            "WHERE stripe_subscription_id = %s AND charge_date = %s",
            (subscription_id, charge_date),
        )
        return [dict(row)["notice_kind"] for row in cur.fetchall()]


def _record_notice(conn, subscription_id: str, user_id, kind: str,
                   charge: UpcomingCharge, ok: bool, reason: str) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO billing_notices (stripe_subscription_id, user_id,
                notice_kind, charge_date, amount_cents, currency, ok, reason)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (stripe_subscription_id, notice_kind, charge_date)
            DO UPDATE SET ok = EXCLUDED.ok, reason = EXCLUDED.reason,
                          sent_at = CURRENT_TIMESTAMP
            """,
            (subscription_id, user_id, kind, charge.charge_date,
             charge.amount_cents, charge.currency, ok, reason),
        )


def _record_what_stripe_said(conn, subscription_id: str,
                             charge: Optional[UpcomingCharge]) -> None:
    """The cache, written after the decision and never read by it."""
    if charge is None:
        return
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE subscriptions SET renewal_at = %s, renewal_amount_cents = %s, "
            "renewal_seen_at = CURRENT_TIMESTAMP WHERE stripe_subscription_id = %s",
            (charge.charge_date, charge.amount_cents, subscription_id),
        )


def process_subscription(conn, stripe_module, row: Dict[str, Any],
                         today: date, sender=None) -> Dict[str, Any]:
    """One subscription: ask Stripe, decide, send, record.

    Returns a per-subscription outcome dict rather than raising, so one
    customer's Stripe hiccup cannot stop the other customers' notices —
    the failure mode a `for` loop with an exception inside it produces by
    default.
    """
    from utils.notifications import send_renewal_notice_with_reason

    send = sender or send_renewal_notice_with_reason
    sid = row["stripe_subscription_id"]

    try:
        charge, why = upcoming_charge(stripe_module, sid)
    except StripeUnavailable as unavailable:
        # NOT a skip. Nothing was learned about this customer, so the run
        # must not read as healthy — see StripeUnavailable.
        return {"subscription": sid, "sent": None, "unreachable": True,
                "reason": str(unavailable)}
    _record_what_stripe_said(conn, sid, charge)

    decision = decide(charge, today,
                      recorded_kinds(conn, sid, charge.charge_date) if charge else ())
    if decision.send is None:
        # When Stripe would not answer, ITS reason is the useful one:
        # `decide()` can only say "no upcoming invoice", which is what a
        # connection reset and a genuinely absent invoice look like from
        # the inside. Caught by this module's own test, which poisoned
        # the cached date and made Stripe fail — and got the generic
        # sentence back instead of the failure (§4).
        return {"subscription": sid, "sent": None,
                "reason": why if charge is None else decision.reason}

    assert charge is not None  # decide() returns None to send otherwise
    days_left = (charge.charge_date - today).days
    ok, reason = send(
        row["email"], row.get("full_name") or "", decision.send,
        date_text(charge.charge_date),
        amount_text(charge.amount_cents, charge.currency),
        billing_url(),
        f"{days_left} days from today" if days_left != 1 else "tomorrow",
        row.get("user_id"),
    )
    _record_notice(conn, sid, row.get("user_id"), decision.send, charge, ok,
                   reason or "")

    for skipped in decision.supersede:
        # Recorded as a fact, not silently dropped: "why did the 15-day
        # notice never go out" has an answer in the table.
        _record_notice(conn, sid, row.get("user_id"), skipped, charge, False,
                       f"superseded by {decision.send} — the window had "
                       "already closed when this run happened")

    return {"subscription": sid, "sent": decision.send, "ok": ok,
            "reason": reason, "superseded": list(decision.supersede)}


def run(conn, stripe_module, today: Optional[date] = None,
        sender=None) -> RunReport:
    """Every live subscription, once."""
    when = today or datetime.now(timezone.utc).date()
    report = RunReport()
    for row in subscriptions_to_check(conn):
        report.considered += 1
        try:
            outcome = process_subscription(conn, stripe_module, row, when, sender)
        except Exception as exc:  # one customer's failure is not everyone's
            report.failed += 1
            report.skipped.append({"subscription": row["stripe_subscription_id"],
                                   "reason": f"unhandled: {exc}"})
            continue
        if outcome.get("sent"):
            if outcome.get("ok"):
                report.sent += 1
            else:
                # The mail did not leave the building. Counted as a
                # failure even though the row exists (§4).
                report.failed += 1
            report.superseded += len(outcome.get("superseded") or ())
        elif outcome.get("unreachable"):
            report.unreachable += 1
            report.skipped.append({"subscription": outcome["subscription"],
                                   "reason": outcome["reason"]})
        else:
            report.skipped.append({"subscription": outcome["subscription"],
                                   "reason": outcome["reason"]})
    return report
