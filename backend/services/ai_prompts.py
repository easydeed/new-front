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

═══ WHAT THIS TICKET DOES NOT DO ═══

This is CONTAINMENT. The prompts below are ported VERBATIM from
`frontend/src/services/aiAssistant.ts`. Their content has not been
touched, and one of them deserves the reader's attention:

    `deed_type_advisor` instructs the model to help a user "select the
    appropriate deed type for their transaction."

That is instrument selection — the thing the doctrine's whole
suggest/confirm/record architecture exists to keep in the officer's
hands, and the thing a non-attorney provider recommending it is most
exposed on. It has been live, driven by a prompt the CLIENT supplied,
with no confirmation gate and no record.

Moving it here does not make it safe. It makes it OURS, visible in one
file, and logged — which is the precondition for ruling on it at all.
What the assistant may and may not say is a doctrine ruling (the
explain-yes / select-no boundary), and it is deliberately NOT applied
here. When it is, this file is where it lands.
"""
from typing import Dict, Optional

# The one guardrail that ships with containment, because it costs nothing
# and its absence is indefensible: every response is prefixed by a
# standing instruction that the model is not the decider. It does not
# resolve the UPL question — a disclaimer never has — but a bounded
# system prompt is strictly better than one the caller writes.
_STANDING = (
    "You are assisting a California escrow or title professional who is "
    "preparing a document. You do not make decisions: the professional "
    "using this software decides, and their confirmation is what records. "
    "Never state that a choice has been made or applied. Do not provide "
    "legal advice."
)

# Ported verbatim from the client. Content unchanged by ruling — see the
# module docstring.
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
    # ⚠️ INSTRUMENT SELECTION — see the module docstring. Ported as-is;
    # the boundary ruling is pending and lands here.
    "deed_type_advisor": (
        "You are an expert California real estate title officer. Your role is to "
        "help users select the appropriate deed type for their transaction.\n\n"
        "Consider:\n- Relationship between parties (spouses, family, unrelated)\n"
        "- Whether consideration is being exchanged\n"
        "- Documentary Transfer Tax implications\n"
        "- Title insurance implications\n- Warranties being provided\n\n"
        "Respond in 2-3 sentences maximum."
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
