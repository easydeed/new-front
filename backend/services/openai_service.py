"""
OpenAI Service for Advanced AI Integration
Provides GPT-4 powered natural language processing, legal analysis, and document intelligence
Following the WIZARD_ARCHITECTURE_OVERHAUL_PLAN Phase 2.4 specifications
"""
import os
import time
import asyncio
import json
import logging
from typing import Dict, List, Any, Optional, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum

import openai
from openai import AsyncOpenAI
from fastapi import HTTPException

# Configure logging
logger = logging.getLogger(__name__)

class PromptType(Enum):
    """Types of prompts for different AI operations"""
    NATURAL_LANGUAGE = "natural_language"
    DOCUMENT_ANALYSIS = "document_analysis"
    LEGAL_VALIDATION = "legal_validation"
    FIELD_SUGGESTION = "field_suggestion"
    RISK_ASSESSMENT = "risk_assessment"
    CHAIN_OF_TITLE = "chain_of_title"
    DOCUMENT_COMPARISON = "document_comparison"

@dataclass
class AIRequest:
    """Structured AI request with context and parameters"""
    prompt_type: PromptType
    user_input: str
    context: Dict[str, Any]
    document_type: Optional[str] = None
    property_data: Optional[Dict[str, Any]] = None
    step_data: Optional[Dict[str, Any]] = None
    max_tokens: int = 1000
    temperature: float = 0.3
    model: str = "gpt-4"

@dataclass
class AIResponse:
    """Structured AI response with metadata"""
    content: str
    confidence: float
    reasoning: str
    suggestions: List[Dict[str, Any]]
    actions: List[Dict[str, Any]]
    legal_implications: Optional[str] = None
    follow_up_questions: List[str] = None
    processing_time: float = 0.0
    tokens_used: int = 0
    cost_estimate: float = 0.0

@dataclass
class UsageMetrics:
    """Track OpenAI API usage and costs"""
    total_requests: int = 0
    total_tokens: int = 0
    total_cost: float = 0.0
    requests_today: int = 0
    tokens_today: int = 0
    cost_today: float = 0.0
    last_reset: datetime = None

