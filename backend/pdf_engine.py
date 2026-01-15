"""
PDF Generation Engine
Supports triple rendering: WeasyPrint (default), PDFShift (cloud), and Chromium (local)

Phase 1.1: Added PDFShift integration for production-grade PDF generation
"""
import os
import logging
import asyncio
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


def render_pdf_with_weasyprint(html: str, base_url: Optional[str] = None) -> bytes:
    """
    Render PDF using WeasyPrint (default engine)
    Fast, no browser required, production-ready
    """
    try:
        from weasyprint import HTML
    except Exception as e:
        raise RuntimeError(f"WeasyPrint not available: {e}")
    
    return HTML(string=html, base_url=base_url or os.getcwd()).write_pdf()


def render_pdf_with_chromium(html: str, page_setup: Dict[str, str]) -> bytes:
    """
    Render PDF using Chromium/Playwright (optional engine)
    Matches browser rendering for E2E testing
    Requires: pip install playwright && playwright install chromium
    """
    try:
        from playwright.sync_api import sync_playwright
    except Exception as e:
        raise RuntimeError(
            "Chromium engine requires Playwright. "
            "Run: pip install playwright && playwright install chromium"
        ) from e

    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context()
        page = context.new_page()
        page.emulate_media(media="print")
        page.set_content(html, wait_until="networkidle")
        pdf_bytes = page.pdf(
            format="Letter",
            margin=page_setup,
            print_background=True,
            prefer_css_page_size=True
        )
        browser.close()
        return pdf_bytes


async def render_pdf_with_pdfshift(
    html: str, 
    options: Optional[Dict[str, Any]] = None
) -> bytes:
    """
    Render PDF using PDFShift API (cloud Chrome headless)
    Best for production - consistent, high-quality output
    Requires: PDFSHIFT_API_KEY environment variable
    """
    from services.pdfshift_service import pdfshift_service
    
    if not pdfshift_service.is_configured():
        raise RuntimeError(
            "PDFShift engine requires PDFSHIFT_API_KEY environment variable"
        )
    
    return await pdfshift_service.render_pdf(html, options)


def render_pdf_with_pdfshift_sync(
    html: str, 
    options: Optional[Dict[str, Any]] = None
) -> bytes:
    """
    Synchronous wrapper for PDFShift rendering
    For use in non-async contexts
    """
    from services.pdfshift_service import pdfshift_service
    
    if not pdfshift_service.is_configured():
        raise RuntimeError(
            "PDFShift engine requires PDFSHIFT_API_KEY environment variable"
        )
    
    return pdfshift_service.render_pdf_sync(html, options)


def render_pdf(
    html: str, 
    base_url: Optional[str] = None, 
    page_setup: Optional[Dict[str, str]] = None, 
    engine: str = "auto",
    pdfshift_options: Optional[Dict[str, Any]] = None
) -> bytes:
    """
    Main PDF rendering function with triple engine support
    
    Args:
        html: HTML content to render
        base_url: Base URL for resolving relative paths (fonts, images)
        page_setup: Page margins (for Chromium engine)
        engine: 'auto' (default), 'pdfshift', 'weasyprint', or 'chromium'/'playwright'
        pdfshift_options: Additional options for PDFShift API
    
    Returns:
        PDF binary data
    
    Raises:
        ValueError: If unknown engine specified
        RuntimeError: If engine dependencies missing
    
    Engine Selection (when 'auto'):
        1. PDFShift - if PDFSHIFT_API_KEY is set (best quality)
        2. WeasyPrint - fallback (fast, local)
    """
    # Get engine from parameter or environment variable
    requested_engine = (engine or os.getenv("PDF_ENGINE") or "auto").lower()
    
    # Auto-select engine based on available services
    if requested_engine == "auto":
        from services.pdfshift_service import pdfshift_service
        if pdfshift_service.is_configured():
            selected_engine = "pdfshift"
            logger.info("PDF Engine: Auto-selected PDFShift (API key configured)")
        else:
            selected_engine = "weasyprint"
            logger.info("PDF Engine: Auto-selected WeasyPrint (PDFShift not configured)")
    else:
        selected_engine = requested_engine
    
    # Default page setup
    if page_setup is None:
        page_setup = {
            "top": "0.5in",
            "right": "0.625in",
            "bottom": "0.625in",
            "left": "0.75in"
        }
    
    # Route to appropriate engine
    if selected_engine == "weasyprint":
        logger.debug("Rendering PDF with WeasyPrint")
        return render_pdf_with_weasyprint(html, base_url=base_url)
    
    elif selected_engine in ("chromium", "chrome", "playwright"):
        logger.debug("Rendering PDF with Chromium/Playwright")
        return render_pdf_with_chromium(html, page_setup=page_setup)
    
    elif selected_engine == "pdfshift":
        logger.debug("Rendering PDF with PDFShift")
        # Convert page_setup to PDFShift margin format if needed
        options = pdfshift_options or {}
        if page_setup and "margin" not in options:
            options["margin"] = page_setup
        return render_pdf_with_pdfshift_sync(html, options)
    
    else:
        raise ValueError(
            f"Unknown PDF engine: {selected_engine}. "
            f"Use 'auto', 'pdfshift', 'weasyprint', or 'chromium'"
        )


async def render_pdf_async(
    html: str, 
    base_url: Optional[str] = None, 
    page_setup: Optional[Dict[str, str]] = None, 
    engine: str = "auto",
    pdfshift_options: Optional[Dict[str, Any]] = None
) -> bytes:
    """
    Async version of render_pdf for use in async contexts
    
    Preferred for PDFShift as it uses async HTTP client
    """
    requested_engine = (engine or os.getenv("PDF_ENGINE") or "auto").lower()
    
    # Auto-select engine
    if requested_engine == "auto":
        from services.pdfshift_service import pdfshift_service
        selected_engine = "pdfshift" if pdfshift_service.is_configured() else "weasyprint"
    else:
        selected_engine = requested_engine
    
    if page_setup is None:
        page_setup = {
            "top": "0.5in",
            "right": "0.625in",
            "bottom": "0.625in",
            "left": "0.75in"
        }
    
    if selected_engine == "pdfshift":
        options = pdfshift_options or {}
        if page_setup and "margin" not in options:
            options["margin"] = page_setup
        return await render_pdf_with_pdfshift(html, options)
    
    elif selected_engine == "weasyprint":
        # Run sync WeasyPrint in thread pool for non-blocking
        return await asyncio.get_event_loop().run_in_executor(
            None, render_pdf_with_weasyprint, html, base_url
        )
    
    elif selected_engine in ("chromium", "chrome", "playwright"):
        return await asyncio.get_event_loop().run_in_executor(
            None, render_pdf_with_chromium, html, page_setup
        )
    
    else:
        raise ValueError(f"Unknown PDF engine: {selected_engine}")

