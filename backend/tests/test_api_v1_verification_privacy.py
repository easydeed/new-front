"""DX-BRUTAL — public verification proves authenticity without publishing a deed."""

import inspect

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from tests.source_text import read_code
from routers.api_v1.router import (
    PUBLIC_VERIFY_HOURLY_LIMIT,
    _enforce_verification_rate_limit,
    _verification_actor_hash,
    verify_document,
)
from schemas.api_v1.deeds import CreateDeedRequest, VerificationDocumentModel


class CountCursor:
    def __init__(self, count: int):
        self.count = count
        self.executed = []

    def execute(self, sql, params):
        self.executed.append((sql, params))

    def fetchone(self):
        return {"count": self.count}


def _request(ip: str) -> Request:
    return Request({
        "type": "http",
        "method": "GET",
        "path": "/api/v1/verify/DOC-2026-ABCDE",
        "headers": [(b"x-forwarded-for", ip.encode("ascii"))],
        "client": ("127.0.0.1", 1234),
    })


def test_public_schema_has_no_noop_pdf_options():
    assert "options" not in CreateDeedRequest.model_json_schema()["properties"]


def test_valid_verification_model_contains_no_property_or_parties():
    assert set(VerificationDocumentModel.model_fields) == {
        "document_id", "deed_type", "status", "created_at"}
    source = inspect.getsource(verify_document)
    for sensitive_column in [
        "property_address", "property_apn", "grantor_name",
        "grantee_name", "grantor_display", "grantee_display",
    ]:
        assert sensitive_column not in source


def test_the_legacy_high_disclosure_router_is_deleted_not_just_unmounted():
    legacy = read_code("routers", "verification.py")
    assert 'prefix="/api/verify"' not in legacy
    for sensitive_field in [
        "propertyAddress", "contentHash", "verificationCount",
    ]:
        assert sensitive_field not in legacy


def test_rate_limit_key_is_secret_keyed_and_never_the_raw_address(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", "verification-test-secret")
    first = _verification_actor_hash(_request("203.0.113.10"))
    same = _verification_actor_hash(_request("203.0.113.10"))
    other = _verification_actor_hash(_request("203.0.113.11"))
    assert first == same
    assert first != other
    assert "203.0.113.10" not in first
    assert len(first) == 64


def test_sixtieth_attempt_exhausts_the_hourly_allowance():
    cursor = CountCursor(PUBLIC_VERIFY_HOURLY_LIMIT - 1)
    assert _enforce_verification_rate_limit(cursor, "actor") == 0
    assert "pg_advisory_xact_lock" in cursor.executed[0][0]


def test_sixty_first_attempt_is_a_documented_429():
    cursor = CountCursor(PUBLIC_VERIFY_HOURLY_LIMIT)
    with pytest.raises(HTTPException) as excinfo:
        _enforce_verification_rate_limit(cursor, "actor")
    assert excinfo.value.status_code == 429
    assert excinfo.value.detail["code"] == "RATE_LIMITED"
    assert excinfo.value.headers["Retry-After"] == "3600"


def test_rate_limit_query_has_its_schema_index():
    database = read_code("database.py")
    assert "idx_verification_log_ip_time" in database
    assert "verification_log(ip_hash, verified_at)" in database
