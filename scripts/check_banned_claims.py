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
    Rule("bank-level security", r"bank[\s\-]?level\s+(?:security|encryption)",
         "A claim with no definition and no audit behind it. The product "
         "has no session revocation and no rate limiting."),
    Rule("military-grade", r"military[\s\-]?grade", "Marketing language for a claim nobody measured."),
    # PRICING1: the third spelling of the same unmeasured claim. It sat
    # on the marketing page directly above "Security you can verify in
    # the product — not badges", which is the sentence it contradicts.
    # Two rules for two phrasings and a miss on the third is the pattern
    # this gate keeps repeating: enumerate the property, not the
    # examples that prompted it.
    Rule("enterprise-grade", r"enterprise[\s\-]?grade",
         "Same class as bank-level and military-grade: a superlative with "
         "no definition and no audit behind it."),
    # The `[^.\n]{0,24}?` gap is the whole point. The first version of this
    # rule required the keyword to follow the percentage immediately, and
    # it pinned the four spellings that happened to exist. Its own test
    # then caught "99.9% API uptime" — one word in between, straight
    # through the gate. Same lesson as everywhere else in this project: a
    # pin that guards a spelling does not guard a property. Bounded to a
    # single sentence on a single line so it stays a claim, not a
    # coincidence of two numbers sharing a paragraph.
    Rule("uptime SLA",
         r"\b99(?:\.9+)?\s*%[^.\n]{0,24}?\b(?:uptime|sla|availability)\b"
         r"|\buptime\s+sla\b"
         r"|\b(?:uptime|availability)[^.\n]{0,24}?\b99(?:\.9+)?\s*%",
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
    Rule("team management / seats", r"\b(?:team management|multi[\s\-]user seats?|user seats?)\b",
         "`deeds` carries one user_id and every query is scoped to it. "
         "There is no team model to manage (RED-S5, deferred by decision)."),
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
