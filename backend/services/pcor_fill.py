"""T-3 — filling the PCOR from what the deed already knows.

═══ WHAT THIS PRODUCES ═══

A partially-filled, STILL FILLABLE, UNFLATTENED PDF.

That is a deliberate departure from how this product treats every other
document it makes. A deed is ours: generated, hashed, frozen, immutable
(doctrine §9). The PCOR is NOT ours — it is the BUYER's form, filed with
the deed, certified by the buyer under penalty of perjury. Flattening it
would hand the buyer a document they cannot complete, which is worse than
handing them a blank one.

So the AcroForm stays live. We fill what the deed knows and get out of
the way.

═══ WHAT IS NEVER FILLED ═══

1. THE CERTIFICATION BLOCK, every element, including the printed-name
   line. See county_forms.CERTIFICATION_BLOCK for the reasoning: the
   form has no /Sig field so a signature is impossible, but printing the
   buyer's name under an unsigned sworn statement is the same act by a
   quieter route.

2. PART 1 EXCLUSION CHECKBOXES. Never auto-checked, at all, ever. They
   are legal claims with tax consequences; doctrine §1 says a legal
   choice is proposed and accepted, never applied. The proposals surface
   in the officer's UI in violet — this layer does not write them.

3. TOTAL PURCHASE PRICE WHEN THE DTT BASIS IS `less_liens`. A
   documentary-transfer-tax value computed less liens is NOT the purchase
   price; putting it in that box states a number to the Assessor that the
   deed never claimed. It becomes an ASK instead.
"""
import io
from typing import Any, Dict, Optional, Tuple

from pypdf import PdfReader, PdfWriter

from services.county_forms import CountyForm, lookup_form


class PcorUnavailable(Exception):
    """No stored form for this county. Honest absence — the caller says
    so rather than offering a form it does not have."""


def _mail_to_block(meta: Dict[str, Any]) -> Dict[str, str]:
    """The recorded deed's mail-to doubles as the PCOR's 'mail property
    tax information to'. Both shapes the deed stores are handled (bare
    name string, or the full address block)."""
    ret = (meta or {}).get("return_to")
    if isinstance(ret, str):
        return {"mail_to_name": ret}
    if isinstance(ret, dict):
        return {
            "mail_to_name": ret.get("name") or "",
            "mail_to_address": ret.get("address1") or "",
            "mail_to_city": ret.get("city") or "",
            "mail_to_state": ret.get("state") or "",
            "buyer_zip": ret.get("zip") or "",
        }
    return {}


def values_from_deed(row: Dict[str, Any]) -> Tuple[Dict[str, str], list]:
    """Map a deed row onto our stable PCOR keys.

    Returns (values, asks) — `asks` names what the PCOR needs that the
    deed does not hold, so the officer is told plainly rather than
    handed a form with quiet gaps.
    """
    meta = row.get("metadata") or {}
    values: Dict[str, str] = {}
    asks: list = []

    if row.get("grantee_name"):
        values["buyer_name_address"] = str(row["grantee_name"])
    if row.get("grantor_name"):
        values["seller"] = str(row["grantor_name"])
    if row.get("apn"):
        values["apn"] = str(row["apn"])
    if row.get("property_address"):
        values["property_address"] = str(row["property_address"])
    values.update({k: v for k, v in _mail_to_block(meta).items() if v})

    # Purchase price — the one mapping that is NOT safe by default.
    dtt = meta.get("dtt") or {}
    basis = dtt.get("basis") or "full_value"
    if basis == "less_liens":
        asks.append(
            "Total purchase price — the deed's transfer value is computed "
            "less liens, which is not the purchase price. Enter it directly."
        )
    # Even on full_value we do not write it: the DTT declaration's value
    # and the Assessor's "total purchase price" are different questions
    # that usually share an answer. Usually is not always, and this box
    # is the Assessor's, not the recorder's.
    elif dtt.get("transfer_value"):
        asks.append(
            "Total purchase price — confirm it matches the transfer value "
            "declared on the deed before entering."
        )

    asks.extend([
        "Principal residence (yes/no) and date of occupancy",
        "Buyer's daytime telephone and email",
        "Type of property transferred (Part 2 A)",
        "Part 3 — terms of sale and financing, if applicable",
    ])
    return values, asks


def fill_pcor(row: Dict[str, Any], county: Optional[str] = None) -> Tuple[bytes, list]:
    """Fill the county's PCOR from a deed row.

    Returns (pdf_bytes, asks). Raises PcorUnavailable when we hold no
    stored form for the county.
    """
    county = county or row.get("county") or ""
    form: Optional[CountyForm] = lookup_form(county)
    if form is None:
        raise PcorUnavailable(
            f"No stored PCOR on file for {county or 'this county'}."
        )

    values, asks = values_from_deed(row)
    by_key = {t.key: t.field for t in form.text_fields}
    payload = {by_key[k]: v for k, v in values.items() if k in by_key and v}

    reader = PdfReader(str(form.path))
    writer = PdfWriter(clone_from=reader)
    # Without this, written text carries no appearance stream and renders
    # blank in several common viewers — including, in testing, the one an
    # escrow officer is most likely to open it in.
    writer.set_need_appearances_writer(True)

    for page in writer.pages:
        try:
            writer.update_page_form_field_values(page, payload)
        except Exception:
            # A page with no matching widgets is normal (this form is 4
            # pages and our fields live on 1-2).
            pass

    # NOT flattened. See the module docstring — the buyer has to be able
    # to finish it.
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue(), asks
