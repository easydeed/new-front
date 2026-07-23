"""
AI Assistant API for dynamic prompt handling
Phase 3 Enhancements: Multi-document support, timeout handling, orchestration improvements
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import httpx
import asyncio
import time
import os
from auth import get_current_user_id
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Configuration from environment
AI_ASSIST_TIMEOUT = int(os.getenv("AI_ASSIST_TIMEOUT", "15"))
TITLEPOINT_TIMEOUT = int(os.getenv("TITLEPOINT_TIMEOUT", "10"))
MAX_CONCURRENT_REQUESTS = int(os.getenv("MAX_CONCURRENT_REQUESTS", "5"))


# T4: /assist (shadowed, no consumers), /multi-document, and the TitlePoint
# orchestration handlers were removed. /api/ai/chat below is the sole AI
# route the frontend consumes.


class ChatRequest(BaseModel):
    """Request model for AI chat endpoint"""
    system: str = ""  # System prompt
    message: str  # User message
    max_tokens: int = 400


class ChatResponse(BaseModel):
    """Response model for AI chat endpoint"""
    success: bool = True
    response: str = ""
    error: Optional[str] = None


# Get OpenAI API key from environment
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


@router.post("/chat", response_model=ChatResponse)
async def ai_chat(request: ChatRequest):
    """
    AI Chat endpoint for wizard guidance.
    Uses OpenAI GPT-4 for natural language assistance.
    
    This endpoint is called by the frontend aiAssistant service.
    """
    if not OPENAI_API_KEY:
        logger.warning("OpenAI API key not configured, returning fallback response")
        return ChatResponse(
            success=True,
            response="AI assistance is currently unavailable. Please consult a title professional for guidance on this question."
        )
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": request.system or "You are a helpful California real estate title officer assistant."},
                        {"role": "user", "content": request.message}
                    ],
                    "max_tokens": request.max_tokens,
                    "temperature": 0.7
                }
            )
            
            if response.status_code != 200:
                logger.error(f"OpenAI API error: {response.status_code} - {response.text}")
                return ChatResponse(
                    success=False,
                    error="AI service temporarily unavailable"
                )
            
            data = response.json()
            ai_response = data["choices"][0]["message"]["content"]
            
            return ChatResponse(
                success=True,
                response=ai_response
            )
            
    except asyncio.TimeoutError:
        logger.error("OpenAI API timeout")
        return ChatResponse(
            success=False,
            error="AI request timed out"
        )
    except Exception as e:
        logger.error(f"AI chat error: {str(e)}")
        return ChatResponse(
            success=False,
            error="Failed to get AI response"
        )