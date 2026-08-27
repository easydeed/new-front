"""PCOR-WIZ step 1 — the field split, as data. No UI, no wizard, no route.

═══ WHAT THIS IS AND WHY IT SHIPS ALONE ═══

PCOR-WIZ lets a buyer answer facts about their own purchase so the
Preliminary Change of Ownership Report is not a form the escrow officer
fills from guesswork. The boundary, owner-ruled and not reopening: **the
buyer answers facts about their own transaction; Part 1's seventeen
reassessment exclusions route to the officer.**

Those boxes are legal characterizations sworn under penalty of perjury.
"Solely between spouses" covers a divorce settlement mid-decree, a spouse
added who is not on the loan, a domestic partnership never registered with
the Secretary of State. **A consumer with no counsel must not be asked them
by us**, and the protection is structural before it is disclosed — a
disclaimer over an interface that asks the question anyway has protected
nobody.

This module is that structure and nothing else. It ships before any surface
exists **on purpose**: if the wizard's data path is built first and the
filter arrives after, there is a window in which the only thing closing it
is somebody remembering. Building the filter first makes the window
impossible rather than short.

═══ WHY AN ENUMERATED ALLOWLIST AND NEVER A PATTERN ═══

The obvious implementation reads the letter prefix — Part 1 is items A
through Q, so match on the letter. **It is wrong in both directions and
looks like a working implementation in both.**

  · The form REUSES letters across parts. `A. This transfer is solely
    between spouses...` is a Part 1 exclusion. `A. Type of property
    transferred...` is Part 2, and so is `A. Date of transfer`. A prefix
    rule either sweeps facts into the officer's pile or, tuned the other
    way, lets an exclusion through.

  · Item L1's three sub-checkboxes CARRY NO LETTER AT ALL. They are named
    `This is a transfer of property 1. to/from a revocable trust...` —
    indistinguishable by prefix from any ordinary field, and each one a
    claim about a trust. So is item Q's free text.

So membership here is a DECISION, not a derivation (§14.15). Every one of
these names was put here by someone. That does not prevent a future
classifier from being wrong; it makes being wrong survivable, because the
protection does not depend on the classifier at all.

═══ THE LITERALS WERE GENERATED, NOT TYPED, AND THAT MATTERS ═══

Two of the 57 names contain characters that are invisible in an editor:

  · item A's `yes` box carries U+00AD SOFT HYPHEN
  · item J's `no` box carries U+2011 NON-BREAKING HYPHEN

Both look like an ordinary hyphen. **A hand-transcribed allowlist would
carry two entries that match nothing** — and a name that matches nothing
protects nothing, silently, while the file reads as complete. They appear
below as `\\xad` and `\\u2011` escapes so they are visible as what they are.

`test_pcor_field_split.py` asserts every name here EXISTS in the reference
PDF, which is the pin that would have caught a typed one.
"""
from __future__ import annotations

from typing import FrozenSet, Set

