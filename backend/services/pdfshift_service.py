"""
PDFShift API Integration for Professional PDF Generation
Uses Chrome headless for pixel-perfect CSS rendering.

Phase 1.1 of DeedPro Enhancement Project
"""

import httpx
import os
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class PDFShiftService:
    """
    PDFShift API integration for professional PDF generation.
    Uses Chrome headless for pixel-perfect CSS rendering.
    
    Features:
    - Chrome-based rendering (superior CSS Grid/Flexbox support)
    - Consistent output across environments
    - Professional print quality
    - Fast API response times
    """
    
    def __init__(self):
        self.api_key = os.getenv("PDFSHIFT_API_KEY")
        self.base_url = "https://api.pdfshift.io/v3/convert/pdf"
        self.default_timeout = float(os.getenv("PDFSHIFT_TIMEOUT", "30"))
        
    def is_configured(self) -> bool:
        """Check if PDFShift API key is configured"""
        return bool(self.api_key)
    
    async def render_pdf(
        self,
        html: str,
        options: Optional[Dict[str, Any]] = None,
        timeout: Optional[float] = None
    ) -> bytes:
        """
        Convert HTML to PDF via PDFShift API.
        
        Args:
            html: Complete HTML document string
            options: Override default PDF options
            timeout: Request timeout in seconds
            
        Returns:
            PDF bytes
            
        Raises:
            RuntimeError: If API key not configured
            httpx.HTTPError: On API failures
        """
        if not self.is_configured():
            raise RuntimeError("PDFSHIFT_API_KEY environment variable not set")
        
        # ONLY documented PDFShift v3 parameters. The old defaults copied
        # Playwright page.pdf() options (printBackground, preferCSSPageSize,
        # displayHeaderFooter) and a margin object — PDFShift validates
        # strictly and 400'd every real render (2026-07-28, the lock behind
        # the auth lock). Page size and margins are owned by the templates'
        # @page CSS, which Chrome print honors.
        default_options = {
            "source": html,
            "format": "Letter",
            "landscape": False,
        }
        
        if options:
            # Deep merge options
            for key, value in options.items():
                if isinstance(value, dict) and key in default_options:
                    default_options[key].update(value)
                else:
                    default_options[key] = value
        
        request_timeout = timeout or self.default_timeout
        
        try:
            logger.info(f"PDFShift: Generating PDF (timeout={request_timeout}s)")
            
            async with httpx.AsyncClient(timeout=request_timeout) as client:
                response = await client.post(
                    self.base_url,
                    auth=("api", self.api_key),  # PDFShift basic auth: username 'api', key as PASSWORD
                    json=default_options,
                    headers={
                        "Content-Type": "application/json",
                        "Accept": "application/pdf"
                    }
                )
                
                # Check for specific error conditions
                if response.status_code == 401:
                    logger.error("PDFShift: Invalid API key")
                    raise RuntimeError("PDFShift authentication failed - check API key")
                elif response.status_code == 429:
                    logger.warning("PDFShift: Rate limit exceeded")
                    raise RuntimeError("PDFShift rate limit exceeded - try again later")
                elif response.status_code == 400:
                    error_detail = response.text
                    logger.error(f"PDFShift: Bad request - {error_detail}")
                    raise RuntimeError(f"PDFShift conversion failed: {error_detail}")
                
                response.raise_for_status()
                
                pdf_bytes = response.content
                logger.info(f"PDFShift: PDF generated successfully ({len(pdf_bytes)} bytes)")
                
                return pdf_bytes
                
        except httpx.TimeoutException as e:
            logger.error(f"PDFShift: Request timed out after {request_timeout}s")
            raise RuntimeError(f"PDFShift request timed out after {request_timeout}s") from e
        except httpx.HTTPStatusError as e:
            logger.error(f"PDFShift: HTTP error {e.response.status_code}")
            raise
        except Exception as e:
            logger.error(f"PDFShift: Unexpected error - {e}")
            raise
    
    def render_pdf_sync(
        self,
        html: str,
        options: Optional[Dict[str, Any]] = None,
        timeout: Optional[float] = None
    ) -> bytes:
        """
        Synchronous version of render_pdf for non-async contexts.
        
        Args:
            html: Complete HTML document string
            options: Override default PDF options
            timeout: Request timeout in seconds
            
        Returns:
            PDF bytes
        """
        if not self.is_configured():
            raise RuntimeError("PDFSHIFT_API_KEY environment variable not set")
        
        # Documented PDFShift v3 parameters only (see async path note).
        default_options = {
            "source": html,
            "format": "Letter",
            "landscape": False,
        }
        
        if options:
            for key, value in options.items():
                if isinstance(value, dict) and key in default_options:
                    default_options[key].update(value)
                else:
                    default_options[key] = value
        
        request_timeout = timeout or self.default_timeout
        
        with httpx.Client(timeout=request_timeout) as client:
            response = client.post(
                self.base_url,
                auth=("api", self.api_key),
                json=default_options
            )
            if response.status_code >= 400:
                # PDFShift's error body names the offending parameter —
                # never discard it (the 400 diagnosis lived in this body).
                raise RuntimeError(
                    f"PDFShift {response.status_code}: {response.text[:300]}"
                )
            return response.content


# Singleton instance
pdfshift_service = PDFShiftService()

