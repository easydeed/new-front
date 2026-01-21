import io, os, time
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

async def _render_pdf(template_path: str, ctx: Dict[str, Any]) -> bytes:
    """Render PDF using pdf_engine (PDFShift with WeasyPrint fallback)"""
    try:
        # ✅ PHASE 19 FIX: Add datetime functions to match Grant Deed's approach
        from datetime import datetime
        ctx['now'] = datetime.now  # Pass the function itself, not the result
        ctx['datetime'] = datetime  # Also provide datetime module
        
        template = env.get_template(template_path)
        html = template.render(**ctx)
        
        # Use pdf_engine for PDFShift with WeasyPrint fallback
        from pdf_engine import render_pdf_async
        return await render_pdf_async(html)
    except TemplateError as e:
        raise HTTPException(status_code=500, detail=f'Template error: {e}')
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'PDF generation failed: {e}')

@router.post("/quitclaim-deed-ca", response_class=StreamingResponse)
async def quitclaim(ctx: QuitclaimDeedContext, user_id: str = Depends(get_current_user_id)):
    pdf = await _render_pdf("quitclaim_deed_ca/index.jinja2", ctx.dict())
    rid = f"quitclaim_{user_id}_{int(time.time())}"
    return StreamingResponse(io.BytesIO(pdf), media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="Quitclaim_Deed_CA_{rid}.pdf"',"X-Request-ID": rid})

@router.post("/interspousal-transfer-ca", response_class=StreamingResponse)
async def interspousal(ctx: InterspousalTransferContext, user_id: str = Depends(get_current_user_id)):
    pdf = await _render_pdf("interspousal_transfer_ca/index.jinja2", ctx.dict())
    rid = f"interspousal_{user_id}_{int(time.time())}"
    return StreamingResponse(io.BytesIO(pdf), media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="Interspousal_Transfer_CA_{rid}.pdf"',"X-Request-ID": rid})

@router.post("/warranty-deed-ca", response_class=StreamingResponse)
async def warranty(ctx: WarrantyDeedContext, user_id: str = Depends(get_current_user_id)):
    pdf = await _render_pdf("warranty_deed_ca/index.jinja2", ctx.dict())
    rid = f"warranty_{user_id}_{int(time.time())}"
    return StreamingResponse(io.BytesIO(pdf), media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="Warranty_Deed_CA_{rid}.pdf"',"X-Request-ID": rid})

@router.post("/tax-deed-ca", response_class=StreamingResponse)
async def taxdeed(ctx: TaxDeedContext, user_id: str = Depends(get_current_user_id)):
    pdf = await _render_pdf("tax_deed_ca/index.jinja2", ctx.dict())
    rid = f"taxdeed_{user_id}_{int(time.time())}"
    return StreamingResponse(io.BytesIO(pdf), media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="Tax_Deed_CA_{rid}.pdf"',"X-Request-ID": rid})