# ═══ OFFICER-ONLY — never rendered to a buyer, in any form ═══════════
#
# Not "not editable". Not greyed out. Not captioned "your escrow officer
# will complete this". **Not sent to the surface at all** — a wizard that
# displays the seventeen exclusions disabled has still asked a consumer the
# question, and some of them will call and argue for one.
#
# 57 names: Part 1's 44 lettered widgets, its 5 unlettered ones, 7 moved
# here by §14.23, and the transfer date.
#
# THE 57th WAS FOUND BY THE TRIPWIRE, NOT BY THE ENUMERATION. Item J's
# "if yes, please explain" free text carries no letter AND a county typo
# ("recorded only a requirement"), so it survived a careful manual pass
# over the field list. `test_nothing_shaped_like_an_exclusion_reaches_the
# _buyer` caught it on its first run — a pattern too unreliable to
# classify with is still worth having as an ALARM, and this is the
# evidence for keeping both.
OFFICER_ONLY: FrozenSet[str] = frozenset({
    'A. Date of transfer, if other than recording date',
    'A. This transfer is solely between spouses (addition or removal of a spouse, death of a spouse, divorce settlement, etc.)_no1',
    'A. This transfer is solely between spouses (addition or removal of a spouse, death of a spouse, divorce settlement, etc.)\xadyes',
    'B. This transfer is solely between domestic partners currently registered with the California Secretary of State (addition or removal of a partner, death of a partner, termination settlement, etc.)_no',
    'B. This transfer is solely between domestic partners currently registered with the California Secretary of State (addition or removal of a partner, death of a partner, termination settlement, etc.)_yes',
    'C. This is a transfer between parent(s) and child(ren)',
    'C. This is a transfer between parent(s) and child(ren)_1',
    'C. This is a transfer between: parents and children or grandparents and grandchildren_no',
    'C. This is a transfer between: parents and children or grandparents and grandchildren_yes',
    "D.This transfer is the result of a cotenant's death_no",
    "D.This transfer is the result of a cotenant's death_yes",
    'DATE OF DEATH',
    'E. Outstanding balance',
    'E. This transaction is to replace a principal residence by a person 55 years of age or older_no',
    'E. This transaction is to replace a principal residence by a person 55 years of age or older_yes',
    'E. Was an improvement Bond or other public financing assumed by the buyer?',
    'E. Was an improvement bond or other public financing assumed by the buyer_no',
    'F. This transaction is to replace a principal residence by a person who is severely disabled. No',
    'F. This transaction is to replace a principal residence by a person who is severely disabled. Yes',
    'G. This transaction is to replace a principal residence substantially damaged or destroyed by a wildfire or natural disaster for which the Governor proclaimed a state of emergency. No',
    'G. This transaction is to replace a principal residence substantially damaged or destroyed by a wildfire or natural disaster for which the Governor proclaimed a state of emergency. Yes',
    'H. Explain any special terms, seller concessions, broken/agent fees waived, financing and any other information (e.g. buyer assumed the existing loan balance) that would assist the Assessor in the valuation of your property',
    'H. This transaction is only a correction of the name(s) of the person(s) holding title to the property (e.g. a name change upon marriage)',
    'H. This transaction is only a correction of the name(s) of the person(s) holding title to the property (e.g. a name change upon marriage) If yes, please explain: _ no',
    'H. This transaction is only a correction of the name(s) of the person(s) holding title to the property (e.g. a name change upon marriage) If yes, please explain: _ yes',
    "I. The recorded document creates, terminates, or reconveys a lender's interest in the property. Yes",
    "I. The recorded document creates, terminates, or reconveys a lender's interest in the property_no",
    'J. This transaction is recorded only as a requirement for financing purposes or to create, terminate, or reconvey a security interest (e.g., cosigner) Yes',
    'J. This transaction is recorded only as a requirement for financing purposes or to create, terminate, or reconvey a security interest (e.g., cosigner)\u2011no',
    'K. The recorded document substitutes a trustee of a trust, mortgage, or other similar documentI. The recorded document substitutes a trustee of a trust, mortgage, or other similar document. Yes',
    'K. The recorded document substitutes a trustee of a trust, mortgage, or other similar documentI. The recorded document substitutes a trustee of a trust, mortgage, or other similar document_no',
    "L1. This is a transfer of property to/from a revocable trust that may be revoked by the transferor and is for the benefit of the transferor and/or the transferor's spouse and/or registered domestic partner Yes",
    "L1. This is a transfer of property to/from a revocable trust that may be revoked by the transferor and is for the benefit of the transferor and/or the transferor's spouse and/or registered domestic partner_no",
    'L2. This is a transfer of property to/from an irrevocable trust for the benefit of the creator/grantor/trustor and/or',
    "L2. This is a transfer of property to/from an irrevocable trust for the benefit of the creator/grantor/trustor and/or grantor's trustor's spouse grantor's/trustor's registered domestic partner No",
    "L2. This is a transfer of property to/from an irrevocable trust for the benefit of the creator/grantor/trustor and/or grantor's trustor's spouse grantor's/trustor's registered domestic partner Yes",
    "L2. This is a transfer of property to/from an irrevocable trust for the benefit of the grantor's/trustor's registered domestic partner",
    "L2. This is a transfer of property to/from an irrevocable trust for the benefit of the grantor's/trustor's spouse",
    'M. This property is subject to a lease with a remaining lease term of 35 years or more including written options Yes',
    'M. This property is subject to a lease with a remaining lease term of 35 years or more including written options_no',
    'N. This is a transfer between parties in which proportional interests of the transferor(s) and transferee(s) in each and every parcel being transferred remain exactly the same after the transfer no',
    'N. This is a transfer between parties in which proportional interests of the transferor(s) and transferee(s) in each and every parcel being transferred remain exactly the same after the transfer yes',
    'O. This is a transfer subject to subsidized low-income housing requirements with governmentally imposed restrictions imposed by specified nonprofit corporations no',
    'O. This is a transfer subject to subsidized low-income housing requirements with governmentally imposed restrictions imposed by specified nonprofit corporations yes',
    'P. This transfer is to the first purchaser of a new building containing a leased active solar engery system',
    'P. This transfer is to the first purchaser of a new building containing a leased or owned active solar energy system. No',
    'P. This transfer is to the first purchaser of a new building containing a leased or owned active solar energy system. Yes',
    'P. This transfer is to the first purchaser of a new building containing an owned active solar engery system',
    'Q. Other. This transfer is to Yes',
    'Q. Other. This transfer to no',
    'Q. Other. his transfer is to',
    'This transaction is recorded only a requirement for financing purposes or to create, terminate, or reconvey a security interest (e.g. cosigner).  If yes, please explain',
    'This is a transfer of property 1. to/from a revocable trust that may be revoked by the transferor and is for the benefit of register domestic partner',
    "This is a transfer of property 1. to/from a revocable trust that may be revoked by the transferor and is for the benefit of the transferor's spouse",
    'This is a transfer of property 1. to/from a revocable trust that may be revoked by the transferor and is for the benefit of the transferor, and/or',
    'original term in years (including written options)',
    'remaining term in years (including written options)',
})

