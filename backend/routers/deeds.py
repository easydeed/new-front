from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from jinja2 import Environment, FileSystemLoader, select_autoescape
from models.grant_deed import GrantDeedRenderContext
from utils.pdf import html_to_pdf
import io, os
from datetime import datetime

router = APIRouter(prefix="/generate", tags=["generate"])

TEMPLATE_ROOT = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "templates")
env = Environment(loader=FileSystemLoader(TEMPLATE_ROOT), autoescape=select_autoescape(["html","xml","jinja2"]))
# Expose a safe 'now' to templates
env.globals["now"] = datetime.now

@router.post("/grant-deed-ca", response_class=StreamingResponse)
def generate_grant_deed_ca(ctx: GrantDeedRenderContext):
    try:
        tpl = env.get_template("grant_deed_ca/index.jinja2")
        data = ctx.dict()
        # Normalize nested dicts to avoid attribute errors in Jinja
        dtt = data.get("dtt") or {}
        if not isinstance(dtt, dict):
            dtt = {}
        data["dtt"] = dtt
        ret = data.get("return_to") or {}
        if not isinstance(ret, dict):
            ret = {}
        data["return_to"] = ret
        # Guarantee strings for fields that may be None
        for k in ["requested_by", "title_company", "escrow_no", "title_order_no", "apn",
                  "grantors_text", "grantees_text", "county", "legal_description", "execution_date"]:
            if data.get(k) is None:
                data[k] = ""
        html = tpl.render(**data)
        pdf = html_to_pdf(html, options={
            "page-size": ctx.page.size,
            "margin-top": ctx.page.margins.top,
            "margin-right": ctx.page.margins.right,
            "margin-bottom": ctx.page.margins.bottom,
            "margin-left": ctx.page.margins.left,
            "print-media-type": True,
            "encoding": "UTF-8",
        }, recorder_profile=ctx.recorder_profile)
        return StreamingResponse(io.BytesIO(pdf), media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="Grant_Deed_CA.pdf"'})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Grant Deed render failed: {e}")