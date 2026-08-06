"""RED-H1.3 — the AI endpoint is bounded, metered, and on the record.

The endpoint accepted `system` and `max_tokens` from the caller. That is
a general-purpose LLM on the company's OpenAI key, available to any
authenticated user including a free-plan one, with no per-user ceiling,
no rate limit, no spend attribution and no record of what was said.

These pins guard the four containments, and the direction each would
break in:

  1. The client can no longer supply prompt TEXT — only a key, and only a
     key the server publishes. The failure mode to guard is a DEFAULT: an
     unknown key that quietly falls back to a general prompt rebuilds the
     hole with extra steps, so an unknown key must be refused.
  2. `max_tokens` is a ceiling, not a request. A caller may ask for less.
  3. A per-user daily quota exists at all.
  4. Every exchange is logged — the one that makes the UPL question
     answerable, because a hundred real exchanges cannot be reviewed
     until a hundred real exchanges are recorded somewhere.
"""
import sys
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

from services import ai_prompts  # noqa: E402
from tests.source_text import code_only  # noqa: E402


# ── 1. The server owns the prompts ────────────────────────────────────


def test_the_request_model_no_longer_accepts_a_system_prompt():
    """THE containment. If `system` returns to the request model, the
    endpoint is a free LLM again."""
    src = code_only((BACKEND / "api" / "ai_assist.py").read_text(encoding="utf-8"))
    assert "prompt_key" in src
    assert "request.system" not in src
    assert "system: str" not in src


def test_an_unknown_key_is_refused_rather_than_defaulted():
    with pytest.raises(ai_prompts.UnknownPromptKey):
        ai_prompts.system_prompt("anything_else")


def test_no_prompt_key_falls_back_to_a_general_prompt():
    """A `.get(key, PROMPTS['general_assistant'])` would pass the test
    above's sibling and still be the bug."""
    src = code_only((BACKEND / "services" / "ai_prompts.py").read_text(encoding="utf-8"))
    assert "PROMPTS.get(" not in src


@pytest.mark.parametrize("key", [
    "vesting_guidance", "deed_type_advisor", "legal_description_review",
    "pre_submit_review", "general_assistant",
])
def test_every_key_the_client_sends_exists_on_the_server(key):
    assert key in ai_prompts.PROMPTS
    assert ai_prompts.system_prompt(key)


def test_the_client_sends_keys_and_holds_no_prompt_text():
    """The other half: the browser bundle must not still carry the
    prompts, or someone will wire them back into a request body."""
    src = (BACKEND.parent / "frontend" / "src" / "services" / "aiAssistant.ts").read_text(encoding="utf-8")
    assert "PROMPT_KEYS" in src
    assert "SYSTEM_PROMPTS" not in src
    assert "prompt_key:" in src
    # The instruction text itself is gone, not merely renamed.
    assert "You are an expert California real estate title officer" not in src


def test_the_proxy_route_forwards_a_key_not_prose():
    src = (BACKEND.parent / "frontend" / "src" / "app" / "api" / "ai" / "chat" / "route.ts").read_text(encoding="utf-8")
    code = src.replace("/*", "\n/*")  # keep the comment-stripping honest
    import re
    code = re.sub(r"/\*.*?\*/", "", code, flags=re.DOTALL)
    code = re.sub(r"^\s*//.*$", "", code, flags=re.MULTILINE)
    assert "prompt_key: body.prompt_key" in code
    assert "system:" not in code


def test_every_prompt_carries_the_standing_not_the_decider_instruction():
    for key in ai_prompts.PROMPTS:
        assert "You do not make decisions" in ai_prompts.system_prompt(key)


