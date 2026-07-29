"""
PDF Generation Engine
WeasyPrint (production) with Chromium/Playwright available for local E2E work.

PS2 (2026-07-29, owner decision): WeasyPrint IS the production engine —
the engine every test in the harness exercises, closing the
test-vs-production render asymmetry from the PDFShift 401/400 incidents.
PS3: the production parity check PASSED on the Render box (all geometry
within 0.5pt; statutory strings and mail-to identical), so PDFShift is
REMOVED — service, allowlist pins, and parity script deleted; the env
var and account are retired owner-side. A stale PDF_ENGINE=pdfshift
renders through WeasyPrint with a loud log (never a crash, never
silent) until the var is deleted.
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


def render_pdf(
    html: str,
    base_url: Optional[str] = None,
    page_setup: Optional[Dict[str, str]] = None,
    engine: Optional[str] = None,
) -> bytes:
    """
    Main PDF rendering function

    Args:
        html: HTML content to render
        base_url: Base URL for resolving relative paths (fonts, images)
        page_setup: Page margins (for Chromium engine)
        engine: None (default: PDF_ENGINE env var, else 'auto'), 'auto',
            'weasyprint', or 'chromium'/'playwright'.
            PS2 note: the old default was the string "auto", which is
            truthy — `engine or os.getenv("PDF_ENGINE")` therefore NEVER
            read the env var from the stored-PDF pipeline. The fallback
            flag has to actually work, so the default is now None.
    
    Returns:
        PDF binary data
    
    Raises:
        ValueError: If unknown engine specified
        RuntimeError: If engine dependencies missing
    
    Engine Selection (when 'auto'):
        WeasyPrint, always (PS2/PS3 — PDFShift is removed).
    """
    # Get engine from parameter or environment variable
    requested_engine = (engine or os.getenv("PDF_ENGINE") or "auto").lower()

    # PS2/PS3: 'auto' means WeasyPrint. A stale 'pdfshift' value (the
    # engine is removed) also renders through WeasyPrint — loudly, so the
    # leftover env var gets deleted rather than crashing every render.
    if requested_engine == "auto":
        selected_engine = "weasyprint"
        logger.info("PDF Engine: WeasyPrint (production engine)")
    elif requested_engine == "pdfshift":
        selected_engine = "weasyprint"
        logger.warning(
            "PDF_ENGINE=pdfshift is RETIRED (PS3) — rendering with WeasyPrint. "
            "Delete the PDF_ENGINE and PDFSHIFT_API_KEY env vars."
        )
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
    
    else:
        raise ValueError(
            f"Unknown PDF engine: {selected_engine}. "
            f"Use 'auto', 'weasyprint', or 'chromium'"
        )


async def render_pdf_async(
    html: str,
    base_url: Optional[str] = None,
    page_setup: Optional[Dict[str, str]] = None,
    engine: Optional[str] = None,
) -> bytes:
    """
    Async version of render_pdf for use in async contexts
    (WeasyPrint runs in a thread pool so the event loop never blocks.)
    """
    requested_engine = (engine or os.getenv("PDF_ENGINE") or "auto").lower()

    # PS2/PS3: same rule as the sync path — a stale 'pdfshift' renders
    # through WeasyPrint, loudly.
    if requested_engine in ("auto", "pdfshift"):
        if requested_engine == "pdfshift":
            logger.warning("PDF_ENGINE=pdfshift is RETIRED (PS3) — rendering with WeasyPrint.")
        selected_engine = "weasyprint"
    else:
        selected_engine = requested_engine

    if page_setup is None:
        page_setup = {
            "top": "0.5in",
            "right": "0.625in",
            "bottom": "0.625in",
            "left": "0.75in"
        }

    if selected_engine == "weasyprint":
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