class OpenAIService:
    """
    Advanced OpenAI service with GPT-4 integration, prompt engineering,
    rate limiting, cost optimization, and legal document expertise
    """
    
    def __init__(self):
        # Initialize OpenAI client
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        
        self.client = AsyncOpenAI(api_key=self.api_key)
        
        # Configuration
        self.default_model = "gpt-4"
        self.max_retries = 3
        self.retry_delay = 1.0
        self.rate_limit_requests_per_minute = 50
        self.rate_limit_tokens_per_minute = 40000
        self.daily_cost_limit = 50.0  # $50 daily limit
        
        # Usage tracking
        self.usage_metrics = UsageMetrics(last_reset=datetime.now())
        self.request_timestamps: List[datetime] = []
        self.token_usage_minute: List[tuple] = []  # (timestamp, tokens)
        
        # Load legal knowledge base
        self.legal_knowledge = self._load_legal_knowledge()
        
        # Initialize prompt templates
        self.prompt_templates = self._initialize_prompt_templates()
        
        logger.info("OpenAI Service initialized successfully")

    async def process_natural_language_prompt(
        self,
        user_input: str,
        context: Dict[str, Any],
        document_type: Optional[str] = None
    ) -> AIResponse:
        """
        Process natural language prompts with document context awareness
        """
        request = AIRequest(
            prompt_type=PromptType.NATURAL_LANGUAGE,
            user_input=user_input,
            context=context,
            document_type=document_type,
            property_data=context.get('propertyData'),
            step_data=context.get('stepData'),
            temperature=0.4  # Slightly higher for conversational responses
        )
        
        return await self._process_ai_request(request)

    async def analyze_document_intelligence(
        self,
        document_data: Dict[str, Any],
        analysis_type: str = "comprehensive"
    ) -> AIResponse:
        """
        Perform intelligent document analysis with legal expertise
        """
        request = AIRequest(
            prompt_type=PromptType.DOCUMENT_ANALYSIS,
            user_input=f"Analyze this {document_data.get('documentType', 'document')} for completeness, legal compliance, and potential issues",
            context={
                "documentData": document_data,
                "analysisType": analysis_type,
                "legalJurisdiction": "California"
            },
            document_type=document_data.get('documentType'),
            max_tokens=1500,
            temperature=0.2  # Lower for analytical tasks
        )
        
        return await self._process_ai_request(request)

    async def validate_legal_compliance(
        self,
        document_type: str,
        document_data: Dict[str, Any],
        jurisdiction: str = "California"
    ) -> AIResponse:
        """
        Validate legal compliance with California real estate law
        """
        request = AIRequest(
            prompt_type=PromptType.LEGAL_VALIDATION,
            user_input=f"Validate legal compliance for {document_type} under {jurisdiction} law",
            context={
                "documentData": document_data,
                "jurisdiction": jurisdiction,
                "legalCodes": self.legal_knowledge.get("california_codes", {}),
                "validationLevel": "comprehensive"
            },
            document_type=document_type,
            max_tokens=1200,
            temperature=0.1  # Very low for legal analysis
        )
        
        return await self._process_ai_request(request)

    async def suggest_field_values(
        self,
        field_name: str,
        context: Dict[str, Any],
        document_type: str
    ) -> AIResponse:
        """
        Suggest intelligent field values based on context
        """
        request = AIRequest(
            prompt_type=PromptType.FIELD_SUGGESTION,
            user_input=f"Suggest appropriate value for {field_name} field",
            context={
                "fieldName": field_name,
                "documentType": document_type,
                "propertyData": context.get('propertyData'),
                "stepData": context.get('stepData'),
                "userPreferences": context.get('userPreferences')
            },
            document_type=document_type,
            max_tokens=800,
            temperature=0.3
        )
        
        return await self._process_ai_request(request)

    async def assess_title_risks(
        self,
        chain_of_title: Dict[str, Any],
        property_data: Dict[str, Any]
    ) -> AIResponse:
        """
        Perform AI-powered title risk assessment
        """
        request = AIRequest(
            prompt_type=PromptType.RISK_ASSESSMENT,
            user_input="Analyze title risks and provide comprehensive risk assessment",
            context={
                "chainOfTitle": chain_of_title,
                "propertyData": property_data,
                "riskFactors": self.legal_knowledge.get("risk_factors", {}),
                "analysisDepth": "comprehensive"
            },
            max_tokens=1500,
            temperature=0.2
        )
        
        return await self._process_ai_request(request)

    async def analyze_chain_of_title(
        self,
        transfers: List[Dict[str, Any]],
        property_data: Dict[str, Any]
    ) -> AIResponse:
        """
        Analyze chain of title for issues and recommendations
        """
        request = AIRequest(
            prompt_type=PromptType.CHAIN_OF_TITLE,
            user_input="Analyze chain of title for gaps, issues, and legal concerns",
            context={
                "transfers": transfers,
                "propertyData": property_data,
                "legalRequirements": self.legal_knowledge.get("chain_of_title_requirements", {}),
                "analysisType": "comprehensive"
            },
            max_tokens=1500,
            temperature=0.2
        )
        
        return await self._process_ai_request(request)

    async def compare_documents(
        self,
        documents: List[Dict[str, Any]],
        comparison_type: str = "legal_significance"
    ) -> AIResponse:
        """
        Compare multiple documents and identify differences
        """
        request = AIRequest(
            prompt_type=PromptType.DOCUMENT_COMPARISON,
            user_input=f"Compare documents and identify {comparison_type} differences",
            context={
                "documents": documents,
                "comparisonType": comparison_type,
                "legalImplications": True,
                "recommendations": True
            },
            max_tokens=1800,
            temperature=0.2
        )
        
        return await self._process_ai_request(request)

    async def _process_ai_request(self, request: AIRequest) -> AIResponse:
        """
        Process AI request with rate limiting, error handling, and cost optimization
        """
        start_time = time.time()
        
        try:
            # Check rate limits and daily costs
            await self._check_rate_limits()
            await self._check_daily_limits()
            
            # Build the prompt
            system_prompt, user_prompt = self._build_prompts(request)
            
            # Make the API call with retries
            response = await self._make_openai_request(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                model=request.model,
                max_tokens=request.max_tokens,
                temperature=request.temperature
            )
            
            # Parse and structure the response
            ai_response = self._parse_openai_response(response, request)
            
            # Update usage metrics
            processing_time = time.time() - start_time
            ai_response.processing_time = processing_time
            
            self._update_usage_metrics(response.usage)
            
            logger.info(f"AI request processed successfully in {processing_time:.2f}s")
            return ai_response
            
        except Exception as e:
            logger.error(f"AI request failed: {str(e)}")
            return self._create_fallback_response(request, str(e))

    async def _make_openai_request(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str,
        max_tokens: int,
        temperature: float
    ) -> Any:
        """
        Make OpenAI API request with retry logic
        """
        last_error = None
        
        for attempt in range(self.max_retries):
            try:
                response = await self.client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    max_tokens=max_tokens,
                    temperature=temperature,
                    response_format={"type": "json_object"}
                )
                
                return response
                
            except openai.RateLimitError as e:
                logger.warning(f"Rate limit hit, attempt {attempt + 1}/{self.max_retries}")
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay * (2 ** attempt))
                last_error = e
                
            except openai.APIError as e:
                logger.error(f"OpenAI API error: {str(e)}")
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay)
                last_error = e
                
            except Exception as e:
                logger.error(f"Unexpected error: {str(e)}")
                last_error = e
                break
        
        raise HTTPException(
            status_code=503,
            detail=f"OpenAI service unavailable after {self.max_retries} attempts: {str(last_error)}"
        )

    def _build_prompts(self, request: AIRequest) -> tuple[str, str]:
        """
        Build system and user prompts based on request type
        """
        template = self.prompt_templates.get(request.prompt_type)
        if not template:
            raise ValueError(f"No template found for prompt type: {request.prompt_type}")
        
        # Build system prompt with legal knowledge
        system_prompt = template["system"].format(
            legal_knowledge=json.dumps(self.legal_knowledge, indent=2),
            document_type=request.document_type or "document",
            jurisdiction="California"
        )
        
        # Build user prompt with context
        user_prompt = template["user"].format(
            user_input=request.user_input,
            context=json.dumps(request.context, indent=2, default=str),
            property_data=json.dumps(request.property_data or {}, indent=2, default=str),
            step_data=json.dumps(request.step_data or {}, indent=2, default=str)
        )
        
        return system_prompt, user_prompt

    def _parse_openai_response(self, response: Any, request: AIRequest) -> AIResponse:
        """
        Parse OpenAI response into structured AIResponse
        """
        try:
            content = response.choices[0].message.content
            parsed_content = json.loads(content)
            
            # Calculate cost estimate
            cost_estimate = self._calculate_cost(response.usage)
            
            return AIResponse(
                content=parsed_content.get("response", ""),
                confidence=parsed_content.get("confidence", 0.7),
                reasoning=parsed_content.get("reasoning", ""),
                suggestions=parsed_content.get("suggestions", []),
                actions=parsed_content.get("actions", []),
                legal_implications=parsed_content.get("legal_implications"),
                follow_up_questions=parsed_content.get("follow_up_questions", []),
                tokens_used=response.usage.total_tokens,
                cost_estimate=cost_estimate
            )
            
        except json.JSONDecodeError:
            # Fallback for non-JSON responses
            return AIResponse(
                content=response.choices[0].message.content,
                confidence=0.6,
                reasoning="Response parsing failed, using raw content",
                suggestions=[],
                actions=[],
                tokens_used=response.usage.total_tokens,
                cost_estimate=self._calculate_cost(response.usage)
            )

    def _create_fallback_response(self, request: AIRequest, error: str) -> AIResponse:
        """
        Create fallback response when AI request fails
        """
        fallback_responses = {
            PromptType.NATURAL_LANGUAGE: "I'm having trouble processing your request right now. Please try again or rephrase your question.",
            PromptType.DOCUMENT_ANALYSIS: "Document analysis is temporarily unavailable. Please review the document manually.",
            PromptType.LEGAL_VALIDATION: "Legal validation service is unavailable. Please consult with a legal professional.",
            PromptType.FIELD_SUGGESTION: "Field suggestions are temporarily unavailable. Please enter the value manually.",
            PromptType.RISK_ASSESSMENT: "Risk assessment is temporarily unavailable. Please proceed with caution.",
            PromptType.CHAIN_OF_TITLE: "Chain of title analysis is unavailable. Please review title documents manually.",
            PromptType.DOCUMENT_COMPARISON: "Document comparison is temporarily unavailable. Please review documents manually."
        }
        
        return AIResponse(
            content=fallback_responses.get(request.prompt_type, "Service temporarily unavailable."),
            confidence=0.0,
            reasoning=f"Fallback response due to error: {error}",
            suggestions=[],
            actions=[]
        )

    async def _check_rate_limits(self):
        """
        Check and enforce rate limits
        """
        now = datetime.now()
        
        # Clean old timestamps (older than 1 minute)
        cutoff = now - timedelta(minutes=1)
        self.request_timestamps = [ts for ts in self.request_timestamps if ts > cutoff]
        self.token_usage_minute = [(ts, tokens) for ts, tokens in self.token_usage_minute if ts > cutoff]
        
        # Check request rate limit
        if len(self.request_timestamps) >= self.rate_limit_requests_per_minute:
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded: too many requests per minute"
            )
        
        # Check token rate limit
        tokens_this_minute = sum(tokens for _, tokens in self.token_usage_minute)
        if tokens_this_minute >= self.rate_limit_tokens_per_minute:
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded: too many tokens per minute"
            )
        
        # Add current request timestamp
        self.request_timestamps.append(now)

    async def _check_daily_limits(self):
        """
        Check daily cost limits
        """
        now = datetime.now()
        
        # Reset daily counters if it's a new day
        if self.usage_metrics.last_reset.date() != now.date():
            self.usage_metrics.requests_today = 0
            self.usage_metrics.tokens_today = 0
            self.usage_metrics.cost_today = 0.0
            self.usage_metrics.last_reset = now
        
        # Check daily cost limit
        if self.usage_metrics.cost_today >= self.daily_cost_limit:
            raise HTTPException(
                status_code=429,
                detail=f"Daily cost limit of ${self.daily_cost_limit} exceeded"
            )

    def _update_usage_metrics(self, usage: Any):
        """
        Update usage metrics and costs
        """
        tokens = usage.total_tokens
        cost = self._calculate_cost(usage)
        
        # Update totals
        self.usage_metrics.total_requests += 1
        self.usage_metrics.total_tokens += tokens
        self.usage_metrics.total_cost += cost
        
        # Update daily totals
        self.usage_metrics.requests_today += 1
        self.usage_metrics.tokens_today += tokens
        self.usage_metrics.cost_today += cost
        
        # Add to minute tracking
        self.token_usage_minute.append((datetime.now(), tokens))

    def _calculate_cost(self, usage: Any) -> float:
        """
        Calculate cost based on token usage and model pricing
        """
        # GPT-4 pricing (as of 2024)
        input_cost_per_token = 0.00003  # $0.03 per 1K tokens
        output_cost_per_token = 0.00006  # $0.06 per 1K tokens
        
        input_cost = usage.prompt_tokens * input_cost_per_token
        output_cost = usage.completion_tokens * output_cost_per_token
        
        return input_cost + output_cost

    def _load_legal_knowledge(self) -> Dict[str, Any]:
        """
        Load legal knowledge base for California real estate law
        """
        return {
            "california_codes": {
                "Civil Code §1091": {
                    "title": "Grant Deed Requirements",
                    "requirements": [
                        "Must identify grantor and grantee",
                        "Must contain granting clause",
                        "Must describe property with certainty",
                        "Must be signed by grantor",
                        "Must be acknowledged"
                    ]
                },
                "Civil Code §1092": {
                    "title": "Property Description Requirements",
                    "requirements": [
                        "Description must identify property with reasonable certainty",
                        "May reference recorded maps or surveys",
                        "Must include county location"
                    ]
                },
                "Civil Code §1095": {
                    "title": "Grantor Authority",
                    "requirements": [
                        "Grantor must have legal capacity",
                        "Grantor must own the interest being conveyed",
                        "Names must match title records"
                    ]
                },
                "Government Code §27321": {
                    "title": "Recording Requirements",
                    "requirements": [
                        "Must include return address",
                        "Must pay recording fees",
                        "Must meet formatting requirements"
                    ]
                },
                "Revenue & Taxation Code §11911": {
                    "title": "Documentary Transfer Tax",
                    "requirements": [
                        "Must declare transfer tax or exemption",
                        "Must calculate tax correctly",
                        "Must indicate tax jurisdiction"
                    ]
                }
            },
            "document_requirements": {
                "grant_deed": [
                    "Complete grantor and grantee information",
                    "Legal description of property",
                    "Documentary transfer tax declaration",
                    "Recording information",
                    "Notarization"
                ],
                "quitclaim_deed": [
                    "Grantor and grantee identification",
                    "Property description",
                    "Recording information",
                    "Risk acknowledgment"
                ],
                "interspousal_transfer": [
                    "Spouse identification",
                    "Property characterization",
                    "Tax exemption declaration"
                ]
            },
            "risk_factors": {
                "title_risks": [
                    "Gaps in chain of title",
                    "Name variations",
                    "Foreclosure history",
                    "Liens and encumbrances",
                    "Legal description issues"
                ],
                "transaction_risks": [
                    "Incomplete documentation",
                    "Tax calculation errors",
                    "Recording issues",
                    "Legal compliance failures"
                ]
            }
        }

    def _initialize_prompt_templates(self) -> Dict[PromptType, Dict[str, str]]:
        """
        Initialize prompt templates for different AI operations
        """
        return {
            PromptType.NATURAL_LANGUAGE: {
                "system": """You are an expert California real estate attorney and document preparation specialist. You have deep knowledge of California real estate law, document requirements, and best practices.

Legal Knowledge Base:
{legal_knowledge}

Your role is to:
1. Provide accurate, helpful responses about {document_type} preparation
2. Ensure all advice complies with {jurisdiction} law
3. Identify potential legal issues and risks
4. Suggest appropriate actions and next steps
5. Maintain professional, clear communication

Always respond in JSON format with:
{{
  "response": "Your detailed response",
  "confidence": 0.0-1.0,
  "reasoning": "Why you provided this response",
  "suggestions": [list of actionable suggestions],
  "actions": [list of specific actions user can take],
  "legal_implications": "Any legal considerations",
  "follow_up_questions": [list of relevant follow-up questions]
}}""",
                "user": """User Question: {user_input}

Context:
{context}

Property Data:
{property_data}

Current Step Data:
{step_data}

Please provide a comprehensive response that addresses the user's question while considering the document context and legal requirements."""
            },
            
            PromptType.DOCUMENT_ANALYSIS: {
                "system": """You are a California real estate document analysis expert. Analyze documents for completeness, legal compliance, and potential issues.

Legal Knowledge:
{legal_knowledge}

Provide thorough analysis including:
1. Completeness assessment
2. Legal compliance review
3. Risk identification
4. Recommendations for improvement
5. Required corrections

Respond in JSON format with detailed analysis.""",
                "user": """Analyze this document:

{context}

Provide comprehensive analysis focusing on legal compliance and completeness."""
            },
            
            PromptType.LEGAL_VALIDATION: {
                "system": """You are a California real estate legal compliance validator. Validate documents against California legal requirements.

Legal Codes and Requirements:
{legal_knowledge}

Validate for:
1. Statutory compliance
2. Required field completeness
3. Legal format requirements
4. Potential legal issues
5. Remediation steps

Respond in JSON format with validation results.""",
                "user": """Validate legal compliance for:

Document Type: {document_type}
Document Data: {context}

Provide detailed compliance validation with specific code references."""
            },
            
            PromptType.FIELD_SUGGESTION: {
                "system": """You are an intelligent field suggestion system for California real estate documents. Suggest appropriate field values based on context.

Legal Requirements:
{legal_knowledge}

Consider:
1. Legal requirements for the field
2. Property and transaction context
3. Best practices and standards
4. User preferences and patterns
5. Risk mitigation

Respond in JSON format with field suggestions.""",
                "user": """Suggest value for field: {user_input}

Context: {context}
Property Data: {property_data}
Step Data: {step_data}

Provide intelligent field suggestions with reasoning."""
            },
            
            PromptType.RISK_ASSESSMENT: {
                "system": """You are a title risk assessment expert. Analyze title and transaction risks for California real estate.

Risk Factors:
{legal_knowledge}

Assess:
1. Title risks and issues
2. Transaction risks
3. Legal compliance risks
4. Financial risks
5. Mitigation strategies

Respond in JSON format with comprehensive risk assessment.""",
                "user": """Assess risks for:

{context}

Provide detailed risk analysis with mitigation recommendations."""
            },
            
            PromptType.CHAIN_OF_TITLE: {
                "system": """You are a chain of title analysis expert. Analyze ownership history for issues and legal concerns.

Legal Requirements:
{legal_knowledge}

Analyze for:
1. Chain continuity
2. Name variations
3. Legal issues
4. Risk factors
5. Recommendations

Respond in JSON format with chain of title analysis.""",
                "user": """Analyze chain of title:

{context}

Provide comprehensive analysis of ownership history and potential issues."""
            },
            
            PromptType.DOCUMENT_COMPARISON: {
                "system": """You are a document comparison expert. Compare documents and identify legally significant differences.

Legal Knowledge:
{legal_knowledge}

Compare for:
1. Field differences
2. Legal significance
3. Compliance variations
4. Risk implications
5. Recommendations

Respond in JSON format with comparison analysis.""",
                "user": """Compare these documents:

{context}

Identify differences and their legal significance."""
            }
        }

    # Public utility methods
    def get_usage_metrics(self) -> Dict[str, Any]:
        """Get current usage metrics"""
        return asdict(self.usage_metrics)

    def reset_daily_limits(self):
        """Reset daily usage counters (for testing/admin)"""
        self.usage_metrics.requests_today = 0
        self.usage_metrics.tokens_today = 0
        self.usage_metrics.cost_today = 0.0
        self.usage_metrics.last_reset = datetime.now()

    async def health_check(self) -> Dict[str, Any]:
        """Check service health and API connectivity"""
        try:
            # Simple test request
            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",  # Use cheaper model for health check
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=5
            )
            
            return {
                "status": "healthy",
                "api_accessible": True,
                "model_available": True,
                "usage_metrics": self.get_usage_metrics()
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "api_accessible": False,
                "error": str(e),
                "usage_metrics": self.get_usage_metrics()
            }

# Global service instance
openai_service = OpenAIService()


