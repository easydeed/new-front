"""
QR Code Generation for Document Verification
Generates QR codes that link to the verification page.
"""

import io
import base64
import os
import logging

logger = logging.getLogger(__name__)

# Default verification base URL
DEFAULT_BASE_URL = "https://deedpro-frontend-new.vercel.app"


def generate_verification_qr(short_code: str, base_url: str = None) -> str:
    """
    Generate QR code as base64 data URL.
    
    Args:
        short_code: Document short code (e.g., "DOC-2026-A7X9K")
        base_url: Base URL for verification (default: production URL)
    
    Returns:
        Base64 data URL for embedding in HTML/PDF
        Format: "data:image/png;base64,..."
    
    Raises:
        ImportError: If qrcode library not installed
    """
    try:
        import qrcode
        from qrcode.image.styledpil import StyledPilImage
    except ImportError:
        logger.error("qrcode library not installed. Run: pip install qrcode[pil]")
        raise ImportError("qrcode[pil] required for QR code generation")
    
    if not base_url:
        base_url = os.getenv("FRONTEND_URL", DEFAULT_BASE_URL)
    
    verification_url = f"{base_url}/verify/{short_code}"
    
    # Generate QR code with error correction
    qr = qrcode.QRCode(
        version=1,  # Size (1 is smallest)
        error_correction=qrcode.constants.ERROR_CORRECT_M,  # ~15% error correction
        box_size=10,  # Pixels per box
        border=2,  # Border thickness in boxes
    )
    qr.add_data(verification_url)
    qr.make(fit=True)
    
    # Create image (black on white)
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    logger.debug(f"Generated QR code for {short_code} -> {verification_url}")
    
    return f"data:image/png;base64,{img_base64}"


def generate_verification_url(short_code: str, base_url: str = None) -> str:
    """
    Generate the verification URL for a document.
    
    Args:
        short_code: Document short code
        base_url: Base URL for verification
    
    Returns:
        Full verification URL
    """
    if not base_url:
        base_url = os.getenv("FRONTEND_URL", DEFAULT_BASE_URL)
    
    return f"{base_url}/verify/{short_code}"
