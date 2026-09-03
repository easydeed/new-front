#!/usr/bin/env python3
"""RED-H1.1 — the grep that should have existed.

═══ WHY THIS FILE IS A GATE AND NOT A CODE REVIEW ═══

The standing rule is simple: no certification or compliance claim appears
anywhere until the certification actually exists. It was ruled once, and
it was then violated in eleven places across five files — a SOC 2 badge,
ALTA Best Practices, a 99.9% SLA nothing measures, "bank-level security",
and eight named title-software integrations that have no client, no
webhook and no stub anywhere in the repository.

The A3 ticket had already found and fixed ONE of them. It removed the
SOC2 claim from `api-key-request/page.tsx` and the class was considered
handled. It was not: the identical badge survived in `Footer.tsx`, a
component that in the original design rendered on that very page.

That is the lesson this file exists to encode. A human audit checks the
files a human thinks of. This checks all of them, every push, and it is
BLOCKING — no `|| true`, no `continue-on-error`. A claim that cannot
ship is worth more than a claim someone remembers to look for.

═══ MATCH STATEMENTS, NOT STRINGS ═══

Three pins in this project have now failed by matching text that merely
LOOKED like the thing they forbade: CSS keyframes caught by `\\d+%`, a
legitimate `status IN ('active','revoked','superseded')` caught by a
deeds-scoped pin, and the recurring one — a comment EXPLAINING a removal
being read as the removal returning.

That last trap is guaranteed here. Every removal in this ticket is
documented in a comment that quotes the banned phrase, because the next
person needs to know what was there and why it went. If this checker read
comments, it would fail on its own remediation.

So it strips comments before matching, and the test suite pins that
behaviour in both directions: a banned phrase in a comment PASSES, the
same phrase in rendered text FAILS. Prose about a claim is not the claim.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Where product-facing text lives. Tests are excluded deliberately: a test
# that asserts a banned phrase is ABSENT has to name it to do that.
SEARCH_DIRS = [ROOT / "frontend" / "src", ROOT / "backend" / "templates", ROOT / "templates"]
SEARCH_SUFFIXES = {".tsx", ".ts", ".jsx", ".js", ".html", ".jinja2"}
EXCLUDE_PARTS = {"node_modules", ".next", "__tests__", "__mocks__", "dist", "build"}


class Rule:
    def __init__(self, name: str, pattern: str, why: str):
        self.name = name
        self.rx = re.compile(pattern, re.IGNORECASE)
        self.why = why


# Each rule names the claim and WHY it cannot ship. If one of these ever
# becomes true, delete its rule in the same PR that makes it true — the
# way the T-0 pin retired in the PR that built the lineage it guarded.
RULES = [
    Rule("SOC 2", r"\bSOC[\s\-]?2\b",
         "No SOC 2 audit has been performed. Claiming one to enterprise "
         "title customers is a misrepresentation with contractual teeth."),
    Rule("ALTA", r"\bALTA\b[\s\-]*(?:best practices|aligned|compliant|certified)?",
         "No ALTA Best Practices certification exists."),
    Rule("ISO 27001", r"\bISO[\s\-]?27001\b", "No ISO 27001 certification exists."),
    Rule("PCI DSS", r"\bPCI[\s\-]?DSS\b", "No PCI DSS attestation exists. Stripe holds the card data."),
    Rule("HIPAA", r"\bHIPAA\b", "Not applicable and never assessed."),
    Rule("GDPR/CCPA compliance claim", r"\b(?:GDPR|CCPA)[\s\-]*(?:compliant|certified)\b",
         "No compliance assessment has been performed against either."),
    # ── DASH1 item 8: OUR TICKET NUMBERS ARE NOT HER VOCABULARY ───────
    #
    # The admin Overview told the customer, in rendered text: "Neither is
    # a trend; trends arrive with ADMIN6." ADMIN6 is an internal ticket
    # identifier. It names nothing she can look up, promises a date
    # nobody gave her, and reads as a defect number on a screen she paid
    # for. Same species as a dead button — a surface referring to
    # something that does not exist from where she is standing — and it
    # arrived the same way: a note to the next developer, written in a
    # string the customer reads.
    #
    # ═══ THIS RULE ENUMERATES, AND THAT IS DELIBERATE ═══
    #
    # Every other rule in this file matches a SHAPE, because guarding a
    # spelling is how "enterprise-grade security" walked past two rules
    # written for "bank-level" and "military-grade". The reflex here was
    # the same: match `[A-Z]{2,}[0-9]+` — capitals then a digit, standing
    # as a word — and be done.
    #
    # It was tried. It matched ADDRESS1, ADDRESS2 and SHA256 on the first
    # run, and it would match ISO27001, UTF8, LINE2 and every form field
    # anybody names that way. The shape of a ticket identifier is
    # genuinely indistinguishable from the shape of a field name, and
    # this file's own doctrine says what to do about that: a pattern
    # smart enough to tell them apart is a classifier, and a classifier
    # in a BLOCKING gate fails in whichever direction nobody predicted.
    #
    # So the prefixes are listed. Adding a ticket family means adding a
    # word here, which is a real cost and a small one — and unlike the
    # security-claim rules, the thing being guarded is OUR OWN
    # vocabulary, which we control and can therefore enumerate honestly.
    # Single-letter prefixes (S1, T5, X2, H2) are deliberately absent:
    # one letter and a digit is a heading level, a form field or a
    # version, and a gate that fires on `H2` is worse than the leak.
    Rule("internal ticket identifier",
         r"\b(?:ADMIN|DASH|DOCTRINE|DX|FLOW|NOTARY|PARTNER|PRICING|RED|TP|TRIAL|VERIFY)"
         r"[0-9]+(?:\.[0-9]+)?[a-z]?\b",
         "Internal ticket identifiers name nothing a customer can look "
         "up and promise dates nobody gave them. Say what the screen "
         "does today, or say the capability does not exist yet — "
         "'trends arrive with ADMIN6' is a dead button in prose."),
    # ── THE PROPERTY, not the spellings (owner-ruled, PRICING1) ───────
    #
    # This started as two rules for two phrasings: "bank-level security"
    # and "military-grade". Then "Enterprise-grade security" turned up on
    # the marketing page, directly above the line "Security you can
    # verify in the product — not badges", and sailed through both.
    #
    # Three spellings of one claim, two of them enumerated, is the same
    # mistake this codebase keeps making in different clothes — the pin
    # guards a spelling and the property walks past it. So the rule now
    # describes the SHAPE: any adjective borrowed as a grade or level,
    # attached to a security noun. bank-level, military-grade,
    # enterprise-grade, government-grade, hospital-grade,
    # industry-leading — all one rule, and the next one nobody thought
    # of is covered too.
    #
    # It stays scoped to SECURITY nouns deliberately. "Commercial-grade
    # paper" is a fact about paper; the claim being forbidden is the
    # unearned assurance about how safe something is.
    Rule("unearned security grade",
         r"\b[a-z]+[\s\-](?:grade|level|class)\s+"
         r"(?:security|encryption|protection|infrastructure|reliability|privacy)\b"
         r"|\b(?:industry[\s\-]leading|best[\s\-]in[\s\-]class|world[\s\-]class)\s+"
         r"(?:security|encryption|protection|infrastructure|reliability|privacy)\b",
         "A superlative used as a security grade, with no definition and "
         "no audit behind it. Say what the product actually does — the "
         "hash-stamped PDFs and the confirmation record are checkable; "
         "'bank-level' is not."),
    # The other half of the same property: claiming an AUDIT rather than
    # a grade. Scoped tightly, because 'certified' is real vocabulary in
    # this domain — a certified copy, a certification of trust — and a
    # rule that flagged those would be noise nobody reads.
    Rule("unearned security audit",
         r"\b(?:security|privacy|data|infrastructure)[^.\n]{0,24}?"
         r"\b(?:certified|accredited|independently audited)\b"
         r"|\b(?:certified|accredited|independently audited)[^.\n]{0,24}?"
         r"\b(?:security|privacy|infrastructure)\b",
         "No security or privacy audit has been performed. Naming one is "
         "the claim with contractual teeth."),
    # The `[^.\n]{0,24}?` gap is the whole point. The first version of this
    # rule required the keyword to follow the percentage immediately, and
    # it pinned the four spellings that happened to exist. Its own test
    # then caught "99.9% API uptime" — one word in between, straight
    # through the gate. Same lesson as everywhere else in this project: a
    # pin that guards a spelling does not guard a property. Bounded to a
    # single sentence on a single line so it stays a claim, not a
    # coincidence of two numbers sharing a paragraph.
    # AND IT HAPPENED A THIRD TIME, found by ENGINE1 running the CUT list
    # through this file: `99(?:\.9+)?` requires the decimals to be NINES,
    # so **"99.95% uptime" walked straight through** — `99.9` matched and
    # then `\s*%` could not consume the `5`. The rule's own comment above
    # describes this exact failure and the fix repeated it one character
    # deeper: `\.9+` is a spelling of "a high number", not the property.
    # Now `\.\d+`, which is the property — any percentage at all next to
    # an availability word is a claim nothing measures.
    Rule("uptime SLA",
         r"\b99(?:\.\d+)?\s*%[^.\n]{0,24}?\b(?:uptime|sla|availability)\b"
         r"|\buptime\s+sla\b"
         r"|\b(?:uptime|availability)[^.\n]{0,24}?\b99(?:\.\d+)?\s*%",
         "Nothing measures uptime and no SLA has been contractually offered."),
    Rule("title-software integration", r"\b(?:SoftPro|Qualia|ResWare|RamQuest|Closer'?s Choice|ClosingVue|E-Closing|SigniX)\b",
         "No integration exists for any title production system — no client, "
         "no webhook handler, no field mapping, not a stub. Naming one as a "
         "feature is the single claim most likely to drive a purchase and "
         "then be discovered false on the customer's first file."),

    # ── TRIAL1: FEATURE claims, not just compliance claims ────────────
    #
    # The gate shipped covering certifications and security postures, and
    # that framing was one category too narrow. A pricing page listing
    # "SSO/SAML" and "Custom branding" passed cleanly — zero files
    # implement either — while a page saying "SOC 2" failed. Both are
    # things a buyer pays for and then does not receive; only one was
    # guarded.
    #
    # Same blind spot RED0 found in the compliance sweep, one category
    # over: the rule was drawn around the EXAMPLES that prompted it
    # rather than around the property (a claim on a purchase surface
    # that nothing implements).
    Rule("SSO / SAML", r"\b(?:SSO|SAML|single[\s\-]sign[\s\-]on)\b",
         "No SSO or SAML implementation exists — zero files, not a stub. "
         "It appeared on the Enterprise tier of the pricing page, which "
         "is a surface people buy from."),
    Rule("custom branding / white-label", r"\b(?:custom branding|white[\s\-]label(?:ed|ing)?)\b",
         "Nothing in the product themes a deed, an email or a portal per "
         "customer. Listed on the Professional tier until TRIAL1."),
    # DARK1 WIDENED THIS, and the reason is the recurring shape rather
    # than this one miss. The `why` below states the subject plainly —
    # THERE IS NO TEAM MODEL — and the pattern guarded three spellings of
    # it: "team management", "multi-user seats", "user seats". The live
    # comparison table said **"Multi-user collaboration"** with a
    # checkmark beside it and walked straight past, because the pattern
    # required the word "seats" to follow "multi-user".
    #
    # §14.1: a sweep matches the PROPERTY, not the spelling. A rule whose
    # stated subject is broader than its regex is a gate narrower than it
    # reads, and every reader of the `why` will believe the wider thing is
    # covered. This is the fourth instance of that shape in the ledger.
    #
    # So the property is now the claim itself: any assertion of multiple
    # people sharing this account's work. "Collaboration" is deliberately
    # required to sit next to a multi-user/team/shared word rather than
    # being banned alone — the bare noun has honest uses (a signing is a
    # collaboration between an officer and a notary) and banning it would
    # trade this narrowness for the opposite error.
    Rule("team management / seats",
         r"\b(?:team management|(?:multi[\s\-]?user|team|shared)[\s\-]"
         r"(?:seats?|collaboration|workspace|access|accounts?)|user seats?)\b",
         "`deeds` carries one user_id and every query is scoped to it. "
         "There is no team model to manage (RED-S5, deferred by decision)."),

    # ══ ENGINE1: THE INTEGRATOR-FACING CLAIMS ═════════════════════════
    #
    # MEASURED BEFORE WRITTEN. The ENGINE1 CUT list was run through this
    # file's existing rules: **22 of 23 items passed cleanly.** Only
    # "SOC 2" was caught. Every other claim an integrator would buy on —
    # a status page, an SLA, insurance, a data-residency promise, an SDK
    # — walked straight through a gate whose whole subject is claims we
    # cannot honour.
    #
    # That is the TRIAL1 lesson a second time: the gate was drawn around
    # the examples that prompted it (compliance badges, then feature
    # chips) rather than around the property. An integrator's purchase
    # surface is a purchase surface.
    #
    # These rules ban NOTHING that exists. Each one names a thing the
    # product does not have, and the rule dies in the PR that builds it.

    Rule("unbuilt deedpro host",
         r"\b(?:api|app|status|docs|cdn)\.deedpro\.io\b",
         "The only hosts that exist are the marketing site and the Render "
         "app. `api.deedpro.io` and `app.deedpro.io` resolve to nothing — "
         "an integrator who copies one gets a DNS error, and a short-link "
         "host printed on a deed is worse than a broken link."),

    Rule("status page / operational claim",
         r"\bstatus\s+page\b|\ball\s+systems\s+operational\b",
         "No status page exists and nothing publishes availability. A "
         "status page is the first thing an integrator checks during an "
         "incident; pointing at one that does not exist is worst at the "
         "worst moment."),

    Rule("support tier / response time",
         r"\bP[123]\b[^.\n]{0,40}?\b(?:hour|business day|response|resolution)\b"
         r"|\b(?:response|resolution)\s+time[^.\n]{0,24}?\b\d+\s*(?:hour|minute|business day)"
         r"|\b2\s*a\.?m\.?\b[^.\n]{0,24}?\bescalat"
         r"|\bescalation\s+path\b|\bnamed\s+engineer\b|\bshared\s+slack\b",
         "There is no on-call rota, no ticket triage, and no support "
         "contract. A response-time table is a contractual commitment "
         "made by a marketing page."),

    Rule("SLA offered",
         r"\bDPA\s*\+\s*SLA\b"
         r"|\bSLA\b[^.\n]{0,24}?\b(?:available|offered|included|guaranteed)\b"
         r"|\b(?:available|offered|included)[^.\n]{0,16}?\bSLA\b",
         "No service level has been contractually offered to anybody. "
         "The uptime rule below guards the NUMBER; this guards the "
         "commitment, which can be claimed without one."),

    Rule("insurance",
         r"\b(?:E&O|errors\s+and\s+omissions|cyber(?:\s+liability)?)\b[^.\n]{0,24}?\binsuran"
         r"|\binsuran[^.\n]{0,24}?\b(?:E&O|errors\s+and\s+omissions|cyber\s+liability)\b",
         "No policy is in force. Insurance is a diligence checkbox a title "
         "company verifies against a certificate, so the claim fails at "
         "exactly the moment it is relied on."),

    Rule("security contact / disclosure programme",
         r"\bsecurity@deedpro\.io\b|\bPGP\b|\bsecurity\s+pack\b"
         r"|\b(?:CAIQ|SIG\s+Lite)\b",
         "There is no monitored security mailbox, no published key, no "
         "completed questionnaire and no pack to download. Publishing a "
         "disclosure address nobody reads is worse than publishing none: "
         "a researcher reports a real finding into a void."),

    Rule("deprecation notice period",
         r"\b\d+[\s\-]*months?\b[^.\n]{0,32}?\bdeprecat"
         r"|\bdeprecat[^.\n]{0,32}?\b\d+[\s\-]*months?\b",
         "No versioning policy has been written and no notice period has "
         "been committed. An integrator plans their own roadmap around "
         "this number."),

    Rule("data residency",
         r"\bnever\s+leaves?\s+the\s+(?:United\s+States|U\.?S\.?A?)\b"
         r"|\bdata\s+residency\b"
         r"|\b(?:US|U\.S\.)[\s\-]only\b[^.\n]{0,24}?\b(?:data|storage|infrastructure)\b",
         "PROVEN FALSE by ENTITY1, not merely unverified: the address "
         "autocomplete is browser-to-Google on every keystroke a user "
         "types, so property data leaves for a third party before it ever "
         "reaches us. This is the one rule here guarding a claim that was "
         "shipped and was wrong."),

    Rule("encryption standard",
         r"\bAES[\s\-]?256\b|\bencrypted\s+at\s+rest\b",
         "Nothing in this product configures its own encryption. Whatever "
         "Render and Postgres do at rest is theirs, undocumented by us and "
         "unverified by us. Naming a cipher asserts an implementation "
         "decision nobody made."),

    Rule("outbound webhook",
         r"\b(?:outbound|subscribe\s+to|register\s+an?|configure\s+an?)\s+webhook"
         r"|\bwebhooks?\b[^.\n]{0,24}?\b(?:available|supported|delivered|retried)\b",
         "Nothing emits an outbound webhook. Deliberately NOT a bare ban "
         "on the word: `billingPortal.ts` handles Stripe's INBOUND hook, "
         "and the homepage says 'there is no client, no webhook, no stub' "
         "— honest copy denying the feature, which a bare ban would flag "
         "as claiming it."),

    Rule("SDK / client library",
         r"\b(?:official\s+)?SDKs?\b|\bPostman\s+collection\b|\bclient\s+librar",
         "No SDK, no client library, no Postman collection exists in any "
         "language. cURL against a documented JSON contract is what we "
         "have, and saying so is stronger than promising a package."),

    Rule("our own entity, stated wrongly",
         r"\ba\s+Delaware\s+(?:corporation|company|LLC|Inc\.?)\b",
         "ENTITY1 established the counterparty: DeedPro Corporation, a "
         "WYOMING corporation. Scoped to the phrase 'a Delaware "
         "corporation' rather than the bare state name, because "
         "`vestingSplit.ts` matches 'A DELAWARE LIMITED LIABILITY "
         "COMPANY' in RECORDED VESTING LANGUAGE — somebody else's text on "
         "an instrument, which this gate must not touch."),

    Rule("unsourced interaction count",
         r"~?\s*\d+\s*clicks?\b|\bin\s+under\s+\d+\s*(?:seconds|minutes)\b",
         "Nobody measured it. '~9 clicks' shipped on the homepage twice "
         "with no instrumentation behind it, and a number a buyer can "
         "count is a number a buyer will count."),

    Rule("daily-use claim",
         r"\b(?:use[sd]?|using)\s+(?:it\s+)?daily\b"
         r"|\bdaily\b[^.\n]{0,16}?\bescrow\s+officers?\b",
         "We have no usage telemetry and no daily-active figure. Stating "
         "how often officers use the product describes a fact we have "
         "never observed."),
]


# An escape hatch that must say why, on the line it excuses.
#
# The alternative was a cleverer regex — require a "claim verb" near the
# product name, suppress on nearby negation. That road has been walked
# three times in this project and lost every time (CSS keyframes read as
# a percentage claim; a legitimate `status IN (...,'superseded')` read as
# a deeds statement). A pattern smart enough to tell "we integrate with
# SoftPro" from "we do not integrate with SoftPro" from "which system do
# you use? e.g. SoftPro" is a natural-language classifier, and a
# classifier in a blocking gate fails in whichever direction nobody
# predicted.
#
# So the exception is explicit, inline, and carries a reason a reviewer
# reads in the diff. Same posture as the six-flow harness: any deliberate
# divergence gets a comment citing why.
ALLOW_RX = re.compile(r"banned-claims:\s*allow\s+(\S.*)$", re.IGNORECASE)


def _blank_out(match: re.Match) -> str:
    """Replace a comment with its own newlines, so line numbers survive.

    Collapsing a six-line block comment to a single space renumbers every
    line beneath it, and a checker that reports the wrong line sends the
    next person hunting through a file for text that is not there.
    """
    return "\n" * match.group(0).count("\n")


def strip_comments(source: str, suffix: str) -> str:
    """Remove comments so prose ABOUT a claim never reads as the claim.

    Every removal in this ticket is documented in a comment that quotes
    the phrase it removed, because the next person needs to know what was
    there. Without this, the gate fails on its own remediation.
    """
    if suffix in {".html", ".jinja2"}:
        source = re.sub(r"<!--.*?-->", _blank_out, source, flags=re.DOTALL)
        return re.sub(r"\{#.*?#\}", _blank_out, source, flags=re.DOTALL)
    # JS/TS: block comments (which also covers JSX `{/* ... */}`) and
    # line comments.
    source = re.sub(r"/\*.*?\*/", _blank_out, source, flags=re.DOTALL)
    # `[^\S\n]*`, NOT `\s*`: `\s` matches newlines, so `^\s*//` greedily
    # eats any blank lines preceding a comment and the reported line
    # numbers drift by however many blank lines came before it. Found by
    # this checker mis-reporting a violation two lines off its real home.
    return re.sub(r"^[^\S\n]*//.*$", "", source, flags=re.MULTILINE)


def allowed_lines(raw: str) -> set[int]:
    return {i for i, line in enumerate(raw.splitlines(), start=1) if ALLOW_RX.search(line)}


def files_to_check():
    for base in SEARCH_DIRS:
        if not base.exists():
            continue
        for path in base.rglob("*"):
            if path.suffix not in SEARCH_SUFFIXES:
                continue
            if EXCLUDE_PARTS & set(path.parts):
                continue
            yield path


def scan():
    violations = []
    for path in files_to_check():
        try:
            raw = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        code = strip_comments(raw, path.suffix)
        exempt = allowed_lines(raw)
        for rule in RULES:
            for m in rule.rx.finditer(code):
                line = code[: m.start()].count("\n") + 1
                if line in exempt:
                    continue
                violations.append((path.relative_to(ROOT), line, rule, m.group(0).strip()))
    return violations


def main() -> int:
    violations = scan()
    if not violations:
        print(f"banned-claims: clean ({len(RULES)} rules over "
              f"{sum(1 for _ in files_to_check())} product-facing files)")
        return 0

    print("banned-claims: FAILED\n")
    print("A certification, compliance or integration claim was found in "
          "product-facing text.\nThe standing rule: it does not appear "
          "anywhere until it is actually true.\n")
    for path, line, rule, text in violations:
        print(f"  {path}:{line}")
        print(f"    matched : {text!r}  [{rule.name}]")
        print(f"    why     : {rule.why}\n")
    print("If the claim has BECOME true, delete its rule in the same PR "
          "that makes it true.\nIf you are writing ABOUT a removed claim, "
          "put it in a comment — comments are stripped.\nIf the line names "
          "the product WITHOUT claiming it (a denial, or a field asking "
          "which\nsystem the customer uses), append a trailing comment:\n"
          "    banned-claims: allow <why this is not a claim>")
    return 1


if __name__ == "__main__":
    sys.exit(main())