# ═══ ALREADY FILLED FROM THE DEED ════════════════════════════════════
#
# Written today by `services/boe_form_fill.values_from_deed`. Listed here
# so the three buckets sum to the measured widget count and a field cannot
# quietly belong to none of them.
FILLED_FROM_DEED: FrozenSet[str] = frozenset({
    'Name and mailing address of buyer/transferee',
    'ZIP code',
    'Assessors parcel number',
    'seller transferor',
    'street address or physical location of real property',
    'mail property tax information to (name)',
    # sic — "informatino" is the county's typo. The map reproduces it
    # exactly or the write silently misses.
    'Mail property tax informatino to address',
    'city',
    'state',
})


def buyer_answerable(all_field_names: Set[str]) -> FrozenSet[str]:
    """Everything that is neither ours to fill nor the officer's to decide.

    Derived by SUBTRACTION on purpose. A positively-enumerated buyer list
    would need a decision per field to stay complete, and the failure mode
    of forgetting one is that a new field silently reaches a consumer.
    Subtracting means the default for anything unrecognised is **not the
    buyer** — a new field added by a county revision lands nowhere until
    somebody places it.
    """
    return frozenset(all_field_names) - OFFICER_ONLY - FILLED_FROM_DEED


def is_officer_only(field_name: str) -> bool:
    """Exact match, no normalisation. Case-folding or hyphen-normalising
    here would defeat the invisible-character point above: the whole value
    of the allowlist is that it matches the PDF's bytes, not something
    that looks like them."""
    return field_name in OFFICER_ONLY
