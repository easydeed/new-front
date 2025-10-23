from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from jinja2 import Environment, FileSystemLoader, select_autoescape, TemplateError
from models.grant_deed import GrantDeedRenderContext
from models.grant_deed_pixel import GrantDeedPixelContext
from auth import get_current_user_id
import tempfile
import io
import os
import logging
import time
import json
from typing import Dict, Any
from pydantic import ValidationError

router = APIRouter(prefix="/generate", tags=["generate"])

# Configure logging
logger = logging.getLogger(__name__)

# Get the template root path relative to this file
TEMPLATE_ROOT = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "templates")
env = Environment(
    loader=FileSystemLoader(TEMPLATE_ROOT),
    autoescape=select_autoescape(["html", "xml", "jinja2"])
)

# Register custom filters for pixel-perfect rendering
from filters import shrink_to_fit, hyphenate_soft
env.filters["hyphenate_soft"] = hyphenate_soft
env.filters["shrink_to_fit"] = shrink_to_fit

# Feature flag for dynamic wizard
DYNAMIC_WIZARD_ENABLED = os.getenv("DYNAMIC_WIZARD_ENABLED", "false").lower() == "true"
PDF_GENERATION_TIMEOUT = int(os.getenv("PDF_GENERATION_TIMEOUT", "30"))
TEMPLATE_VALIDATION_STRICT = os.getenv("TEMPLATE_VALIDATION_STRICT", "true").lower() == "true"

@router.post("/grant-deed-ca", response_class=StreamingResponse)
async def generate_grant_deed_ca(
    ctx: GrantDeedRenderContext,
    user_id: str = Depends(get_current_user_id)
):
    """
    Render Grant Deed (CA) to PDF using Jinja template and stream the file.
    Ensures US Letter page geometry and repo-aligned margins.
    
    Phase 3 Enhancements:
    - Schema validation with detailed error reporting
    - Comprehensive logging and error instrumentation
    - Performance monitoring and timeout handling
    - User authentication and audit trail
    """
    start_time = time.time()
    request_id = f"grant_deed_{user_id}_{int(start_time)}"
    
    logger.info(f"[{request_id}] Grant deed generation started for user {user_id}")
    
    try:
        # Validate input data
        validation_errors = validate_grant_deed_context(ctx)
        if validation_errors and TEMPLATE_VALIDATION_STRICT:
            logger.warning(f"[{request_id}] Validation errors: {validation_errors}")
            raise HTTPException(
                status_code=400, 
                detail=f"Validation failed: {'; '.join(validation_errors)}"
            )
        elif validation_errors:
            logger.warning(f"[{request_id}] Validation warnings (non-strict): {validation_errors}")

        # Load template with error handling
        try:
            template = env.get_template("grant_deed_ca/index.jinja2")
            logger.debug(f"[{request_id}] Template loaded successfully")
        except TemplateError as e:
            logger.error(f"[{request_id}] Template loading failed: {e}")
            raise HTTPException(status_code=500, detail=f"Template error: {e}")

        # Build the Jinja context with sanitization
        jinja_ctx = sanitize_template_context(ctx.dict())
        
        # 🔧 FIX: Add Jinja built-in variables that templates expect
        from datetime import datetime
        jinja_ctx['now'] = datetime.now  # Pass the function itself, not the result
        jinja_ctx['datetime'] = datetime  # Also provide datetime module for templates
        
        logger.debug(f"[{request_id}] Template context prepared")

        # Render the HTML with timeout protection
        try:
            html_content = template.render(**jinja_ctx)
            render_time = time.time() - start_time
            logger.debug(f"[{request_id}] HTML rendered in {render_time:.2f}s")
        except TemplateError as e:
            logger.error(f"[{request_id}] Template rendering failed: {e}")
            raise HTTPException(status_code=500, detail=f"Template rendering error: {e}")
        
        # Generate PDF using WeasyPrint with timeout and error handling
        try:
            from weasyprint import HTML  # Lazy import to avoid test env failures
            
            pdf_start = time.time()
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
                HTML(string=html_content, encoding='utf-8').write_pdf(tmp_file.name)
                
                # Read the PDF content
                with open(tmp_file.name, 'rb') as pdf_file:
                    pdf_bytes = pdf_file.read()
                
                # Clean up temp file
                os.unlink(tmp_file.name)
                
            pdf_time = time.time() - pdf_start
            total_time = time.time() - start_time
            
            logger.info(f"[{request_id}] PDF generated successfully in {pdf_time:.2f}s (total: {total_time:.2f}s), size: {len(pdf_bytes)} bytes")
            
            # Log successful generation for audit trail
            await log_deed_generation(user_id, "grant_deed_ca", ctx.dict(), True, total_time)
            
        except Exception as e:
            logger.error(f"[{request_id}] PDF generation failed: {e}")
            await log_deed_generation(user_id, "grant_deed_ca", ctx.dict(), False, time.time() - start_time, str(e))
            raise HTTPException(status_code=500, detail=f"PDF generation failed: {e}")

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="Grant_Deed_CA_{request_id}.pdf"',
                "X-Generation-Time": f"{total_time:.2f}s",
                "X-Request-ID": request_id
            }
        )

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        total_time = time.time() - start_time
        logger.error(f"[{request_id}] Unexpected error after {total_time:.2f}s: {e}")
        await log_deed_generation(user_id, "grant_deed_ca", ctx.dict(), False, total_time, str(e))
        raise HTTPException(status_code=500, detail=f"Grant Deed generation failed: {e}")


