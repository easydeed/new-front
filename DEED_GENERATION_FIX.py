# =============================================================================
# ADD TO MAIN.PY TO FIX 404 ERROR FOR /generate-deed-preview
# =============================================================================

# 1. ADD THESE IMPORTS (add after existing imports at top of main.py):
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML
import base64
import tempfile

# 2. ADD AFTER DATABASE CONNECTION SETUP:
# Jinja2 environment for deed templates
env = Environment(loader=FileSystemLoader('../templates'))

# 3. ADD THIS PYDANTIC MODEL (after existing models):
class DeedData(BaseModel):
    deed_type: str
    data: dict

# 4. ADD THESE ENDPOINTS (before "if __name__ == '__main__':" at end of file):

# Deed preview endpoint (HTML-only, no PDF, no plan limit count)
@app.post("/generate-deed-preview")
async def generate_deed_preview(deed: DeedData):
    """Generate HTML preview of deed without PDF generation or plan limit usage"""
    try:
        # Get the template for the specified deed type
        template = env.get_template(f"{deed.deed_type}.html")
        
        # Render HTML with data injection
        html_content = template.render(deed.data)
        
        # Return only HTML for preview (no PDF generation, no plan usage)
        return {
            "html": html_content,
            "deed_type": deed.deed_type,
            "status": "preview_ready"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Deed preview failed: {str(e)}")

# Optional: Full deed generation endpoint with PDF
@app.post("/generate-deed")
async def generate_deed(deed: DeedData):
    """Generate pixel-perfect HTML and PDF deed using Jinja2 templates and WeasyPrint"""
    try:
        # Get the template for the specified deed type
        template = env.get_template(f"{deed.deed_type}.html")
        
        # Render HTML with data injection
        html_content = template.render(deed.data)
        
        # Generate PDF using WeasyPrint
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
            HTML(string=html_content).write_pdf(tmp_file.name)
            tmp_file.seek(0)
            
            # Read PDF content and encode as base64
            with open(tmp_file.name, 'rb') as f:
                pdf_bytes = f.read()
            
            # Clean up temporary file
            os.unlink(tmp_file.name)
            
        # Return both HTML and PDF
        return {
            "html": html_content,
            "pdf_base64": base64.b64encode(pdf_bytes).decode(),
            "deed_type": deed.deed_type,
            "status": "success"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Deed generation failed: {str(e)}")

# =============================================================================
# END OF ADDITIONS
# ============================================================================= 