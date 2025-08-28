from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from jinja2 import Environment, FileSystemLoader, select_autoescape
from ..models.grant_deed import GrantDeedRenderContext
import tempfile
import io
import os

router = APIRouter(prefix="/generate", tags=["generate"])

# Get the template root path relative to this file
TEMPLATE_ROOT = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "templates")
env = Environment(
    loader=FileSystemLoader(TEMPLATE_ROOT),
    autoescape=select_autoescape(["html", "xml", "jinja2"])
)

@router.post("/grant-deed-ca", response_class=StreamingResponse)
def generate_grant_deed_ca(ctx: GrantDeedRenderContext):
    """
    Render Grant Deed (CA) to PDF using Jinja template and stream the file.
    Ensures US Letter page geometry and repo-aligned margins.
    """
    try:
        template = env.get_template("grant_deed_ca/index.jinja2")

        # Build the Jinja context
        jinja_ctx = ctx.dict()

        # Render the HTML
        html_content = template.render(**jinja_ctx)
        
        # Generate PDF using WeasyPrint (matching existing pattern)
        from weasyprint import HTML  # Lazy import to avoid test env failures
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
            HTML(string=html_content, encoding='utf-8').write_pdf(tmp_file.name)
            
            # Read the PDF content
            with open(tmp_file.name, 'rb') as pdf_file:
                pdf_bytes = pdf_file.read()
            
            # Clean up temp file
            os.unlink(tmp_file.name)

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="Grant_Deed_CA.pdf"'}
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Grant Deed render failed: {e}")
