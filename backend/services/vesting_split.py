"""Doctrine A — a vested-owner string is a name PLUS a characterization.

═══ THE RULE, AND WHERE IT IS WRITTEN ═══

`docs/integrations/H1_CONTRACT.md` §2.2, verbatim:

    2.2 — Mixed content is emitted split, never whole.
    A vested-owner string such as `JOHN DOE AND JANE DOE, HUSBAND AND
    WIFE AS JOINT TENANTS` is a name PLUS a legal characterization.
    TitleSense emits the parties as facts and the vesting
    characterization as a separate interpreted field. TitleSense never
    emits the composite string as a single value in a fact position. The
    composite may be carried in `verbatim` for audit, flagged
    `mixed_content: true`.

That is the WIRE law. This module is the same law INSIDE the product, so
the two cannot drift: a rule enforced only at the boundary is a rule the
product breaks internally and exports correctly.

RED0 found the identical defect from the inside (R3-2): DeedPro's
taxonomy is drawn by field NAME rather than by CONTENT, and the one field
whose content is mixed — `vested_owner` — slipped through on its label.
Both the prelim parser and the SiteX prefill were landing the composite
in a FACT position as a single candidate.

═══ WHY THE HALVES ARE DIFFERENT KINDS OF THING ═══

  "JOHN A. DOE AND JANE B. DOE"        → a FACT. Who is named on the
                                          instrument. Transcription.
  "HUSBAND AND WIFE AS JOINT TENANTS"  → an INTERPRETATION. How title is
                                          held: a legal characterization
                                          with consequences for
                                          survivorship, severability and
                                          the form of the next deed.

Landing the second in a fact position asks the officer to CONFIRM a legal
conclusion using the same amber affordance she uses to confirm an APN.
The confirmation record then shows her accepting a transcription when
what she accepted was a characterization — which is doctrine §1's exact
prohibition, wearing a data label.

═══ THE CHARACTERIZATION WE READ IS THE OLD ONE ═══

Worth saying once, loudly, because the mistake is easy and expensive:
this string describes how the CURRENT owner holds title. It is not how
the grantees will hold title under the deed being drafted. It informs
that decision — who must sign, whether a survivorship recital is needed —
and it never makes it. Everything downstream carries a basis line saying
so, and nothing is ever pre-selected from it.

═══ WHEN WE CANNOT TELL ═══

A string we cannot confidently split is NOT guessed apart and NOT passed
through whole into a fact position. It is carried verbatim, flagged, and
the officer is asked. That is the same posture as T-6's refusal on a
scanned prelim: an honest "we could not read this" beats a confident
wrong answer, and the failure mode we are protecting against is
specifically a SILENT one.

The case that forced the rule:

    JOHN DOE, AN UNMARRIED MAN AND MARY ROE, A SINGLE WOMAN,
    AS TENANTS IN COMMON

Splitting at the first marker puts MARY ROE inside the characterization
and drops a real owner out of the fact position. A missing grantor is
worse than an unsplit string, so a name appearing BETWEEN two markers
means we do not split at all.
"""
from __future__ import annotations

import json
import os
import re
from typing import Dict, List, NamedTuple, Optional

# Characterization markers, most specific phrase first inside each
# family so the longer form wins.
#
# NOT an attempt to enumerate every possible vesting. It does not need to
# be: an unrecognised string falls through as a plain name, and a
# half-recognised one falls to the flagged path — both safe directions. A
# list that tried to be exhaustive would fail CONFIDENTLY on the one it
# got wrong.
#
# MIRRORED, character for character, in frontend/src/lib/vestingSplit.ts.
# `backend/services/vesting_cases.json` is what actually holds the two
# implementations together; this list is pinned as well because a
# divergence caught at the pattern is cheaper to read than one caught at
# a behaviour.
MARKERS: List[str] = [
    r"AS COMMUNITY PROPERTY WITH RIGHT[S]? OF SURVIVORSHIP",
    r"AS COMMUNITY PROPERTY",
    r"AS JOINT TENANTS WITH RIGHT[S]? OF SURVIVORSHIP",
    r"AS JOINT TENANTS",
    r"AS TENANTS IN COMMON",
    r"AS TENANTS BY THE ENTIRETY",
    r"AS (?:HIS|HER|THEIR) SOLE AND SEPARATE PROPERTY",
    r"AN UNMARRIED (?:MAN|WOMAN|PERSON)",
    r"A MARRIED (?:MAN|WOMAN|PERSON)",
    r"A SINGLE (?:MAN|WOMAN|PERSON)",
    r"A WIDOW(?:ER)?",
    r"HUSBAND AND WIFE",
    r"WIFE AND HUSBAND",
    r"REGISTERED DOMESTIC PARTNERS",
    r"TRUSTEE[S]? (?:OF|UNDER)",
    r"(?:A|AN) (?:CALIFORNIA |DELAWARE )?(?:LIMITED LIABILITY COMPANY|LIMITED PARTNERSHIP|GENERAL PARTNERSHIP|CORPORATION|PARTNERSHIP|LLC)",
]

# \b at both ends so a marker cannot match inside a longer word — the
# reason "A MARRIED MAN" must not fire on "A MARRIED MANAGER".
_MARKER_RX = re.compile(
    r"\b(?:" + "|".join(f"(?:{m})" for m in MARKERS) + r")\b", re.IGNORECASE
)