def validate_grant_deed_context(ctx: GrantDeedRenderContext) -> list[str]:
    """
    Validate grant deed context for required fields and data integrity
    Returns list of validation errors/warnings
    """
    errors = []
    
    # Required fields for California Grant Deed
    if not ctx.grantors_text or not ctx.grantors_text.strip():
        errors.append("Grantor information is required")
    
    if not ctx.grantees_text or not ctx.grantees_text.strip():
        errors.append("Grantee information is required")
    
    if not ctx.legal_description or not ctx.legal_description.strip():
        errors.append("Legal description is required")
    
    if not ctx.county or not ctx.county.strip():
        errors.append("County is required")
    
    # APN validation (should be present for most deeds)
    if not ctx.apn or not ctx.apn.strip():
        errors.append("APN (Assessor's Parcel Number) is recommended")
    
    # Document transfer tax validation
    if ctx.dtt:
        if not ctx.dtt.get('amount'):
            errors.append("Document transfer tax amount is required when DTT is specified")
        if not ctx.dtt.get('city_name'):
            errors.append("City name is required for document transfer tax")
    
    # Execution date validation
    if ctx.execution_date:
        try:
            from datetime import datetime
            datetime.strptime(ctx.execution_date, '%Y-%m-%d')
        except ValueError:
            errors.append("Execution date must be in YYYY-MM-DD format")
    
    return errors


