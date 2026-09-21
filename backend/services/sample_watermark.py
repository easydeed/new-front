"""SAMPLE — NOT FOR RECORDING, printed into the rendered bytes.

═══ THE RULING, AND IT IS BROADER THAN THE DEMO (owner, 2026-09-21) ═══

TRY-2 asked for a watermark on `/try`'s renders. The ruling widened it:
**every render under a `dp_test_` key is watermarked**, whoever the
caller is.

A test key that produces clean, recordable-looking deeds is a
fraud-adjacent artifact regardless of who called it. An integrator's
test suite writes those PDFs to disk exactly as readily as a demo page
does, and a document that looks recordable and is not carries its whole
risk in the gap between those two facts. `/try` inherits this rather
than owning it.

═══ WHY IT IS INJECTED AT THE RENDER SEAM, NOT IN THE TEMPLATES ═══

There is no shared base template. Every instrument's `index.jinja2` is a
standalone HTML document with its own `<style>`, so a template-level
watermark would mean editing **21 files** and remembering the 22nd.

`routers/api_v1/router.py` renders in one place:

    html_content = render_deed_html(...)      # ← inject here
    preview_bytes = await render_pdf_async(html_content)

One seam covers every instrument, and it covers them the day a new one
is added rather than the day somebody remembers.

═══ AND WHY WATERMARKING THE PREVIEW IS SUFFICIENT ═══

Approve **promotes** the preview bytes rather than re-rendering them
(`routers/api_confirm.py`). So the stored PDF is the same object as the
previewed one, and watermarking at render time means the stored
document, the bytes the approver read, and **the SHA-256 in the auditor
artifact** are all the watermarked document. There is no second path to
cover — which is a property of the existing design, not something added
here.

═══ WHAT IS PINNED, AND WHAT IS NOT ═══

`apply_sample_watermark` ASSERTS its marker is present in the HTML it
returns. It does not assert the marker survives into the PDF byte
stream: WeasyPrint compresses content streams, so a substring search
over the bytes would be a check that passes or fails for reasons
unrelated to the watermark — the §14.2 shape, an instrument that looks
like it measures something it does not. The honest boundary is that the
HTML handed to the renderer provably carries it.
"""
from __future__ import annotations

import re

# Two lines, exactly as the design specifies them.
WATERMARK_LINE_1 = "SAMPLE"
WATERMARK_LINE_2 = "NOT FOR RECORDING"

# A class name nothing else uses, so the assertion below cannot pass on
# some unrelated fragment of a template.
MARKER_CLASS = "dp-sample-watermark"

# `position: fixed` repeats the element on EVERY page in WeasyPrint,
# which is the property that matters: a watermark on page one of a
# three-page deed is decoration, not a warning.
#
# It sits BEHIND the text (`z-index: -1`) and at low opacity because the
# document has to stay readable — an approver is being asked to actually
# read this deed before putting their name to it, and a watermark that
# defeats that has broken the product to protect it.
_WATERMARK_HTML = f"""
<style>
  .{MARKER_CLASS} {{
    position: fixed;
    top: 42%;
    left: 0;
    right: 0;
    z-index: -1;
    text-align: center;
    transform: rotate(-32deg);
    color: rgba(220, 38, 38, 0.30);
    font-family: Helvetica, Arial, sans-serif;
    font-size: 52pt;
    font-weight: 800;
    letter-spacing: 0.14em;
    line-height: 1.12;
    pointer-events: none;
  }}
  .{MARKER_CLASS} span {{
    display: block;
    font-size: 26pt;
    letter-spacing: 0.18em;
  }}
</style>
<div class="{MARKER_CLASS}">{WATERMARK_LINE_1}<span>{WATERMARK_LINE_2}</span></div>
"""

_BODY_CLOSE = re.compile(r"</body\s*>", re.IGNORECASE)


class WatermarkNotApplied(RuntimeError):
    """Raised when the marker is absent from the returned HTML.

    LOUD ON PURPOSE. The failure this guards is a watermark that silently
    does not apply — which produces a clean, recordable-looking PDF under
    a test key, the exact artifact the ruling exists to prevent. A render
    that cannot be watermarked must fail rather than succeed unmarked.
    """


def apply_sample_watermark(html: str) -> str:
    """Return `html` with the sample watermark printed into it.

    Inserted before `</body>` when there is one, appended otherwise — a
    template without a closing body tag still gets the watermark rather
    than silently skipping it.
    """
    if MARKER_CLASS in html:
        # Already watermarked. Idempotent so a second application cannot
        # double-print it.
        return html

    if _BODY_CLOSE.search(html):
        marked = _BODY_CLOSE.sub(_WATERMARK_HTML + "</body>", html, count=1)
    else:
        marked = html + _WATERMARK_HTML

    if MARKER_CLASS not in marked:
        raise WatermarkNotApplied(
            "sample watermark could not be applied to this document")
    return marked


def watermark_if_test(html: str, *, is_test: bool) -> str:
    """The seam the router calls. `is_test` comes from the API key row.

    Stated plainly because the inverse is the dangerous direction: a
    LIVE key renders unwatermarked, and that is correct — those are the
    deeds that get recorded.
    """
    return apply_sample_watermark(html) if is_test else html
