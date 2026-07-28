"""PDFShift auth-shape pin (production 401 incident, 2026-07-28).

Production rendered every deed through PDFShift (auto-selected whenever
PDFSHIFT_API_KEY is set) while tests rendered through WeasyPrint (no key
in CI) — so the auth bug lived in the one path no test exercised. The
code sent the key as the basic-auth USERNAME with an empty password
(`auth=(key, "")`); PDFShift authenticates username 'api' with the key
as PASSWORD (`auth=('api', key)`) — proven by a direct call from the
production shell: same key, correct shape, 200.

These tests capture the auth tuple actually handed to httpx in BOTH the
sync and async paths, so the shape can never silently regress, and pin
the env var name the service reads.
"""
import asyncio
from unittest.mock import patch, MagicMock

import pytest

from services.pdfshift_service import PDFShiftService


def _make_service(monkeypatch):
    monkeypatch.setenv("PDFSHIFT_API_KEY", "sk_test_pinned_key")
    return PDFShiftService()


def test_reads_the_env_var_the_shell_proof_used(monkeypatch):
    monkeypatch.delenv("PDFSHIFT_API_KEY", raising=False)
    assert PDFShiftService().is_configured() is False
    svc = _make_service(monkeypatch)
    assert svc.is_configured() is True
    assert svc.api_key == "sk_test_pinned_key"


def test_sync_path_sends_api_as_username_and_key_as_password(monkeypatch):
    svc = _make_service(monkeypatch)
    captured = {}

    class FakeClient:
        def __init__(self, **kwargs):
            pass
        def __enter__(self):
            return self
        def __exit__(self, *a):
            return False
        def post(self, url, **kwargs):
            captured.update(kwargs, url=url)
            resp = MagicMock()
            resp.status_code = 200
            resp.content = b"%PDF-fake"
            return resp

    with patch("services.pdfshift_service.httpx.Client", FakeClient):
        out = svc.render_pdf_sync("<html></html>")

    assert out == b"%PDF-fake"
    assert captured["auth"] == ("api", "sk_test_pinned_key")


def test_async_path_sends_api_as_username_and_key_as_password(monkeypatch):
    svc = _make_service(monkeypatch)
    captured = {}

    class FakeAsyncClient:
        def __init__(self, **kwargs):
            pass
        async def __aenter__(self):
            return self
        async def __aexit__(self, *a):
            return False
        async def post(self, url, **kwargs):
            captured.update(kwargs, url=url)
            resp = MagicMock()
            resp.status_code = 200
            resp.content = b"%PDF-fake"
            return resp

    with patch("services.pdfshift_service.httpx.AsyncClient", FakeAsyncClient):
        out = asyncio.run(svc.render_pdf("<html></html>"))

    assert out == b"%PDF-fake"
    assert captured["auth"] == ("api", "sk_test_pinned_key")


ALLOWED_PDFSHIFT_PARAMS = {"source", "format", "landscape"}
PLAYWRIGHT_STOWAWAYS = {"printBackground", "preferCSSPageSize", "displayHeaderFooter", "margin"}


def test_sync_payload_contains_only_documented_pdfshift_params(monkeypatch):
    """The 400 incident: the payload carried Playwright page.pdf() options
    (printBackground, preferCSSPageSize, displayHeaderFooter) and a margin
    object — PDFShift validates strictly and rejected every real render.
    The proven-working shell call sent a minimal body; this pins it."""
    svc = _make_service(monkeypatch)
    captured = {}

    class FakeClient:
        def __init__(self, **kwargs):
            pass
        def __enter__(self):
            return self
        def __exit__(self, *a):
            return False
        def post(self, url, **kwargs):
            captured.update(kwargs)
            resp = MagicMock()
            resp.status_code = 200
            resp.content = b"%PDF-fake"
            return resp

    with patch("services.pdfshift_service.httpx.Client", FakeClient):
        svc.render_pdf_sync("<html></html>")

    sent = set(captured["json"].keys())
    assert sent <= ALLOWED_PDFSHIFT_PARAMS, f"undocumented params sent: {sent - ALLOWED_PDFSHIFT_PARAMS}"
    assert not (sent & PLAYWRIGHT_STOWAWAYS)


def test_async_payload_contains_only_documented_pdfshift_params(monkeypatch):
    svc = _make_service(monkeypatch)
    captured = {}

    class FakeAsyncClient:
        def __init__(self, **kwargs):
            pass
        async def __aenter__(self):
            return self
        async def __aexit__(self, *a):
            return False
        async def post(self, url, **kwargs):
            captured.update(kwargs)
            resp = MagicMock()
            resp.status_code = 200
            resp.content = b"%PDF-fake"
            return resp

    with patch("services.pdfshift_service.httpx.AsyncClient", FakeAsyncClient):
        asyncio.run(svc.render_pdf("<html></html>"))

    sent = set(captured["json"].keys())
    assert sent <= ALLOWED_PDFSHIFT_PARAMS, f"undocumented params sent: {sent - ALLOWED_PDFSHIFT_PARAMS}"
    assert not (sent & PLAYWRIGHT_STOWAWAYS)


def test_sync_error_surfaces_the_response_body(monkeypatch):
    """PDFShift's 400 body names the offending field — the sync path used
    to raise_for_status and throw the diagnosis away."""
    svc = _make_service(monkeypatch)

    class FakeClient:
        def __init__(self, **kwargs):
            pass
        def __enter__(self):
            return self
        def __exit__(self, *a):
            return False
        def post(self, url, **kwargs):
            resp = MagicMock()
            resp.status_code = 400
            resp.text = '{"error": "some_param is not a valid parameter"}'
            return resp

    with patch("services.pdfshift_service.httpx.Client", FakeClient):
        with pytest.raises(RuntimeError, match="some_param is not a valid parameter"):
            svc.render_pdf_sync("<html></html>")


def test_key_is_never_the_username():
    """Source-level backstop: the broken shape must not reappear anywhere."""
    import inspect
    import services.pdfshift_service as mod
    src = inspect.getsource(mod)
    assert 'auth=(self.api_key' not in src
    assert src.count('auth=("api", self.api_key)') == 2
