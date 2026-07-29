"""PS2 — WeasyPrint is the production render engine (owner decision,
2026-07-29; Render shell precheck `import weasyprint` → ok).

The old 'auto' rule silently selected PDFShift whenever PDFSHIFT_API_KEY
was set — which is how production ran an engine no test ever exercised
(the 401 and 400 incidents lived in exactly that gap). Pinned here:

- 'auto' selects WeasyPrint even when a PDFShift key IS configured.
- PDF_ENGINE=pdfshift remains the explicit, config-flagged fallback for
  one deploy cycle; a follow-up removes PDFShift entirely.
- The auto path never consults the PDFShift service again.
"""
import asyncio
from unittest.mock import patch

import pytest

import pdf_engine


def _fail_pdfshift(*a, **k):
    raise AssertionError("PDFShift was invoked on the auto path")


def test_auto_selects_weasyprint_even_with_pdfshift_key(monkeypatch):
    monkeypatch.setenv("PDFSHIFT_API_KEY", "sk_test_key_present")
    monkeypatch.delenv("PDF_ENGINE", raising=False)
    with patch.object(pdf_engine, "render_pdf_with_weasyprint", return_value=b"%PDF-weasy") as weasy, \
            patch.object(pdf_engine, "render_pdf_with_pdfshift_sync", side_effect=_fail_pdfshift):
        out = pdf_engine.render_pdf("<html></html>")
    assert out == b"%PDF-weasy"
    assert weasy.called


def test_async_auto_selects_weasyprint_even_with_pdfshift_key(monkeypatch):
    monkeypatch.setenv("PDFSHIFT_API_KEY", "sk_test_key_present")
    monkeypatch.delenv("PDF_ENGINE", raising=False)
    with patch.object(pdf_engine, "render_pdf_with_weasyprint", return_value=b"%PDF-weasy"), \
            patch.object(pdf_engine, "render_pdf_with_pdfshift", side_effect=_fail_pdfshift):
        out = asyncio.run(pdf_engine.render_pdf_async("<html></html>"))
    assert out == b"%PDF-weasy"


def test_pdf_engine_env_var_is_the_explicit_fallback_flag(monkeypatch):
    """Flipping back to PDFShift is a deliberate config action, kept for
    one deploy cycle — not an automatic consequence of a key existing."""
    monkeypatch.setenv("PDF_ENGINE", "pdfshift")
    with patch.object(pdf_engine, "render_pdf_with_pdfshift_sync", return_value=b"%PDF-shift") as shift:
        out = pdf_engine.render_pdf("<html></html>")
    assert out == b"%PDF-shift"
    assert shift.called


def test_async_env_var_fallback_also_works(monkeypatch):
    monkeypatch.setenv("PDF_ENGINE", "pdfshift")
    with patch.object(pdf_engine, "render_pdf_with_pdfshift", return_value=b"%PDF-shift"):
        out = asyncio.run(pdf_engine.render_pdf_async("<html></html>"))
    assert out == b"%PDF-shift"


def test_the_default_call_reads_the_env_flag_at_all(monkeypatch):
    """Latent bug found while pinning PS2: the old signature defaulted
    engine to the STRING "auto", which is truthy — so
    `engine or os.getenv("PDF_ENGINE")` never read the env var from the
    stored-PDF pipeline (render_pdf(html) with no engine arg). The
    fallback flag must actually flip the engine, so the default is None."""
    import inspect
    sig = inspect.signature(pdf_engine.render_pdf)
    assert sig.parameters["engine"].default is None
    sig_async = inspect.signature(pdf_engine.render_pdf_async)
    assert sig_async.parameters["engine"].default is None


def test_explicit_engine_param_still_routes_to_pdfshift(monkeypatch):
    monkeypatch.delenv("PDF_ENGINE", raising=False)
    with patch.object(pdf_engine, "render_pdf_with_pdfshift_sync", return_value=b"%PDF-shift"):
        out = pdf_engine.render_pdf("<html></html>", engine="pdfshift")
    assert out == b"%PDF-shift"


def test_unknown_engine_still_rejected(monkeypatch):
    monkeypatch.delenv("PDF_ENGINE", raising=False)
    with pytest.raises(ValueError):
        pdf_engine.render_pdf("<html></html>", engine="lasergun")


def test_auto_path_never_consults_the_pdfshift_service():
    """Source pin: the silent key-presence auto-selection must not
    reappear — that pattern is what hid an unexercised engine in the
    flagship flow."""
    import inspect
    src = inspect.getsource(pdf_engine)
    assert "Auto-selected PDFShift" not in src
    assert 'selected_engine = "pdfshift" if' not in src
