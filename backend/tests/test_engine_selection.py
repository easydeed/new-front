"""PS2/PS3 — WeasyPrint is THE render engine; PDFShift is removed.

PS2 flipped 'auto' to WeasyPrint (owner decision; Render shell precheck
passed). PS3 finished the job after the production parity check PASSED
on the real box (all geometry within 0.5pt, statutory strings and
mail-to identical): the PDFShift service, its allowlist pins, and the
parity script are deleted. Pinned here:

- 'auto' selects WeasyPrint; a configured PDFShift key changes nothing.
- The pdfshift module is GONE and cannot silently return.
- A stale PDF_ENGINE=pdfshift renders through WeasyPrint with a loud
  warning — never a crash (a leftover env var must not down production),
  never a silent success-as-if-pdfshift.
"""
import asyncio
import importlib
import logging
from unittest.mock import patch

import pytest

import pdf_engine


def test_auto_selects_weasyprint_even_with_pdfshift_key(monkeypatch):
    monkeypatch.setenv("PDFSHIFT_API_KEY", "sk_stale_key_left_behind")
    monkeypatch.delenv("PDF_ENGINE", raising=False)
    with patch.object(pdf_engine, "render_pdf_with_weasyprint", return_value=b"%PDF-weasy") as weasy:
        out = pdf_engine.render_pdf("<html></html>")
    assert out == b"%PDF-weasy"
    assert weasy.called


def test_async_auto_selects_weasyprint(monkeypatch):
    monkeypatch.delenv("PDF_ENGINE", raising=False)
    with patch.object(pdf_engine, "render_pdf_with_weasyprint", return_value=b"%PDF-weasy"):
        out = asyncio.run(pdf_engine.render_pdf_async("<html></html>"))
    assert out == b"%PDF-weasy"


def test_the_pdfshift_module_is_gone():
    """PS3: the service is deleted, not just unrouted."""
    with pytest.raises(ModuleNotFoundError):
        importlib.import_module("services.pdfshift_service")
    assert not hasattr(pdf_engine, "render_pdf_with_pdfshift")
    assert not hasattr(pdf_engine, "render_pdf_with_pdfshift_sync")


def test_stale_pdfshift_env_var_renders_weasyprint_loudly(monkeypatch, caplog):
    """A leftover PDF_ENGINE=pdfshift on Render must neither crash every
    render nor pretend PDFShift still exists — WeasyPrint output plus a
    warning telling the operator to delete the vars."""
    monkeypatch.setenv("PDF_ENGINE", "pdfshift")
    with caplog.at_level(logging.WARNING, logger="pdf_engine"):
        with patch.object(pdf_engine, "render_pdf_with_weasyprint", return_value=b"%PDF-weasy"):
            out = pdf_engine.render_pdf("<html></html>")
    assert out == b"%PDF-weasy"
    assert any("RETIRED" in r.message for r in caplog.records)


def test_stale_pdfshift_env_var_async_same_rule(monkeypatch, caplog):
    monkeypatch.setenv("PDF_ENGINE", "pdfshift")
    with caplog.at_level(logging.WARNING, logger="pdf_engine"):
        with patch.object(pdf_engine, "render_pdf_with_weasyprint", return_value=b"%PDF-weasy"):
            out = asyncio.run(pdf_engine.render_pdf_async("<html></html>"))
    assert out == b"%PDF-weasy"
    assert any("RETIRED" in r.message for r in caplog.records)


def test_unknown_engine_still_rejected(monkeypatch):
    monkeypatch.delenv("PDF_ENGINE", raising=False)
    with pytest.raises(ValueError):
        pdf_engine.render_pdf("<html></html>", engine="lasergun")


def test_engine_defaults_still_read_the_env_var():
    """The PS2 dead-flag fix stays: engine defaults to None so the env
    var is actually consulted on default calls."""
    import inspect
    assert inspect.signature(pdf_engine.render_pdf).parameters["engine"].default is None
    assert inspect.signature(pdf_engine.render_pdf_async).parameters["engine"].default is None


def test_no_pdfshift_auto_selection_can_return():
    import inspect
    src = inspect.getsource(pdf_engine)
    assert "Auto-selected PDFShift" not in src
    assert 'selected_engine = "pdfshift"' not in src
    assert "pdfshift_service" not in src
