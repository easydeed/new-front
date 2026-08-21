"""T-3 / T-3b — filling the county BOE forms from what the record knows.

Two forms ride these rails: the BOE-502-A (PCOR, companion to a
conveyance deed) and the BOE-502-D (Change in Ownership — Death of Real
Property Owner, companion to a death affidavit). T-3b renamed this module
from `pcor_fill` when the second one arrived — a module called pcor_fill
that also fills the 502-D is exactly the drift this codebase keeps
paying for.

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
    return _render(form, values), asks


# ══ BOE-502-D — the death statement ══════════════════════════════════


def values_from_affidavit(row: Dict[str, Any]) -> Tuple[Dict[str, str], list]:
    """Map a death-affidavit deed row onto the 502-D's stable keys.

    The source is `metadata.affidavit` — the facts the affidavit already
    swore to (who died, when, under which recorded instrument) — plus the
    property identity the deed carries. Those are FACTS and they fill.

    What does not fill is how title passed. "Succession without a will",
    "decree of distribution", "action of trustee": each is a legal
    characterisation, and the fact that it is derivable from the
    affidavit variant is precisely why it must be proposed rather than
    written. Doctrine §1.
    """
    meta = row.get("metadata") or {}
    aff = meta.get("affidavit") or {}
    values: Dict[str, str] = {}
    asks: list = []

    if aff.get("decedentName"):
        values["decedent_name"] = str(aff["decedentName"])
    # The affidavit families spell the death date differently; both are
    # the same fact and either is authoritative when present.
    dod = aff.get("deathDate") or aff.get("dateOfDeath")
    if dod:
        values["date_of_death"] = str(dod)
    if row.get("apn"):
        values["apn"] = str(row["apn"])
    if row.get("property_address"):
        values["property_street"] = str(row["property_address"])
    if meta.get("property_city"):
        values["property_city"] = str(meta["property_city"])
    if meta.get("property_zip"):
        values["property_zip"] = str(meta["property_zip"])
    if aff.get("affiantName"):
        values["affiant_name_address"] = str(aff["affiantName"])

    if not dod:
        # PCOR3 — REWRITTEN. This read "the affidavit variant on file did
        # not record one", which ASSERTS an affidavit exists. It was
        # rendered on a grant deed that had neither affidavit nor
        # decedent, and it read as a real finding about a real document.
        #
        # A sentence written to be unconditionally true is true in the
        # wrong context too — that is exactly how it survived one. This
        # version claims only what we checked: we do not hold the date.
        asks.append(
            "Date of death — we do not hold one for this document. "
            "The Assessor requires it."
        )
    asks.extend([
        "How title passed (succession, decree of distribution, trustee "
        "action, joint tenancy) — a legal characterisation, so it is "
        "yours to mark",
        "Beneficiaries and the percentage each received",
        "Whether this was the decedent's principal residence",
        "Attachments the county asks for: death certificate, will or "
        "trust, and the deed under which the decedent acquired title",
    ])
    return values, asks


def fill_death_statement(row: Dict[str, Any],
                         county: Optional[str] = None) -> Tuple[bytes, list]:
    """Fill the county's BOE-502-D from a death-affidavit row."""
    county = county or row.get("county") or ""
    form = lookup_form(county, "BOE-502-D")
    if form is None:
        raise PcorUnavailable(
            f"No BOE-502-D on file for {county or 'this county'}."
        )
    values, asks = values_from_affidavit(row)
    return _render(form, values), asks


def _render(form: CountyForm, values: Dict[str, str]) -> bytes:
    """Shared fill: map our keys onto the county's field names, set
    NeedAppearances, and DO NOT flatten."""
    by_key = {t.key: t.field for t in form.text_fields}
    payload = {by_key[k]: v for k, v in values.items() if k in by_key and v}

    reader = PdfReader(str(form.path))
    writer = PdfWriter(clone_from=reader)
    writer.set_need_appearances_writer(True)
    for page in writer.pages:
        try:
            writer.update_page_form_field_values(page, payload)
        except Exception:
            pass
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()
