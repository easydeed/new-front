"""Doctrine B — the AI boundary: EXPLAIN YES, SELECT NO.

═══ THE RULE ═══

The assistant may explain what an instrument DOES. It may not tell an
officer which instrument to USE.

    ALLOWED   "A quitclaim deed conveys whatever interest the grantor
               has, with no warranties. A grant deed carries two implied
               warranties under Civil Code §1113."
    ALLOWED   "Interspousal transfers are commonly exempt from
               documentary transfer tax under R&T §11927."
    FORBIDDEN "You should use a quitclaim deed for this."
    FORBIDDEN "An interspousal transfer deed is the right choice here."
    FORBIDDEN "I'd go with a grant deed."

The line is not about tone, hedging, or confidence. It is about WHO
DECIDES. Every one of the allowed sentences leaves the officer holding
the decision; every forbidden one takes it.

═══ WHY THIS LINE AND NOT ANOTHER ═══

This product's architecture is suggest → confirm → record, and every
doctrine section is a variation on it: the system proposes, the officer
accepts, the acceptance is what records. §1 says a legal choice is never
auto-applied. §11 says a field's kind is decided by its content, so a
characterization cannot hide inside a fact.

The assistant was the hole in all of it. Prose to an escrow officer
inside a deed builder is the largest legal-influence surface in the
product, and it had no suggestion marker, no confirmation, and — until
RED-H1.3 — no record. The confirmation trail could prove exactly which
DATA the officer accepted and nothing whatsoever about what the machine
told her first. That asymmetry points the wrong way in a dispute.

Selecting the instrument is the largest legal choice in the workflow. It
determines warranties, transfer-tax treatment, reassessment exposure and
what the officer's carrier will say afterwards. A non-attorney provider
recommending it is the exposure the whole architecture exists to avoid —
and it was being done by a prompt that literally read "help users select
the appropriate deed type for their transaction."

Explanation is the opposite. An officer who understands the difference
between a grant deed and a quitclaim decides BETTER. Removing the
explanation would make the product worse and the officer no safer, which
is why the boundary is drawn at selection and not at silence.

═══ THREE LAYERS, AND WHAT EACH ONE ACTUALLY DOES ═══

  1. THE PROMPT states the boundary in the system message, every key,
     every call. This is the layer that PREVENTS.

  2. THIS SCANNER reads every response before it is returned and records
     what it finds. This layer DETECTS. It does not block — see below.

  3. THE TESTS ask the forbidden questions against a corpus of the
     answers a model actually gives, and pin explanation-present /
     selection-absent.

═══ WHY THE SCANNER FLAGS AND DOES NOT BLOCK ═══

Stating this plainly because a reader who assumes otherwise will trust
something that does not exist:

**A flagged response is still returned to the officer.**

Blocking on a regex would mean a false positive silently swallows a
correct, useful answer mid-file — and the officer would have no idea a
sentence had been taken from her. The prompt is the prevention; this is
the instrument panel. What it buys is that the boundary becomes a
MEASURABLE property of shipped behaviour instead of a promise: flags land
in `ai_exchange_log.boundary_flags` beside the exchange that produced
them, so the question "is the assistant staying inside the line?" has an
answer somebody can query.

If flags accumulate, the escalation is a prompt change or a hard refusal
— a ruling made on the flag data, which is exactly the mistake RED-H1.3
refused to repeat by ruling the boundary before the log existed.
"""
from __future__ import annotations

import json
import os
import re
from typing import Dict, List, NamedTuple, Optional

# ── The boundary, in the words the model is given ────────────────────

BOUNDARY = (
    "BOUNDARY — you may EXPLAIN, you may not SELECT. Explain what any "
    "instrument, vesting or exemption does, how it differs from another, "
    "and what consequences follow from each. Never tell the user which "
    "one to use, never call one 'the right' or 'the best' or 'the "
    "appropriate' choice for their situation, and never phrase an "
    "explanation as a recommendation. When asked which to choose, "
    "explain the difference and say plainly that the choice is theirs."
)

# The sentence the assistant is expected to reach for when asked to
# choose. Pinned as a phrase because the tests assert it is REACHABLE,
# not because the model must produce it verbatim.
DEFERRAL = "the choice is yours"


# ── What counts as an instrument ─────────────────────────────────────
#
# Built from the deed-type registry so a new instrument cannot be added
# to the product and stay invisible to this scanner. The natural-language
# forms are added by hand because a model writes "quitclaim deed", never
# "quitclaim-deed".

def _from_registry() -> List[str]:
    from services.form_families import FAMILY_BY_DEED_TYPE
    return [k.replace("-", " ").replace("_", " ") for k in FAMILY_BY_DEED_TYPE]


_NATURAL = [
    "grant deed", "quitclaim deed", "quit claim deed", "quitclaim",
    "interspousal transfer deed", "interspousal transfer", "interspousal deed",
    "warranty deed", "tax deed", "trust transfer deed", "gift deed",
    "affidavit of death", "affidavit of death of joint tenant",
    "declaration of homestead", "homestead declaration",
    "certification of trust", "revocation of transfer on death deed",
    "transfer on death deed", "substitution of trustee",
    "power of attorney", "deed of trust",
]


def instrument_terms() -> List[str]:
    """Every phrase that names an instrument, longest first.

    Longest-first matters: "affidavit of death of joint tenant" must win
    over "affidavit of death", or a flag would name the wrong document.
    """
    terms = set(_NATURAL) | set(_from_registry())
    return sorted(terms, key=len, reverse=True)