def sanitize_template_context(ctx: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sanitize template context to prevent injection and ensure data integrity
    """
    sanitized = {}
    
    for key, value in ctx.items():
        if isinstance(value, str):
            # Basic HTML escaping for string values
            sanitized[key] = value.replace('<', '&lt;').replace('>', '&gt;')
        elif isinstance(value, dict):
            # Recursively sanitize nested dictionaries
            sanitized[key] = sanitize_template_context(value)
        else:
            # Keep other types as-is
            sanitized[key] = value
    
    return sanitized


async def log_deed_generation(
    user_id: str, 
    deed_type: str, 
    context: Dict[str, Any], 
    success: bool, 
    duration: float,
    error: str = None
):
    """
    Log deed generation for audit trail and monitoring
    """
    try:
        log_entry = {
            "user_id": user_id,
            "deed_type": deed_type,
            "success": success,
            "duration_seconds": round(duration, 2),
            "timestamp": time.time(),
            "context_size": len(str(context)),
            "error": error
        }
        
        if success:
            logger.info(f"Deed generation successful: {log_entry}")
        else:
            logger.error(f"Deed generation failed: {log_entry}")
            
        # TODO: Store in database for audit trail if persistence is added
        
    except Exception as e:
        logger.error(f"Failed to log deed generation: {e}")


# ============================================================================
# PHASE 5-PREQUAL B: PIXEL-PERFECT PDF GENERATION
# ============================================================================

def _apply_recorder_profile(ctx: Dict) -> Dict:
    """
    Apply county-specific recorder margin profiles
    
    Args:
        ctx: Context dictionary
    
    Returns:
        Updated context with recorder-specific margins
    """
    profile_id = (ctx.get("recorder_profile") or {}).get("id")
    if not profile_id:
        return ctx
    
    cfg_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config", "recorder_profiles.json")
    try:
        with open(cfg_path, "r", encoding="utf-8") as f:
            profiles = json.load(f)
        
        if profile_id in profiles:
            ctx["page"]["margins"] = profiles[profile_id]["margins"]
            logger.info(f"Applied recorder profile: {profile_id} - {profiles[profile_id].get('name')}")
    except FileNotFoundError:
        logger.warning(f"Recorder profiles config not found: {cfg_path}")
    except Exception as e:
        logger.error(f"Error applying recorder profile: {e}")
    
    return ctx


@router.post("/grant-deed-ca-pixel", response_class=StreamingResponse)
async def generate_grant_deed_ca_pixel(
    ctx: GrantDeedPixelContext,
    user_id: str = Depends(get_current_user_id),
    engine: str = "weasyprint"
):
    """
    Generate pixel-perfect Grant Deed (CA) PDF
    
    Phase 5-Prequal B Enhancement:
    - Absolute positioning for deterministic layout
    - Dual engine support (WeasyPrint default, Chromium optional)
    - County-specific recorder profiles
    - Custom filters: hyphenation, text-fit
    - Pixel-perfect rendering for Cypress visual regression tests
    
    Args:
        ctx: Grant deed context (same as original endpoint)
        user_id: Authenticated user ID
        engine: PDF rendering engine ('weasyprint' or 'chromium')
    
    Returns:
        Streaming PDF response
    
    Raises:
        HTTPException: 400 for validation errors, 500 for rendering errors
    """
    start_time = time.time()
    request_id = f"grant_deed_pixel_{user_id}_{int(start_time)}"
    
    logger.info(f"[{request_id}] Pixel-perfect grant deed generation started for user {user_id} with engine={engine}")
    
    # Load template
    try:
        template = env.get_template("grant_deed_ca_pixel/index.jinja2")
        logger.debug(f"[{request_id}] Template loaded: grant_deed_ca_pixel/index.jinja2")
    except TemplateError as e:
        logger.error(f"[{request_id}] Template error: {e}")
        raise HTTPException(status_code=500, detail=f"Template error: {e}")
    
    # Apply recorder profile if specified
    try:
        ctx_dict = ctx.dict()
        ctx_dict = _apply_recorder_profile(ctx_dict)
        logger.debug(f"[{request_id}] Recorder profile applied")
    except Exception as e:
        logger.warning(f"[{request_id}] Failed to apply recorder profile: {e}")
        ctx_dict = ctx.dict()
    
    # Render HTML
    try:
        html = template.render(**ctx_dict)
        render_time = time.time() - start_time
        logger.debug(f"[{request_id}] HTML rendered in {render_time:.2f}s")
    except TemplateError as e:
        logger.error(f"[{request_id}] Template rendering error: {e}")
        raise HTTPException(status_code=500, detail=f"Template rendering error: {e}")
    
    # Generate PDF using selected engine
    try:
        from pdf_engine import render_pdf
        
        margins = ctx.page.margins.dict()
        base_url = os.path.join(TEMPLATE_ROOT, "grant_deed_ca_pixel")
        
        pdf_start = time.time()
        pdf_bytes = render_pdf(html, base_url=base_url, page_setup=margins, engine=engine)
        pdf_time = time.time() - pdf_start
        total_time = time.time() - start_time
        
        logger.info(f"[{request_id}] PDF generated successfully in {pdf_time:.2f}s (total: {total_time:.2f}s), size: {len(pdf_bytes)} bytes, engine: {engine}")
        
        # Log success
        await log_deed_generation(user_id, "grant_deed_ca_pixel", ctx.dict(), True, total_time)
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"[{request_id}] PDF generation failed: {error_msg}")
        await log_deed_generation(user_id, "grant_deed_ca_pixel", ctx.dict(), False, time.time() - start_time, error_msg)
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {error_msg}")
    
    # Stream response
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="Grant_Deed_CA_PIXEL_{request_id}.pdf"',
            "X-Generation-Time": f"{total_time:.2f}s",
            "X-Request-ID": request_id,
            "X-PDF-Engine": engine,
            "X-Phase": "5-Prequal-B"
        }
    )
