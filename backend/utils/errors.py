"""
Standardized Error Classes for DeedPro API

Phase 5.2 of DeedPro Enhancement Project
Provides consistent error responses across all endpoints.
"""

from fastapi import HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List


class APIErrorDetail(BaseModel):
    """Structured error detail for API responses"""
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None
    field: Optional[str] = None  # For validation errors


class DeedProException(HTTPException):
    """
    Base exception for all DeedPro API errors.
    
    Provides structured error responses with:
    - error_code: Machine-readable error identifier
    - message: Human-readable error description
    - details: Additional context for debugging
    """
    
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        error_detail = APIErrorDetail(
            code=code,
            message=message,
            details=details
        )
        super().__init__(
            status_code=status_code,
            detail=error_detail.model_dump()
        )
        self.error_code = code
        self.error_message = message


# ============================================================================
# Property Search Errors
# ============================================================================

class PropertyNotFoundError(DeedProException):
    """Raised when property search returns no results"""
    
    def __init__(self, address: str, search_params: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=404,
            code="PROPERTY_NOT_FOUND",
            message=f"No property found for address: {address}",
            details={
                "address": address,
                "search_params": search_params,
                "suggestion": "Try searching with a different address format or verify the address is correct."
            }
        )


class PropertyMultiMatchError(DeedProException):
    """Raised when property search returns multiple matches"""
    
    def __init__(self, address: str, match_count: int, matches: Optional[List[Dict]] = None):
        super().__init__(
            status_code=300,  # Multiple Choices
            code="PROPERTY_MULTI_MATCH",
            message=f"Multiple properties found for '{address}'. Please select one.",
            details={
                "address": address,
                "match_count": match_count,
                "matches": matches or []
            }
        )


class PropertyEnrichmentError(DeedProException):
    """Raised when property enrichment fails"""
    
    def __init__(self, reason: str, source: str = "unknown"):
        super().__init__(
            status_code=502,
            code="PROPERTY_ENRICHMENT_FAILED",
            message=f"Failed to enrich property data: {reason}",
            details={
                "reason": reason,
                "source": source,
                "suggestion": "Property details may need to be entered manually."
            }
        )


# ============================================================================
# PDF Generation Errors
# ============================================================================

class PDFGenerationError(DeedProException):
    """Raised when PDF generation fails"""
    
    def __init__(self, reason: str, deed_type: Optional[str] = None, engine: Optional[str] = None):
        super().__init__(
            status_code=500,
            code="PDF_GENERATION_FAILED",
            message="Failed to generate PDF document",
            details={
                "reason": reason,
                "deed_type": deed_type,
                "engine": engine
            }
        )


class PDFTemplateError(DeedProException):
    """Raised when PDF template rendering fails"""
    
    def __init__(self, template_name: str, reason: str):
        super().__init__(
            status_code=500,
            code="PDF_TEMPLATE_ERROR",
            message=f"Template rendering failed for {template_name}",
            details={
                "template": template_name,
                "reason": reason
            }
        )


class PDFEngineUnavailableError(DeedProException):
    """Raised when requested PDF engine is not available"""
    
    def __init__(self, engine: str, available_engines: List[str]):
        super().__init__(
            status_code=503,
            code="PDF_ENGINE_UNAVAILABLE",
            message=f"PDF engine '{engine}' is not available",
            details={
                "requested_engine": engine,
                "available_engines": available_engines,
                "suggestion": "Try using a different engine or check service configuration."
            }
        )


# ============================================================================
# Validation Errors
# ============================================================================

class ValidationError(DeedProException):
    """Raised when document validation fails"""
    
    def __init__(self, errors: List[str], deed_type: Optional[str] = None):
        super().__init__(
            status_code=422,
            code="VALIDATION_FAILED",
            message="Document validation failed",
            details={
                "errors": errors,
                "error_count": len(errors),
                "deed_type": deed_type
            }
        )


class MissingRequiredFieldError(DeedProException):
    """Raised when a required field is missing"""
    
    def __init__(self, field_name: str, deed_type: Optional[str] = None):
        super().__init__(
            status_code=422,
            code="MISSING_REQUIRED_FIELD",
            message=f"Required field '{field_name}' is missing",
            details={
                "field": field_name,
                "deed_type": deed_type
            }
        )


