"""AI Assistant API — bounded, metered, and on the record.

RED-H1.3. What this endpoint was, until this ticket:

    {"role": "system", "content": request.system or "..."}
    "max_tokens": request.max_tokens

The CLIENT supplied the system prompt and the token ceiling. Any
authenticated user — including one on the free plan — could POST an
arbitrary system prompt with an arbitrary `max_tokens` and use the
company's OpenAI account as a general-purpose LLM, indefinitely, with:

  - no upper bound on tokens per call
  - no per-user quota
  - no rate limit
  - no request tagging, so spend could not even be attributed
  - NO RECORD of what was asked or what was answered

That last one is the serious one, and it is not a cost problem.

This product's entire architecture is suggest → confirm → record. Every
rule in the doctrine governs DATA: which values may be prefilled, what a
confirmation stamps, what carries between documents. This endpoint emits
PROSE to an escrow officer inside a deed builder — the largest
legal-influence surface in the product — and it had none of the three. No
suggestion marker, no confirmation, no record.

So the confirmation trail could prove precisely what data the officer
accepted, and nothing whatsoever about what the machine told her first.
That asymmetry points the wrong way in a dispute.

═══ CONTAINMENT, NOT THE BOUNDARY RULING ═══

This ticket bounds the mechanism. What the assistant may and may not SAY
— the explain-yes / select-no boundary — is a doctrine ruling that has
not been applied here, and `services/ai_prompts.py` flags the prompt that
makes it urgent (`deed_type_advisor` literally instructs the model to
help select an instrument).

Containment first, because the boundary cannot be ruled on evidence that
does not exist. Now it will exist.
"""
import asyncio
import logging
import os
import uuid
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth import get_current_user_id
from database import db_connection
from services.ai_prompts import (
    HARD_MAX_TOKENS,
    PROMPTS,
    UnknownPromptKey,
    max_tokens_for,
    system_prompt,
)

logger = logging.getLogger(__name__)

router = APIRouter()

AI_MODEL = "gpt-4o-mini"

# Per-user, per-day ceiling. Sized so an officer working normally never
# meets it and a script meets it inside a minute. The old endpoint had no
# ceiling of any kind.
DAILY_EXCHANGE_LIMIT = int(os.getenv("AI_DAILY_EXCHANGE_LIMIT", "100"))

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


class ChatRequest(BaseModel):
    """Note what is NOT here any more: `system`.

    The client sends a KEY naming a prompt the server owns. An unknown
    key is refused rather than defaulted — a default would rebuild the
    hole with extra steps.
    """
    prompt_key: str = Field(..., max_length=64)
    message: str = Field(..., min_length=1, max_length=4000)
    # A request MAY ask for fewer tokens; it can no longer ask for more.
    max_tokens: Optional[int] = Field(None, ge=1, le=HARD_MAX_TOKENS)


class ChatResponse(BaseModel):
    success: bool = True
    response: str = ""
    error: Optional[str] = None


def _log_exchange(user_id, prompt_key, message, response, max_tokens,
                  status, error, request_tag):
    """Record every exchange. Never let logging break the response.

    A failure to log is a real problem — it is the whole point of the
    ticket — so it is printed loudly. It is not, however, a reason to
    deny an officer mid-file an answer we already have.
    """
    try:
        with db_connection() as conn, conn.cursor() as cur:
            cur.execute("""
                INSERT INTO ai_exchange_log (
                    user_id, prompt_key, user_message, response, model,
                    max_tokens, status, error, request_tag
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (user_id, prompt_key, message, response, AI_MODEL,
                  max_tokens, status, error, request_tag))
            conn.commit()
    except Exception as e:
        logger.error(f"[ai] FAILED TO LOG EXCHANGE (user={user_id}): {e}")


def _exchanges_today(user_id: int) -> int:
    with db_connection() as conn, conn.cursor() as cur:
        cur.execute("""
            SELECT COUNT(*) AS n FROM ai_exchange_log
            WHERE user_id = %s AND created_at >= NOW() - INTERVAL '1 day'
        """, (user_id,))
        row = cur.fetchone()
        return int(row["n"] if isinstance(row, dict) else row[0])


@router.post("/chat", response_model=ChatResponse)
async def ai_chat(request: ChatRequest, user_id: int = Depends(get_current_user_id)):
    """AI guidance for the builder. Logged-in only (ruled 2026-07-28)."""
    if not OPENAI_API_KEY:
        # An unconfigured service is an error, not a fabricated AI reply
        # (the same disease the proxy had: success:true with canned text).
        logger.warning("OpenAI API key not configured")
        raise HTTPException(status_code=503, detail="AI assistance is not configured")

    try:
        system = system_prompt(request.prompt_key)
    except UnknownPromptKey:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown prompt_key. Available: {sorted(PROMPTS)}")

    capped = max_tokens_for(request.prompt_key, request.max_tokens)

    if _exchanges_today(user_id) >= DAILY_EXCHANGE_LIMIT:
        _log_exchange(user_id, request.prompt_key, request.message, None,
                      capped, "quota", f"daily limit {DAILY_EXCHANGE_LIMIT}", None)
        raise HTTPException(
            status_code=429,
            detail="You've reached today's AI assistance limit. It resets in 24 hours.")

    # Tagged so spend is attributable per user and per request. The old
    # endpoint sent nothing, so the OpenAI dashboard could not be split
    # by anything at all.
    request_tag = f"u{user_id}-{uuid.uuid4().hex[:12]}"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": AI_MODEL,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": request.message},
                    ],
                    "max_tokens": capped,
                    "temperature": 0.7,
                    "user": request_tag,
                },
            )

            if response.status_code != 200:
                logger.error(f"OpenAI API error: {response.status_code} - {response.text}")
                _log_exchange(user_id, request.prompt_key, request.message, None,
                              capped, "error", f"openai {response.status_code}", request_tag)
                return ChatResponse(success=False, error="AI service temporarily unavailable")

            ai_response = response.json()["choices"][0]["message"]["content"]
            _log_exchange(user_id, request.prompt_key, request.message, ai_response,
                          capped, "ok", None, request_tag)
            return ChatResponse(success=True, response=ai_response)

    except asyncio.TimeoutError:
        logger.error("OpenAI API timeout")
        _log_exchange(user_id, request.prompt_key, request.message, None,
                      capped, "error", "timeout", request_tag)
        return ChatResponse(success=False, error="AI request timed out")
    except Exception as e:
        logger.error(f"AI chat error: {str(e)}")
        _log_exchange(user_id, request.prompt_key, request.message, None,
                      capped, "error", str(e)[:500], request_tag)
        return ChatResponse(success=False, error="Failed to get AI response")
