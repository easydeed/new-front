"""
PDF Generation Engine
Supports dual rendering: WeasyPrint (default) and Chromium (optional)
"""
import os
from typing import Optional, Dict

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
    engine: str = "weasyprint"
) -> bytes:
    """
    Main PDF rendering function with dual engine support
    
    Args:
        html: HTML content to render
        base_url: Base URL for resolving relative paths (fonts, images)
        page_setup: Page margins (for Chromium engine)
        engine: 'weasyprint' (default) or 'chromium'/'playwright'
    
    Returns:
        PDF binary data
    
    Raises:
        ValueError: If unknown engine specified
        RuntimeError: If engine dependencies missing
    """
    # Get engine from parameter or environment variable
    engine = (engine or os.getenv("PDF_ENGINE") or "weasyprint").lower()
    
    # Default page setup
    if page_setup is None:
        page_setup = {
            "top": "0.75in",
            "right": "0.5in",
            "bottom": "0.5in",
            "left": "0.5in"
        }
    
    if engine == "weasyprint":
        return render_pdf_with_weasyprint(html, base_url=base_url)
    elif engine in ("chromium", "chrome", "playwright"):
        return render_pdf_with_chromium(html, page_setup=page_setup)
    else:
        raise ValueError(f"Unknown PDF engine: {engine}. Use 'weasyprint' or 'chromium'")