def _instrument_rx() -> "re.Pattern[str]":
    return re.compile(
        r"\b(?:" + "|".join(re.escape(t) for t in instrument_terms()) + r")\b",
        re.IGNORECASE)


# ── What counts as selecting ─────────────────────────────────────────
#
# MATCH STATEMENTS, NOT STRINGS. The word "recommend" appearing anywhere
# is not a violation — "recommend consulting an attorney" is the OPPOSITE
# of selecting, and it is in our own prompts. What makes a sentence a
# selection is a recommendation cue POINTED AT AN INSTRUMENT.

_CUES: List[str] = [
    r"\byou (?:should|ought to|need to|must|will want to|'ll want to)\b",
    r"\bI(?:'d| would)? (?:recommend|suggest|advise|go with)\b",
    r"\bI recommend\b",
    r"\bwe (?:recommend|suggest|advise)\b",
    r"\b(?:the )?(?:best|right|correct|appropriate|proper|preferred) (?:option|choice|instrument|document|deed|form|one|route|approach|vehicle)\b",
    r"\b(?:is|would be) (?:the )?(?:best|right|correct|appropriate|proper) (?:option|choice|one|fit|instrument|deed|form)\b",
    r"\bgo with (?:a|an|the)\b",
    r"\bopt for (?:a|an|the)\b",
    r"\byour best bet\b",
    r"\bwhat you (?:want|need) (?:here )?is\b",
    # The same statement, reversed. "A quitclaim deed is what you want"
    # says exactly what "what you want is a quitclaim deed" says, and an
    # earlier cut of this list caught only one word order — which is the
    # difference between a rule and a rule's spelling.
    r"\bis what you (?:want|need)\b",
    r"\bin your case,? (?:use|choose|file|record)\b",
    # IMPERATIVE ONLY, and this one took two tries to get right.
    #
    # The first version was a bare `(?:use|choose|file|record) (a|an|the)`,
    # which flagged "the parties MAY USE a grant deed or a quitclaim" and
    # "escrow officers commonly USE a grant deed" — both pure
    # explanation, both exactly what the boundary protects. Describing
    # what parties may do is not directing this officer to do it.
    #
    # The difference is the SUBJECT: "the parties use", "officers use",
    # "you can use" all have one. An imperative has none, and that is
    # what makes it an instruction. Anchoring at the start of a sentence
    # is how you say "no subject" in a regex.
    r"(?:\A|(?<=[.!?]\s))(?:use|choose|select|file|record|draw|draft) (?:a|an|the)\b",
]

_CUE_RX = re.compile("|".join(f"(?:{c})" for c in _CUES), re.IGNORECASE)

# A cue is NOT a selection when it points at professional referral. This
# is the single most common legitimate use of "recommend" in this domain,
# it is in our own prompts, and flagging it would bury the real signal
# under noise nobody reads.
_REFERRAL_RX = re.compile(
    r"\b(?:attorney|lawyer|counsel|tax advisor|tax professional|cpa|"
    r"accountant|title officer|legal (?:advice|professional|counsel))\b",
    re.IGNORECASE)

# How close a cue and an instrument must be to read as one statement.
# Wide enough for "you should use a grant deed", narrow enough that a
# paragraph explaining grant deeds followed by an unrelated "I recommend
# consulting an attorney" does not collide.
WINDOW = 120

# How far AFTER a cue we look for a referral before treating the cue as
# professional-referral rather than instrument-selection.
REFERRAL_WINDOW = 60

CASES_PATH = os.path.join(os.path.dirname(__file__), "ai_boundary_cases.json")


class BoundaryFlag(NamedTuple):
    """One place a response reads as choosing rather than explaining."""

    cue: str
    instrument: str
    excerpt: str

    def as_dict(self) -> Dict[str, str]:
        return {"cue": self.cue, "instrument": self.instrument,
                "excerpt": self.excerpt}


def scan(response: Optional[str]) -> List[BoundaryFlag]:
    """Find recommendation language pointed at an instrument name.

    Returns an empty list for anything it cannot read — this runs in the
    response path and must never be the reason an officer loses an
    answer she already paid for.
    """
    if not response:
        return []
    try:
        text = " ".join(response.split())
        instruments = list(_instrument_rx().finditer(text))
        if not instruments:
            # No instrument named: whatever else this says, it is not
            # telling her which document to use.
            return []

        flags: List[BoundaryFlag] = []
        seen = set()
        for cue in _CUE_RX.finditer(text):
            # Professional referral is not instrument selection.
            after = text[cue.end():cue.end() + REFERRAL_WINDOW]
            if _REFERRAL_RX.search(after):
                continue
            for inst in instruments:
                gap = (inst.start() - cue.end() if inst.start() >= cue.end()
                       else cue.start() - inst.end())
                if gap > WINDOW or gap < -WINDOW:
                    continue
                key = (cue.group(0).lower(), inst.group(0).lower())
                if key in seen:
                    continue
                seen.add(key)
                lo = max(0, min(cue.start(), inst.start()) - 20)
                hi = min(len(text), max(cue.end(), inst.end()) + 20)
                flags.append(BoundaryFlag(
                    cue=cue.group(0), instrument=inst.group(0),
                    excerpt=text[lo:hi]))
        return flags
    except Exception:  # pragma: no cover - a detector must not throw
        return []


def flags_json(response: Optional[str]) -> Optional[str]:
    """The scan, in the shape the log column stores. None when clean, so
    a clean exchange costs nothing and `WHERE boundary_flags IS NOT NULL`
    is the whole query."""
    found = scan(response)
    if not found:
        return None
    return json.dumps([f.as_dict() for f in found])