class InvalidFieldValueError(DeedProException):
    """Raised when a field has an invalid value"""
    
    def __init__(
        self, 
        field_name: str, 
        value: Any, 
        expected: str,
        deed_type: Optional[str] = None
    ):
        super().__init__(
            status_code=422,
            code="INVALID_FIELD_VALUE",
            message=f"Invalid value for field '{field_name}'",
            details={
                "field": field_name,
                "provided_value": str(value)[:100],  # Truncate for safety
                "expected": expected,
                "deed_type": deed_type
            }
        )


# ============================================================================
# Authentication/Authorization Errors
# ============================================================================

class AuthenticationError(DeedProException):
    """Raised when authentication fails"""
    
    def __init__(self, reason: str = "Authentication required"):
        super().__init__(
            status_code=401,
            code="AUTHENTICATION_FAILED",
            message=reason,
            details={}
        )


class AuthorizationError(DeedProException):
    """Raised when user lacks permission"""
    
    def __init__(self, action: str, resource: Optional[str] = None):
        super().__init__(
            status_code=403,
            code="AUTHORIZATION_FAILED",
            message=f"You don't have permission to {action}",
            details={
                "action": action,
                "resource": resource
            }
        )


# ============================================================================
# External Service Errors
# ============================================================================

class ExternalServiceError(DeedProException):
    """Raised when an external service fails"""
    
    def __init__(self, service: str, reason: str, status_code: int = 502):
        super().__init__(
            status_code=status_code,
            code=f"{service.upper()}_SERVICE_ERROR",
            message=f"{service} service error: {reason}",
            details={
                "service": service,
                "reason": reason
            }
        )


class SiteXError(ExternalServiceError):
    """Raised when SiteX API fails"""
    
    def __init__(self, reason: str, status_code: int = 502):
        super().__init__(
            service="SiteX",
            reason=reason,
            status_code=status_code
        )


class PDFShiftError(ExternalServiceError):
    """Raised when PDFShift API fails"""
    
    def __init__(self, reason: str, status_code: int = 502):
        super().__init__(
            service="PDFShift",
            reason=reason,
            status_code=status_code
        )


class GooglePlacesError(ExternalServiceError):
    """Raised when Google Places API fails"""
    
    def __init__(self, reason: str, status_code: int = 502):
        super().__init__(
            service="Google Places",
            reason=reason,
            status_code=status_code
        )


# ============================================================================
# Rate Limiting
# ============================================================================

class RateLimitExceededError(DeedProException):
    """Raised when rate limit is exceeded"""
    
    def __init__(self, limit: int, window: str, retry_after: Optional[int] = None):
        super().__init__(
            status_code=429,
            code="RATE_LIMIT_EXCEEDED",
            message=f"Rate limit exceeded: {limit} requests per {window}",
            details={
                "limit": limit,
                "window": window,
                "retry_after_seconds": retry_after
            }
        )


# ============================================================================
# Utility Functions
# ============================================================================

def format_validation_errors(errors: List[Dict[str, Any]]) -> List[str]:
    """
    Format Pydantic validation errors into human-readable messages
    """
    formatted = []
    for error in errors:
        loc = " -> ".join(str(l) for l in error.get("loc", []))
        msg = error.get("msg", "Unknown error")
        formatted.append(f"{loc}: {msg}")
    return formatted


def is_retryable_error(error: DeedProException) -> bool:
    """
    Determine if an error is retryable
    """
    retryable_codes = [
        "SITEX_SERVICE_ERROR",
        "PDFSHIFT_SERVICE_ERROR",
        "RATE_LIMIT_EXCEEDED",
        "PDF_ENGINE_UNAVAILABLE",
    ]
    return error.error_code in retryable_codes


def get_user_friendly_message(error: DeedProException) -> str:
    """
    Get a user-friendly error message suitable for display
    """
    friendly_messages = {
        "PROPERTY_NOT_FOUND": "We couldn't find that property. Please check the address and try again.",
        "PROPERTY_MULTI_MATCH": "Multiple properties match your search. Please select the correct one.",
        "PDF_GENERATION_FAILED": "There was a problem creating your document. Please try again.",
        "VALIDATION_FAILED": "Some required information is missing. Please complete all fields.",
        "AUTHENTICATION_FAILED": "Please log in to continue.",
        "RATE_LIMIT_EXCEEDED": "You've made too many requests. Please wait a moment and try again.",
    }
    return friendly_messages.get(error.error_code, error.error_message)

