"""The environment this service needs, declared — and checked at boot.

═══ THE DEFECT THAT WIDENED THIS TICKET ═══

`FRONTEND_URL` is read in sixteen places. Three of them are the money
path:

    users_auth.py:550  success_url = {FRONTEND_URL}/account-settings?success=true
    users_auth.py:551  cancel_url  = {FRONTEND_URL}/account-settings?canceled=true
    users_auth.py:598  return_url  = {FRONTEND_URL}/account-settings   ← billing portal

All three are written as `os.getenv('FRONTEND_URL', 'http://localhost:3000')`.
If the variable is unset on the production API, a customer completes a
Stripe checkout and is redirected to **a page on their own laptop**. No
error is raised, nothing is logged, and the first person to find out is
the person who paid.

`FRONTEND_URL` appeared in no configuration file in this repository.
Nothing declared it should exist, so nothing could notice it did not.

That is the shape this codebase keeps closing: **a fact the system
depends on, that nothing checks.** PRICING1 ruled the specific case — a
missing price ID must fail loudly with a named reason rather than fall
back to a placeholder. This generalises it to the whole environment.

═══ WHY THIS DEFAULTS TO A LOUD WARNING RATHER THAN A REFUSAL ═══

The strongest form of this fix is: the process refuses to boot when a
required variable is missing. That is right, and shipping it TODAY would
be reckless in a specific way worth naming.

**We do not yet know whether `FRONTEND_URL` is set in production.** The
owner's check is outstanding. If it is missing and this module hard-fails
by default, the next deploy converts a wrong-redirect into a service that
will not start — a total outage, caused by the fix for a partial one.

You cannot make a process refuse to start on a condition you have not
verified is absent, because the refusal is then the incident.

So: **loud, named, unmissable at boot — and `STRICT_ENV=1` turns it into
a refusal.** The stronger form is one environment variable away, and it
becomes the default in the ticket that confirms production is clean.
That ordering is the whole design, not a compromise on it.

═══ REQUIRED vs OPTIONAL IS A DELIBERATE CLASSIFICATION ═══

Owner-ruled: do not hard-fail on variables whose absence is genuinely
tolerable. A missing `ADMIN_EMAIL` degrades — nobody gets a signup
notice, and every other thing the product does still works. A missing
`FRONTEND_URL` does not degrade; it produces a confidently wrong answer.

The test is not "how important is this" but: **does its absence change
behaviour SILENTLY and WRONGLY?** Every entry below records that
reasoning in its own words, because a classification without a reason is
a guess somebody will re-guess differently.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

REQUIRED = "required"
OPTIONAL = "optional"


@dataclass(frozen=True)
class EnvVar:
    key: str
    level: str
    #: What goes wrong when it is missing — in the words a reader needs,
    #: not "used by billing".
    consequence: str


# ── The manifest ─────────────────────────────────────────────────────
#
# REQUIRED means: absent, the product does something WRONG rather than
# something less. OPTIONAL means: absent, a capability is off and
# everything else is unaffected.
MANIFEST: Tuple[EnvVar, ...] = (
    EnvVar("DATABASE_URL", REQUIRED,
           "Every route that touches data fails. Loud already, and listed "
           "so the manifest is the whole picture rather than the "
           "interesting half."),
    EnvVar("JWT_SECRET_KEY", REQUIRED,
           "Sessions cannot be signed or verified. `auth.py` already "
           "raises at import — this entry records that the refusal is "
           "deliberate, so nobody 'fixes' it into a generated default and "
           "invalidates every live session on each restart."),
    EnvVar("FRONTEND_URL", REQUIRED,
           "THE MONEY PATH. Stripe's success_url, cancel_url and the "
           "billing-portal return_url are all built from it, with a "
           "`http://localhost:3000` fallback. Unset, a customer pays and "
           "is redirected to a page on their own machine. Also carries "
           "every link in every email."),
    EnvVar("STRIPE_SECRET_KEY", REQUIRED,
           "Checkout and the billing portal cannot be created. Absent, "
           "the paid path is dead — which is at least loud."),
    EnvVar("STRIPE_PROFESSIONAL_PRICE_ID", REQUIRED,
           "PRICING1's case, and the reason this file exists in this "
           "shape: it used to fall back to a placeholder price string, so "
           "checkout failed at Stripe with an error about a price that "
           "was never real. Fail loudly with a named reason, never fall "
           "back to a placeholder."),
    EnvVar("ALLOWED_ORIGINS", REQUIRED,
           "CORS. Wrong or absent, the browser refuses every call and the "
           "product looks broken with nothing in the server log."),
    EnvVar("SENDGRID_API_KEY", OPTIONAL,
           "No email leaves the building. OPTIONAL and it is a close "
           "call: the product degrades honestly — every sender returns "
           "(False, reason), the reason reaches the officer's screen, and "
           "`email_log` records the failure. A share still works and "
           "still shows the link on screen. Degrades, does not lie."),
    EnvVar("SENDGRID_FROM_EMAIL", OPTIONAL,
           "Mail falls back to a default sender. Degrades in a way that "
           "is visible in the message that arrives, not silent."),
    EnvVar("ADMIN_EMAIL", OPTIONAL,
           "Nobody is told about a new signup or an API-key request. The "
           "record still exists in the database and on the admin screen — "
           "a notification is lost, not a fact."),
    EnvVar("NOTIFICATIONS_ENABLED", OPTIONAL,
           "Defaults on. A deliberate off-switch, and its absence means "
           "the default, which is the documented behaviour rather than an "
           "accident."),
    EnvVar("STRIPE_WEBHOOK_SECRET", OPTIONAL,
           "Webhook signature verification. OPTIONAL here ONLY because "
           "the webhook path already refuses unverified payloads rather "
           "than trusting them — the failure is closed, not silent. If "
           "that ever changes this becomes REQUIRED in the same diff."),
    EnvVar("PYTHON_VERSION", OPTIONAL,
           "Read by Render at BUILD time, never by this process. Listed "
           "because render.yaml declares it and the manifest is checked "
           "against that file; classifying it required would make every "
           "local run warn about a variable it has no use for."),
)

BY_KEY: Dict[str, EnvVar] = {v.key: v for v in MANIFEST}
REQUIRED_KEYS = tuple(v.key for v in MANIFEST if v.level == REQUIRED)
OPTIONAL_KEYS = tuple(v.key for v in MANIFEST if v.level == OPTIONAL)


def missing(level: str, env: Optional[Dict[str, str]] = None) -> List[EnvVar]:
    source = os.environ if env is None else env
    return [v for v in MANIFEST
            if v.level == level and not (source.get(v.key) or "").strip()]


def strict() -> bool:
    """`STRICT_ENV=1` turns the boot warning into a refusal.

    Off by default until production is confirmed clean — see the module
    docstring. Turning it on is a one-line change in render.yaml and the
    ticket that does it should be the ticket that verified the
    environment, not this one.
    """
    return (os.getenv("STRICT_ENV") or "").strip() in ("1", "true", "True")


class EnvironmentError_(RuntimeError):
    """Named so a traceback says what kind of problem this is."""


def require(key: str) -> str:
    """A required variable's value, or a refusal that names the damage.

    ═══ WHY CALL SITES FAIL AND BOOT DOES NOT ═══

    The module docstring explains why the BOOT check warns rather than
    refusing: a process that will not start on an unverified condition
    turns a wrong redirect into an outage for everybody.

    A CALL SITE is the opposite case, and the asymmetry is deliberate.
    Refusing here affects one operation, and that operation's output is
    already worthless without the variable. A Stripe checkout that
    refuses to start is strictly better than one that charges a card and
    redirects to `http://localhost:3000` — the first has not taken any
    money.

    So: loud at boot, closed at the point of use. PRICING1's rule, at the
    scope where it costs the least and prevents the most.
    """
    value = (os.getenv(key) or "").strip()
    if value:
        return value
    known = BY_KEY.get(key)
    raise EnvironmentError_(
        f"{key} is not set on this service. "
        + (known.consequence if known else
           "It has no entry in services/environment.py either, which is "
           "its own defect — classify it.")
    )


def report(env: Optional[Dict[str, str]] = None) -> str:
    """The block printed at boot. Empty string when nothing is missing.

    Written to be unmissable in a Render log — a one-line warning among
    startup chatter is a warning nobody reads, and this one exists
    precisely because the last failure was silent.
    """
    gone_required = missing(REQUIRED, env)
    gone_optional = missing(OPTIONAL, env)
    if not gone_required and not gone_optional:
        return ""

    lines = ["", "=" * 72]
    if gone_required:
        lines.append("!! MISSING REQUIRED ENVIRONMENT — the product will "
                     "behave WRONGLY, not merely less")
        lines.append("=" * 72)
        for v in gone_required:
            lines.append(f"  {v.key}")
            lines.append(f"      {v.consequence}")
    if gone_optional:
        lines.append("-" * 72)
        lines.append("Optional variables absent — a capability is off, "
                     "nothing is wrong:")
        for v in gone_optional:
            lines.append(f"  {v.key} — {v.consequence}")
    lines.append("=" * 72)
    lines.append("")
    return "\n".join(lines)


def check(env: Optional[Dict[str, str]] = None) -> List[EnvVar]:
    """Print the report; refuse to continue under STRICT_ENV.

    Returns the missing REQUIRED vars so a caller can decide for itself.
    """
    text = report(env)
    if text:
        print(text, flush=True)
    gone = missing(REQUIRED, env)
    if gone and strict():
        raise EnvironmentError_(
            "STRICT_ENV is set and these required variables are missing: "
            + ", ".join(v.key for v in gone))
    return gone
