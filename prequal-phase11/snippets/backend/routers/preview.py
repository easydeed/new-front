import io, os, time, tempfile
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from jinja2 import Environment, FileSystemLoader, select_autoescape, TemplateError

router = APIRouter()

SERVER_SIDE_PREVIEW_ENABLED = os.getenv('SERVER_SIDE_PREVIEW_ENABLED', 'false').lower() == 'true'

TEMPLATE_ROOT = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "templates")
env = Environment(
    loader=FileSystemLoader(TEMPLATE_ROOT),
    autoescape=select_autoescape(["html", "xml", "jinja2"])
)

class PreviewCtx(BaseModel):
    doc_type: str
    context: dict

@router.post("/preview")
async def generate_preview(payload: PreviewCtx):
    if not SERVER_SIDE_PREVIEW_ENABLED:
        raise HTTPException(status_code=403, detail="Server-side preview disabled")

    template_map = {
        "grant_deed_ca": "grant_deed_ca/index.jinja2",
        "quitclaim_deed_ca": "quitclaim_deed_ca/index.jinja2",
        "interspousal_transfer_ca": "interspousal_transfer_ca/index.jinja2",
        "warranty_deed_ca": "warranty_deed_ca/index.jinja2",
        "tax_deed_ca": "tax_deed_ca/index.jinja2",
    }
    name = template_map.get(payload.doc_type)
    if not name:
        raise HTTPException(status_code=400, detail="Unknown doc type")

    try:
        template = env.get_template(name)
        html = template.render(**payload.context)
    except TemplateError as e:
        raise HTTPException(status_code=500, detail=f"Template error: {e}")

    try:
        from weasyprint import HTML
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
            HTML(string=html, encoding='utf-8').write_pdf(tmp.name)
            with open(tmp.name, 'rb') as f:
                pdf = f.read()
        os.unlink(tmp.name)
        return StreamingResponse(io.BytesIO(pdf), media_type="application/pdf", headers={
            "Content-Disposition": "inline; filename=preview.pdf"
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview generation failed: {e}")
