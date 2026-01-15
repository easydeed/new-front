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
        
        # Default options optimized for legal documents
        default_options = {
            "source": html,
            "format": "Letter",  # US Letter 8.5" x 11"
            "margin": {
                "top": "0.5in",
                "right": "0.625in", 
                "bottom": "0.625in",
                "left": "0.75in"  # Extra left margin for binding
            },
            "printBackground": True,
            "preferCSSPageSize": True,  # Honor @page CSS rules
            "displayHeaderFooter": False,
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
                    auth=(self.api_key, ""),  # Basic auth with API key
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
        
        default_options = {
            "source": html,
            "format": "Letter",
            "margin": {
                "top": "0.5in",
                "right": "0.625in", 
                "bottom": "0.625in",
                "left": "0.75in"
            },
            "printBackground": True,
            "preferCSSPageSize": True,
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
                auth=(self.api_key, ""),
                json=default_options
            )
            response.raise_for_status()
            return response.content


# Singleton instance
pdfshift_service = PDFShiftService()

