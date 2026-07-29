"""PS2 production-parity check — run ON THE RENDER BOX (owner, Tier 3 shell).

Renders the same fixture deed through BOTH engines — WeasyPrint (the new
production engine) and PDFShift (the outgoing one) — and diffs the
pdfplumber geometry: recorder-zone caption position, title position,
APN/boundary line, statutory strings, mail-to block, page count. This
proves WeasyPrint's output honors the chassis measurements on the real
production box, not just in CI.

Usage (Render shell, PDFSHIFT_API_KEY still set):
    cd backend && python scripts/ps2_parity_check.py

Exit 0 = parity within tolerance; exit 1 = differences to review.
No database access, no writes — render + measure only.
"""
import io
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pdfplumber  # noqa: E402

from services.deed_pdf import render_deed_html  # noqa: E402
from pdf_engine import render_pdf  # noqa: E402

# Positional tolerance between engines, in PDF points. Different renderers
# rasterize fonts slightly differently; the chassis cares about layout
# geometry (half-inch scale), not sub-point font metrics.
TOLERANCE_PT = 9.0

FIXTURE_ROW = {
    "id": 0,
    "deed_type": "grant-deed",
    "grantor_name": "PARITY CHECK GRANTOR",
    "grantee_name": "PARITY CHECK GRANTEE",
    "legal_description": "LOT 7, BLOCK B, TRACT 12345, IN THE CITY OF SANTA MONICA",
    "county": "Los Angeles",
    "apn": "4290-012-034",
    "vesting": "a single man",
    "requested_by": "Parity Escrow",
    "metadata": {
        "return_to": {"name": "PARITY CHECK GRANTEE", "address1": "1358 5TH ST",
                      "city": "Santa Monica", "state": "CA", "zip": "90401"},
        "title_order_no": "TO-PARITY", "escrow_no": "ESC-PARITY",
        "dtt": {"calculated_amount": "550.00", "basis": "full_value",
                "area_type": "city", "city_name": "Santa Monica", "is_exempt": False},
    },
}

STATUTORY_STRINGS = [
    "SPACE ABOVE THIS LINE IS FOR RECORDER",   # §27361.6 caption
    "THE UNDERSIGNED GRANTOR(S) DECLARE(S)",   # R&T §11932 lead-in
    "DOCUMENTARY TRANSFER TAX IS",
    "MAIL TAX STATEMENTS AS DIRECTED ABOVE",
    "WHEN RECORDED MAIL TO",
]

LANDMARKS = {
    "recorder_caption": "RECORDER",     # word within the caption line
    "title": "GRANT",                    # the GRANT DEED title
    "apn_boundary": "APN:",
    "dtt_lead": "UNDERSIGNED",
}


def measure(pdf_bytes):
    out = {"page_count": None, "strings": {}, "landmarks": {}}
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as doc:
        out["page_count"] = len(doc.pages)
        page = doc.pages[0]
        text = page.extract_text().upper()
        for s in STATUTORY_STRINGS:
            out["strings"][s] = s in text
        words = page.extract_words()
        for name, needle in LANDMARKS.items():
            hits = [w for w in words if needle in w["text"].upper()]
            out["landmarks"][name] = (round(hits[0]["x0"], 1), round(hits[0]["top"], 1)) if hits else None
        lines = page.extract_text().splitlines()
        try:
            i = next(k for k, l in enumerate(lines) if "WHEN RECORDED MAIL TO" in l.upper())
            out["mailto_block"] = [l.strip() for l in lines[i + 1 : i + 4]]
        except StopIteration:
            out["mailto_block"] = []
    return out


def main():
    html = render_deed_html(FIXTURE_ROW)

    print("Rendering with WeasyPrint (new production engine)…")
    weasy = measure(render_pdf(html, engine="weasyprint"))

    if not os.getenv("PDFSHIFT_API_KEY"):
        print("PDFSHIFT_API_KEY not set — cannot render the comparison side.")
        print("Run this on the production box while the key is still configured.")
        return 1

    print("Rendering with PDFShift (outgoing engine)…")
    shift = measure(render_pdf(html, engine="pdfshift"))

    failures = []

    if weasy["page_count"] != shift["page_count"]:
        failures.append(f"page count: weasy={weasy['page_count']} pdfshift={shift['page_count']}")

    for s in STATUTORY_STRINGS:
        w, p = weasy["strings"][s], shift["strings"][s]
        status = "OK" if w and p else "MISSING"
        print(f"  [{status}] statutory: {s!r} (weasy={w}, pdfshift={p})")
        if not w:
            failures.append(f"statutory string missing under WeasyPrint: {s!r}")

    for name in LANDMARKS:
        w, p = weasy["landmarks"][name], shift["landmarks"][name]
        if not w:
            failures.append(f"landmark {name} not found under WeasyPrint")
            continue
        if not p:
            print(f"  [WARN] landmark {name}: absent under PDFShift (weasy at {w})")
            continue
        dx, dy = abs(w[0] - p[0]), abs(w[1] - p[1])
        ok = dx <= TOLERANCE_PT and dy <= TOLERANCE_PT
        print(f"  [{'OK' if ok else 'DRIFT'}] {name}: weasy={w} pdfshift={p} Δ=({dx:.1f}, {dy:.1f})pt")
        if not ok:
            failures.append(f"landmark {name} drift ({dx:.1f}, {dy:.1f})pt exceeds {TOLERANCE_PT}pt")

    if weasy["mailto_block"] != shift["mailto_block"]:
        print(f"  [WARN] mail-to lines differ: weasy={weasy['mailto_block']} pdfshift={shift['mailto_block']}")
    else:
        print(f"  [OK] mail-to block identical: {weasy['mailto_block']}")
    if len(weasy["mailto_block"]) < 3:
        failures.append(f"mail-to block incomplete under WeasyPrint: {weasy['mailto_block']}")

    print()
    if failures:
        print("PARITY CHECK FAILED:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("PARITY CHECK PASSED — WeasyPrint honors the chassis on this box.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
