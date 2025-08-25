from weasyprint import HTML
from typing import Dict, Any, Optional
import tempfile
import os

def html_to_pdf(html_content: str, options: Dict[str, Any] = None, recorder_profile: Optional[Dict[str, Any]] = None) -> bytes:
    """Convert HTML to PDF and return as bytes"""
    try:
        # Create HTML object with CSS options
        html_obj = HTML(string=html_content)
        
        # Generate PDF with options
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
            html_obj.write_pdf(tmp_file.name)
            
            # Read PDF content
            with open(tmp_file.name, 'rb') as pdf_file:
                pdf_content = pdf_file.read()
            
            # Clean up temp file
            os.unlink(tmp_file.name)
            
            return pdf_content
            
    except Exception as e:
        raise Exception(f"PDF generation failed: {str(e)}")