# What may legitimately sit BETWEEN two characterization markers: joining
# words and punctuation, nothing else. Anything else is a name, and a
# name there means the string is not ours to split.
#
# MIRRORED in vestingSplit.ts.
_SEPARATOR_ONLY = re.compile(
    r"^[\s,;&/()\.-]*(?:\b(?:AND|OR)\b[\s,;&/()\.-]*)*$", re.IGNORECASE
)

_EDGE = " ,;"

CASES_PATH = os.path.join(os.path.dirname(__file__), "vesting_cases.json")


class VestedOwner(NamedTuple):
    """The split. `parties` is a fact; `characterization` is not."""

    verbatim: str
    parties: Optional[str]
    characterization: Optional[str]
    mixed_content: bool
    # True when we could not split confidently. The composite is then
    # carried for audit and NOTHING is offered as a fact.
    needs_review: bool


def split_vested_owner(raw: Optional[str]) -> Optional[VestedOwner]:
    """Split a vested-owner string into its fact and its interpretation.

    Returns None for an empty input — absence is not a candidate (U0).
    """
    if raw is None:
        return None
    # Runs of whitespace collapse BEFORE matching. A PDF text layer wraps
    # mid-phrase, and a marker that straddles a newline is a marker we
    # never find — which would silently promote a composite to a fact.
    text = " ".join(raw.split()).strip(_EDGE)
    if not text:
        return None

    matches = list(_MARKER_RX.finditer(text))
    if not matches:
        # A bare name is a fact, whole. The common and safe case:
        # "JOHN A. DOE" carries no characterization to strip.
        return VestedOwner(verbatim=text, parties=text, characterization=None,
                           mixed_content=False, needs_review=False)

    # A name sitting between two markers means there are parties on BOTH
    # sides of the first one. Cutting there loses an owner.
    for earlier, later in zip(matches, matches[1:]):
        if not _SEPARATOR_ONLY.match(text[earlier.end():later.start()]):
            return VestedOwner(verbatim=text, parties=None,
                               characterization=None,
                               mixed_content=True, needs_review=True)

    first = matches[0]
    parties = text[:first.start()].strip(_EDGE)
    characterization = text[first.start():].strip(_EDGE)

    if not parties:
        # The whole string is a characterization with no name in front of
        # it. We have no fact to offer, and inventing one from the
        # characterization would be exactly backwards.
        return VestedOwner(verbatim=text, parties=None,
                           characterization=characterization,
                           mixed_content=True, needs_review=True)

    return VestedOwner(verbatim=text, parties=parties,
                       characterization=characterization,
                       mixed_content=True, needs_review=False)


def as_candidates(raw: Optional[str], source: str) -> Dict[str, object]:
    """The split, in the shape both import paths hand to the builder.

    THE CONTRACT OF THIS FUNCTION, and the reason it exists rather than
    each caller doing its own thing:

      - `owner`            a FACT candidate — parties only, never the
                           composite. Absent when we could not split.
      - `vesting_proposal` an INTERPRETATION — violet, unconfirmed, and
                           it does NOT occupy a fact position. It carries
                           its own basis so the officer accepting it
                           knows whose reading it is (§2.3's principle,
                           applied internally).
      - `verbatim`         audit only. Never rendered as a value, never
                           confirmable, flagged `mixed_content`.

    A caller that wants "the owner string" gets the parties. There is no
    accessor that returns the composite as a value, because the composite
    is not a value — it is two things that were printed together.
    """
    split = split_vested_owner(raw)
    if split is None:
        return {}

    out: Dict[str, object] = {
        "verbatim": split.verbatim,
        "mixed_content": split.mixed_content,
    }

    if split.parties and not split.needs_review:
        out["owner"] = {
            "value": split.parties,
            "source": source,
            "status": "candidate",
        }

    if split.characterization:
        out["vesting_proposal"] = {
            "value": split.characterization,
            "source": source,
            # NOT 'candidate'. A legal choice is never auto-applied and
            # never sits in candidate state inside the deed — it is
            # proposed, and the officer's acceptance is what writes it.
            "status": "proposed",
            "basis": basis_for(source, split.characterization),
        }

    if split.needs_review:
        out["needs_review"] = (
            "This vesting line could not be separated into a name and a "
            "vesting characterization. Enter the parties and the vesting "
            "yourself, using the original as printed."
        )

    return out


def basis_for(source: str, characterization: str) -> str:
    """Whose reading this is, in words the officer sees at decision time.

    §2.3 makes `basis.claimant` mandatory on the wire because two
    proposals of equal confidence can carry unequal warrant. The same is
    true inside: "the preliminary report states this" and "the county
    record shows this" are different claims, and the officer accepting
    one deserves to know which.

    The second sentence is not decoration. It is the only thing standing
    between "how the seller holds title" and "how the buyers will hold
    title" — two different questions that happen to be answered in the
    same words.
    """
    whose = {
        "prelim": "The preliminary title report states",
        "titlesense.prelim_extraction": "The preliminary title report states",
        "sitex": "The county record shows",
        "titlepoint": "The title plant shows",
    }.get(source, "The source document states")
    return (
        f'{whose} the CURRENT owner holds title "{characterization}". '
        f"That is how title is held today; how the grantees will hold it "
        f"under this deed is your decision."
    )
