"""RED-H1.3 — the assistant's system prompts, owned by the server.

═══ WHY THESE MOVED ═══

`POST /api/ai/chat` accepted `system` from the client. Any authenticated
user could send an arbitrary system prompt and an arbitrary `max_tokens`
against the company's OpenAI key: a general-purpose LLM on our card, with
no per-user cap, no rate limit, and no record of what was asked or
answered.

The client now sends a KEY. The prompt text lives here, and a key that is
not in this registry is refused rather than defaulted — because a default
would recreate the hole with extra steps.

═══ DOCTRINE B — THE BOUNDARY IS NOW APPLIED HERE ═══

RED-H1.3 contained the mechanism and deliberately left the content
alone, flagging one prompt for the reader's attention:

    `deed_type_advisor` instructed the model to help a user "select the
    appropriate deed type for their transaction."

That is instrument selection — the thing the doctrine's whole
suggest/confirm/record architecture exists to keep in the officer's
hands, and the thing a non-attorney provider recommending it is most
exposed on. It was live, driven by a prompt the CLIENT supplied, with no
confirmation gate and no record.

Doctrine B rules the boundary: **explain yes, select no**
(`services/ai_boundary.py`, `docs/DOCTRINE_CONFORMANCE.md` §12). Two
things changed in this file:

  1. `_STANDING` now STATES the boundary rather than gesturing at it.
     "Do not provide legal advice" is a disclaimer; "you may explain,
     you may not select, and when asked to choose say the choice is
     theirs" is an instruction with an observable failure mode.

  2. `deed_type_advisor` was REWRITTEN, not deleted. Its purpose is now
     explaining how instruments differ — the half the boundary permits,
     and the half that makes an officer decide better. Deleting it would
     have removed the explanation and left her no safer.

That rewrite was made on the boundary ruling alone. The usage evidence
RED-H1.3 built the log to collect did not exist yet (two days of an
empty table), and the boundary decides the prompt regardless of what the
log holds — a "help users select" prompt cannot survive select-no. What
the evidence would have shaped is HOW MUCH explanation officers want,
which is ledgered as a deferred tuning pass, not a pending gate.
"""
from typing import Dict, Optional

from services.ai_boundary import BOUNDARY

# Every response carries a standing instruction that the model is not the
# decider. RED-H1.3 shipped the first sentence of this because a bounded
# system prompt beats one the caller writes; Doctrine B added the
# boundary itself, because "do not provide legal advice" is a phrase a
# model can satisfy while telling an officer which deed to draw.
#
# This is the layer that PREVENTS. `ai_boundary.scan` only detects.
_STANDING = (
    "You are assisting a California escrow or title professional who is "
    "preparing a document. You do not make decisions: the professional "
    "using this software decides, and their confirmation is what records. "
    "Never state that a choice has been made or applied. Do not provide "
    "legal advice.\n\n"
    f"{BOUNDARY}"
)

# Ported from the client by RED-H1.3. `deed_type_advisor` was rewritten
# by Doctrine B; the rest stand as ported.
PROMPTS: Dict[str, str] = {
    "vesting_guidance": (
        "You are an expert California real estate title officer. Your role is to "
        "help users understand vesting options when transferring property.\n\n"
        "Be concise but thorough. Focus on practical implications:\n"
        "- Tax consequences\n- Estate planning effects\n"
        "- Rights of survivorship\n- Creditor protection\n\n"
        "Always recommend consulting with an attorney or tax advisor for complex "
        "situations.\n\nRespond in 2-3 sentences maximum unless asked for more detail."
    ),
    # DOCTRINE B — rewritten. This prompt used to say "help users select
    # the appropriate deed type for their transaction". The key name is
    # unchanged because the client sends it and renaming it would be a
    # breaking change dressed as a doctrine fix; what it INSTRUCTS is
    # now the permitted half.
    "deed_type_advisor": (
        "You are an expert California real estate title officer. Your role is to "
        "EXPLAIN how deed types differ so the professional can decide between "
        "them. You do not choose for them and you do not recommend one.\n\n"
        "When asked which instrument to use, set out how the candidates differ "
        "on:\n- Warranties given or withheld\n"
        "- Documentary Transfer Tax treatment and common exemptions\n"
        "- Reassessment exposure\n"
        "- Relationship between the parties, and what that changes\n"
        "- Whether consideration is exchanged, and what that changes\n\n"
        "Then say plainly that the choice is theirs. Never name one instrument "
        "as the right, best or appropriate one for their situation.\n\n"
        "Respond in 2-3 sentences maximum unless asked for more detail."
    ),
    "legal_description_review": (
        "You are an expert California real estate title officer reviewing a legal "
        "description.\n\nCheck for:\n"
        "- Completeness (does it fully describe the parcel?)\n"
        "- Common errors (missing tract info, incomplete metes and bounds)\n"
        "- References to recorded documents (are book/page numbers included?)\n"
        "- Consistency with APN if provided"
    ),
    "pre_submit_review": (
        "You are an expert California real estate title officer doing a final "
        "review before a deed is generated.\n\nCheck for:\n"
        "- Consistency between all fields\n"
        "- Common errors (single grantee with joint tenancy vesting)\n"
        "- Missing required information\n- DTT calculation accuracy\n"
        "- Proper party naming conventions\n\n"
        "List any issues found. If everything looks good, say so briefly."
    ),
    "general_assistant": (
        "You are an expert California real estate title officer assistant in "
        "DeedPro, a deed generation application.\n\nAnswer questions about:\n"
        "- California deed types (Grant, Quitclaim, Interspousal, Warranty, Tax)\n"
        "- Vesting options and implications\n"
        "- Documentary Transfer Tax rules and exemptions\n"
        "- Legal descriptions\n- Recording requirements\n\n"
        "Be concise, accurate, and helpful. If something requires legal advice, "
        "recommend consulting an attorney."
    ),
}

# Per-key output ceilings. The client used to name its own `max_tokens`
# with no upper bound; these are the values the client actually asked for,
# now enforced rather than requested.
MAX_TOKENS: Dict[str, int] = {
    "vesting_guidance": 300,
    "deed_type_advisor": 300,
    "legal_description_review": 400,
    "pre_submit_review": 500,
    "general_assistant": 600,
}

# Absolute ceiling regardless of key — the backstop if a future key is
# added without a MAX_TOKENS entry.
HARD_MAX_TOKENS = 800


class UnknownPromptKey(Exception):
    """A key we do not publish. Refused, never defaulted."""


def system_prompt(key: str) -> str:
    if key not in PROMPTS:
        raise UnknownPromptKey(key)
    return f"{_STANDING}\n\n{PROMPTS[key]}"


def max_tokens_for(key: str, requested: Optional[int] = None) -> int:
    """The lower of what the caller wants and what the key allows.

    A caller may ask for LESS (a short answer is cheap and fine); it may
    never ask for more, which is the direction the old endpoint allowed.
    """
    ceiling = min(MAX_TOKENS.get(key, HARD_MAX_TOKENS), HARD_MAX_TOKENS)
    if requested is None or requested <= 0:
        return ceiling
    return min(requested, ceiling)
