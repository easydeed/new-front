"""The PCOR offer — one shape, wherever it is offered from.

═══ WHY THIS MODULE EXISTS ═══

The PCOR is the conveyance's legally required companion (R&T §480.3 — a
deed presented without one may be charged an extra $20 at recording), and
roughly the parts a deed already knows are the parts somebody would
otherwise retype.

Three surfaces offer it, and they must offer the SAME THING:

  - the officer, from her own deed        (`/deeds/{id}/pcor`)
  - the notary, from her signing link     (`/signing/{token}/pcor`)
  - and whatever asks next

Before this module there were two copies of the availability body — one
in `routers/deeds_crud.py`, one in the NOTARY1 route retired in #170 —
and they had already drifted in their filename. Standing rule: when a new
surface needs an existing judgement, the answer is never a second copy.
This ticket adds a surface and ends with one fewer.

═══ WHAT THE STATUS BODY SAYS, AND WHAT IT REFUSES TO SAY ═══

Availability, the form's identity, and the **asks** — the fields the
buyer must still complete. Not a count and not a percentage. We fill nine
text fields of sixty-five; "80% prefilled" would be a claim we cannot
support, and every claim this product makes has to trace to something
real.

═══ UNFLATTENED, NEVER STORED, NEVER HASHED ═══

Doctrine §9 freezes the stored instrument because the instrument is ours.
**The PCOR is not.** It is the buyer's form, they must complete and sign
it, and freezing a document somebody else has to finish would be the
wrong kind of faithful. So it is generated on demand, handed over
editable, and no copy is kept.
"""
from __future__ import annotations

from typing import Any, Dict

from fastapi import HTTPException
from fastapi.responses import Response


def status(deed: Dict[str, Any], download_url: str) -> Dict[str, Any]:
    """Is there a PCOR for this deed's county, and what will it still need.

    `download_url` is the caller's, because the route that offers the
    form is the route that should serve it — an officer's link and a
    notary's link are scoped differently and must not be handed each
    other's URL.
    """
    from services.boe_form_fill import values_from_deed
    from services.county_forms import lookup_form

    county = deed.get("county") or ""
    form = lookup_form(county)
    if form is None:
        return {
            "available": False,
            "county": deed.get("county"),
            "reason": f"No PCOR on file for {deed.get('county') or 'this county'}.",
        }
    _values, asks = values_from_deed(deed)
    return {
        "available": True,
        "county": form.county,
        "form_code": form.form_code,
        "revision": form.revision,
        "county_revision": form.county_revision,
        "url": download_url,
        "still_needed": asks,
    }


def download(deed: Dict[str, Any], filename: str) -> Response:
    """The filled PCOR, unflattened, as an attachment.

    A county with no form on file is a 404 with the reason attached
    rather than an empty PDF — invariant #4: the caller learns which of
    "we cannot" and "there is nothing" applies.
    """
    from services.boe_form_fill import PcorUnavailable, fill_pcor

    try:
        pdf_bytes, _asks = fill_pcor(deed)
    except PcorUnavailable as e:
        raise HTTPException(status_code=404, detail=str(e))

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
