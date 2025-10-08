import io, os, time, tempfile
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from typing import Any, Dict
from jinja2 import Environment, FileSystemLoader, select_autoescape, TemplateError

from models.quitclaim_deed import QuitclaimDeedContext
from models.interspousal_transfer import InterspousalTransferContext
from models.warranty_deed import WarrantyDeedContext
from models.tax_deed import TaxDeedContext
from auth import get_current_user_id

router = APIRouter(prefix="/api/generate", tags=["deeds-extra"])

TEMPLATE_ROOT = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "templates")
env = Environment(loader=FileSystemLoader(TEMPLATE_ROOT), autoescape=select_autoescape(["html","xml","jinja2"]))

def _render_pdf(template_path: str, ctx: Dict[str, Any]) -> bytes:
    try:
        template = env.get_template(template_path)
        html = template.render(**ctx)
        from weasyprint import HTML
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
            HTML(string=html, encoding='utf-8').write_pdf(tmp.name)
            with open(tmp.name,'rb') as f:
                pdf = f.read()
        os.unlink(tmp.name)
        return pdf
    except TemplateError as e:
        raise HTTPException(status_code=500, detail=f'Template error: {e}')
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'PDF generation failed: {e}')

@router.post("/quitclaim-deed-ca", response_class=StreamingResponse)
async def quitclaim(ctx: QuitclaimDeedContext, user_id: str = Depends(get_current_user_id)):
    pdf = _render_pdf("quitclaim_deed_ca/index.jinja2", ctx.dict())
    rid = f"quitclaim_{user_id}_{int(time.time())}"
    return StreamingResponse(io.BytesIO(pdf), media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="Quitclaim_Deed_CA_{rid}.pdf"',"X-Request-ID": rid})

@router.post("/interspousal-transfer-ca", response_class=StreamingResponse)
async def interspousal(ctx: InterspousalTransferContext, user_id: str = Depends(get_current_user_id)):
    pdf = _render_pdf("interspousal_transfer_ca/index.jinja2", ctx.dict())
    rid = f"interspousal_{user_id}_{int(time.time())}"
    return StreamingResponse(io.BytesIO(pdf), media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="Interspousal_Transfer_CA_{rid}.pdf"',"X-Request-ID": rid})

@router.post("/warranty-deed-ca", response_class=StreamingResponse)
async def warranty(ctx: WarrantyDeedContext, user_id: str = Depends(get_current_user_id)):
    pdf = _render_pdf("warranty_deed_ca/index.jinja2", ctx.dict())
    rid = f"warranty_{user_id}_{int(time.time())}"
    return StreamingResponse(io.BytesIO(pdf), media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="Warranty_Deed_CA_{rid}.pdf"',"X-Request-ID": rid})

@router.post("/tax-deed-ca", response_class=StreamingResponse)
async def taxdeed(ctx: TaxDeedContext, user_id: str = Depends(get_current_user_id)):
    pdf = _render_pdf("tax_deed_ca/index.jinja2", ctx.dict())
    rid = f"taxdeed_{user_id}_{int(time.time())}"
    return StreamingResponse(io.BytesIO(pdf), media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="Tax_Deed_CA_{rid}.pdf"',"X-Request-ID": rid})

