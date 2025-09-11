from typing import Any, Dict, Optional
import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.titlepoint_service import TitlePointService

try:
    # OpenAI SDK v1 style
    from openai import OpenAI  # type: ignore
except Exception:  # pragma: no cover
    OpenAI = None  # type: ignore

try:
    import backoff  # type: ignore
except Exception:  # pragma: no cover
    backoff = None  # type: ignore


router = APIRouter()


class ChainOfTitleRequest(BaseModel):
    fullAddress: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = "CA"
    county: Optional[str] = None
    zip: Optional[str] = None
    apn: Optional[str] = None
    fips: Optional[str] = None


class ProfileRequest(BaseModel):
    docType: str
    data: Dict[str, Any] = {}
    prompt: Optional[str] = None


def _get_openai_client():
    if OpenAI is None:
        raise HTTPException(status_code=500, detail="OpenAI SDK not available on server")
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")
    return OpenAI(api_key=api_key)


def _chat_completion_with_retry(messages: list[dict]) -> str:
    client = _get_openai_client()
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    def _call():
        completion = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.2,
            max_tokens=600,
        )
        return completion.choices[0].message.content or ""

    if backoff is not None:
        @backoff.on_exception(backoff.expo, Exception, max_tries=3)
        def _run():
            return _call()

        return _run()
    # Fallback without backoff
    return _call()


@router.post("/chain-of-title")
async def chain_of_title(req: ChainOfTitleRequest):
    """Generate chain-of-title style suggestions using TitlePoint enrichment + OpenAI summarization.

    Returns minimal, optional suggestions. Wizard must not rely on this data.
    """
    try:
        service = TitlePointService()
        enriched = await service.enrich_property(req.dict())
        # Build a compact context for the LLM
        context = {
            "fullAddress": enriched.get("fullAddress") or req.fullAddress,
            "county": enriched.get("county") or req.county,
            "apn": enriched.get("apn", ""),
            "current_owner_primary": enriched.get("current_owner_primary", ""),
            "current_owner_secondary": enriched.get("current_owner_secondary", ""),
            "brief_legal": enriched.get("brief_legal", ""),
        }

        system_message = (
            "You are a real estate assistant. Produce a brief, factual chain-of-title style summary "
            "and suggest structured fields if present. Never invent missing mandatory data."
        )
        user_message = (
            "Using the context, summarize prior ownership and produce suggestions JSON with keys: "
            "grantors_text, grantees_text, legal_description. Only include keys you can support.\n\n"
            f"Context: {context}"
        )

        try:
            completion = _chat_completion_with_retry([
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message},
            ])
        except HTTPException:
            raise
        except Exception as e:
            completion = f"LLM unavailable: {e}"

        return {
            "success": True,
            "enriched": enriched,
            "summary": completion,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"chain-of-title failed: {str(e)}")


@router.post("/profile-request")
async def profile_request(req: ProfileRequest):
    """Suggest optional field values for the given docType and partial data using OpenAI.
    Does not override user entries; frontend should treat as suggestions only.
    """
    try:
        system_message = (
            "You assist with legal document data entry. Return a minimal JSON object with only fields "
            "you can confidently suggest based on the provided data and docType. Never suggest skipping "
            "legally required fields or tax requirements."
        )
        prompt = req.prompt or "Suggest likely values for missing fields."
        user_message = (
            f"docType: {req.docType}\n"
            f"data: {req.data}\n"
            f"prompt: {prompt}\n\n"
            "Return JSON only."
        )

        try:
            completion = _chat_completion_with_retry([
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message},
            ])
        except HTTPException:
            raise
        except Exception as e:
            # Graceful degradation
            completion = f"{{\n  \"note\": \"AI unavailable: {str(e)}\"\n}}"

        return {"success": True, "suggestions": completion}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"profile-request failed: {str(e)}")