def test_the_instrument_selection_prompt_no_longer_needs_flagging():
    """RETIRED BY DOCTRINE B, in the diff that cured its condition.

    This pin used to assert that `ai_prompts.py` FLAGGED `deed_type_advisor`
    as instrument selection — a marker held in place so the next reader
    would not have to discover a live problem for themselves. It was a
    placeholder for a ruling, and a placeholder outlives its purpose the
    moment the ruling lands.

    Doctrine B rewrote the prompt to explain-only. There is nothing left
    to flag, so what is asserted now is the cure rather than the warning:
    the prompt does not instruct selection, and it does carry the
    boundary. The full boundary suite is
    `tests/test_doctrine_b_ai_boundary.py`.

    Leaving the old pin standing would have been worse than deleting it —
    it would have gone on demanding a warning label for a defect that no
    longer exists, and the next contributor would have restored the
    warning to make the test pass.
    """
    from services import ai_prompts
    prompt = ai_prompts.PROMPTS["deed_type_advisor"]
    assert "select the appropriate deed type" not in prompt.lower()
    assert "you may not SELECT" in ai_prompts.system_prompt("deed_type_advisor")


# ── 2. max_tokens is a ceiling ────────────────────────────────────────


def test_a_caller_cannot_raise_the_ceiling():
    assert ai_prompts.max_tokens_for("vesting_guidance", 99999) == 300


def test_a_caller_may_lower_it():
    assert ai_prompts.max_tokens_for("general_assistant", 50) == 50


def test_omitting_it_uses_the_key_ceiling():
    assert ai_prompts.max_tokens_for("general_assistant") == 600


def test_an_unlisted_key_still_cannot_exceed_the_hard_cap():
    """The backstop for a future key added without a MAX_TOKENS entry."""
    assert ai_prompts.max_tokens_for("not_listed", 99999) == ai_prompts.HARD_MAX_TOKENS


def test_the_hard_cap_is_bounded():
    assert 0 < ai_prompts.HARD_MAX_TOKENS <= 2000
    for key, limit in ai_prompts.MAX_TOKENS.items():
        assert limit <= ai_prompts.HARD_MAX_TOKENS, key


# ── 3 & 4. Quota, tagging, and the record ─────────────────────────────


def test_the_endpoint_meters_per_user_and_refuses_with_429():
    src = code_only((BACKEND / "api" / "ai_assist.py").read_text(encoding="utf-8"))
    assert "DAILY_EXCHANGE_LIMIT" in src
    assert "_exchanges_today" in src
    assert "status_code=429" in src


def test_the_quota_counts_from_the_log_rather_than_memory():
    """A per-process counter resets on deploy and does not survive two
    workers; the log is the only thing that actually counts."""
    src = code_only((BACKEND / "api" / "ai_assist.py").read_text(encoding="utf-8"))
    assert "FROM ai_exchange_log" in src


def test_requests_are_tagged_so_spend_is_attributable():
    src = code_only((BACKEND / "api" / "ai_assist.py").read_text(encoding="utf-8"))
    assert "request_tag" in src
    assert '"user": request_tag' in src


def test_every_outcome_is_logged_including_the_failures():
    """A log that records only successes cannot answer "what did it tell
    her" for the case where something went wrong."""
    src = code_only((BACKEND / "api" / "ai_assist.py").read_text(encoding="utf-8"))
    for status in ('"ok"', '"error"', '"quota"'):
        assert f"{status}," in src or f", {status}" in src, status


def test_a_logging_failure_never_breaks_the_response():
    src = code_only((BACKEND / "api" / "ai_assist.py").read_text(encoding="utf-8"))
    fn = src[src.index("def _log_exchange"):src.index("def _exchanges_today")]
    assert "except Exception" in fn
    assert "FAILED TO LOG EXCHANGE" in fn


def test_the_log_table_is_in_the_one_schema_authority():
    """H1's rule: schema comes from create_tables() and nowhere else, so
    a column can never exist in tests but not production."""
    schema = (BACKEND / "database.py").read_text(encoding="utf-8")
    assert "CREATE TABLE IF NOT EXISTS ai_exchange_log" in schema
    for col in ["user_id", "prompt_key", "user_message", "response",
                "request_tag", "status"]:
        assert col in schema.split("ai_exchange_log")[1][:800], col
