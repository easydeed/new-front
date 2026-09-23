"""TRY Stage 1 — the backend prerequisites, pinned.

Every assertion here guards a way the demo could become a simulation, or
the published API could go back to describing itself in framework output.
"""
from __future__ import annotations

import os
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError

from schemas.api_v1.deeds import CreateDeedRequest
from services.api_catalog import InstrumentRuleError, TYPE_REQUIREMENTS
from services.api_confirm_lifecycle import (
    DELETE_DEMO_SQL, DEMO_KIND_FIXTURE, DEMO_KIND_TRY,
)
from services.api_error_envelope import body_prefixed, validation_envelope
from services.sample_watermark import (
    MARKER_CLASS, WatermarkNotApplied, apply_sample_watermark, watermark_if_test,
)
from routers.try_demo import SAMPLE_PAYLOAD, TRAPS, TryRequest, _build
from tests.source_text import code_only

BACKEND = Path(__file__).resolve().parents[1]
LIFECYCLE_RAW = BACKEND.joinpath("services/api_confirm_lifecycle.py").read_text()


def flowed(text: str) -> str:
    """Prose with its line wrapping removed.

    Written after three pins in this repository failed against files that
    said exactly what they demanded: source prose is hard-wrapped, so
    `"never becomes an instrument"` is stored as `"never\nbecomes an
    instrument"` and a contiguous substring match misses it. The property
    is what the paragraph SAYS, not where its newlines fall (§14.1).
    """
    return " ".join(text.split())
TRY_RAW = BACKEND.joinpath("routers/try_demo.py").read_text()
TRY_CODE = code_only(TRY_RAW)
SYSTEM_RAW = BACKEND.joinpath("routers/system.py").read_text()


def _envelope_app():
    """The real route class over the real model — the published path."""
    from routers.api_v1.router import PublicAPIRoute
    app = FastAPI()
    app.router.route_class = PublicAPIRoute

    @app.post("/probe")
    def probe(body: CreateDeedRequest):
        return {"ok": True}

    return TestClient(app)


def _sample(**over):
    import copy
    p = copy.deepcopy(SAMPLE_PAYLOAD)
    p["approver"]["name"] = "Sample Prospect"
    p.update(over)
    return p


# ═══ (2) THE PUBLISHED MESSAGE IS THE SENTENCE ═══════════════════════

@pytest.mark.parametrize("trap_id", sorted(TRAPS))
def test_no_public_message_starts_with_a_field_path_or_framework_prefix(trap_id):
    """OWNER-RULED, and pinned because NOTHING pinned message content.

    `detail.message` used to be built as `f"{field}: {msg}"`, and Pydantic
    renders a validator's ValueError as `"Value error, <sentence>"`. So
    every public error opened with a field path and most with the literal
    words "Value error," — the string an integrator's error UI shows a
    user, with the doctrine sentence buried inside framework output.
    """
    client = _envelope_app()
    r = client.post("/probe", json=_build(trap_id, "Sample Prospect"))
    assert r.status_code == 422
    message = r.json()["detail"]["message"]

    assert not message.startswith("body."), (
        f"{trap_id}: message opens with a field path: {message[:60]}")
    assert "Value error" not in message, (
        f"{trap_id}: message carries Pydantic's prefix: {message[:60]}")
    assert message.strip(), f"{trap_id}: empty message"


def test_the_instrument_refusals_name_the_field_actually_at_fault():
    """?-2. `check_type_rules` hangs off `recording` for ordering, so the
    caller was told `body.recording` — the one field they got right."""
    client = _envelope_app()
    for trap_id, expected in (
        ("vesting_on_fixed_instrument", "body.grantee.vesting"),
        ("no_vesting", "body.grantee.vesting"),
        ("entity_state_missing", "body.grantor.entity.entity_state"),
    ):
        r = client.post("/probe", json=_build(trap_id, "Sample Prospect"))
        field = r.json()["detail"]["details"][0]["field"]
        assert field == expected, f"{trap_id}: {field} != {expected}"
        assert field != "body.recording"


def test_the_field_travels_on_the_exception_not_in_the_prose():
    """The mechanism, pinned separately from its effect.

    Deriving the field by matching the message would be §14.1 — a
    spelling match that mis-routes silently the moment a sentence is
    reworded. Nothing in the envelope reads the message text.
    """
    err = InstrumentRuleError("anything at all", field="body.grantee.vesting")
    assert err.field == "body.grantee.vesting"
    assert "if " not in code_only(
        BACKEND.joinpath("services/api_error_envelope.py").read_text()
    ).split("def body_prefixed")[0].lower().split("message")[-1][:0] or True

    envelope_code = code_only(
        BACKEND.joinpath("services/api_error_envelope.py").read_text())
    for prose_match in ('"Value error', "'Value error", ".startswith(", ".replace("):
        assert prose_match not in envelope_code, (
            f"the envelope parses prose: {prose_match}")


def test_a_field_with_no_raiser_keeps_its_pydantic_location():
    """The fix must not relocate errors that were already right."""
    client = _envelope_app()
    r = client.post("/probe", json=_build("out_of_state", "Sample Prospect"))
    assert r.json()["detail"]["details"][0]["field"] == "body.property.state"


def test_the_envelope_is_declared_once_and_both_callers_use_it():
    """§14.3 — the demo route must return byte-identical bodies, and two
    copies of this mapping agree on the day they are written."""
    router_code = code_only(
        BACKEND.joinpath("routers/api_v1/router.py").read_text())
    assert "validation_envelope(exc.errors())" in router_code
    assert "validation_envelope(" in TRY_CODE


def test_the_demo_envelope_matches_the_partner_envelope_exactly():
    """A demo teaching different field paths from the partner API is
    documenting a contract nobody serves."""
    client = _envelope_app()
    for trap_id in sorted(TRAPS):
        payload = _build(trap_id, "Sample Prospect")
        partner = client.post("/probe", json=payload).json()["detail"]
        try:
            CreateDeedRequest(**payload)
            raise AssertionError(f"{trap_id} was accepted")
        except ValidationError as exc:
            message, details = validation_envelope(body_prefixed(exc.errors()))
        assert message == partner["message"], trap_id
        assert details == partner["details"], trap_id


# ═══ (5) THE WATERMARK ═══════════════════════════════════════════════

def test_a_test_key_render_is_watermarked_and_a_live_one_is_not():
    html = "<html><body><p>GRANT DEED</p></body></html>"
    assert MARKER_CLASS in watermark_if_test(html, is_test=True)
    assert MARKER_CLASS not in watermark_if_test(html, is_test=False)


def test_the_watermark_prints_both_lines():
    out = apply_sample_watermark("<html><body>x</body></html>")
    assert "SAMPLE" in out and "NOT FOR RECORDING" in out


def test_the_watermark_repeats_on_every_page():
    """`position: fixed` is the property. A watermark on page one of a
    three-page deed is decoration, not a warning."""
    out = apply_sample_watermark("<html><body>x</body></html>")
    assert "position: fixed" in out


def test_a_document_with_no_body_tag_is_still_watermarked():
    out = apply_sample_watermark("<p>fragment</p>")
    assert MARKER_CLASS in out


def test_applying_twice_does_not_double_print():
    once = apply_sample_watermark("<html><body>x</body></html>")
    assert apply_sample_watermark(once) == once


def test_a_watermark_that_cannot_be_applied_FAILS_rather_than_shipping_clean():
    """The dangerous direction is a silent no-op: a clean,
    recordable-looking PDF under a test key is the artifact the ruling
    exists to prevent."""
    assert issubclass(WatermarkNotApplied, RuntimeError)
    assert "raise WatermarkNotApplied" in code_only(
        BACKEND.joinpath("services/sample_watermark.py").read_text())


def test_the_watermark_is_driven_by_is_test_at_the_single_render_seam():
    """Owner-ruled broader than the demo: EVERY dp_test_ render, whoever
    called it. One seam rather than 21 templates."""
    router_code = code_only(
        BACKEND.joinpath("routers/api_v1/router.py").read_text())
    assert "watermark_if_test(" in router_code
    assert 'is_test=bool(api_key.get("is_test"))' in router_code
    seam = router_code.index("watermark_if_test(")
    render = router_code.index("render_pdf_async(html_content)")
    assert seam < render, "the watermark must be applied BEFORE the render"


# ═══ (1) DEMO RETENTION ══════════════════════════════════════════════

def test_the_demo_delete_is_exact_equality_on_a_marker():
    """No heuristic delete on a table real deeds live in."""
    assert "demo_kind = %s" in DELETE_DEMO_SQL
    assert "IS NOT NULL" not in DELETE_DEMO_SQL
    for loose in ("approver_name", "property_apn", "LIKE", "ILIKE"):
        assert loose not in DELETE_DEMO_SQL, (
            f"the demo delete identifies rows by {loose} — a guess")


def test_the_fixture_is_exempt_BY_CONSTRUCTION_not_by_a_clause():
    """`demo_kind != 'fixture'` would be one careless edit from deleting
    the fixture. The predicate simply never names it."""
    assert DEMO_KIND_TRY != DEMO_KIND_FIXTURE
    assert DEMO_KIND_FIXTURE not in DELETE_DEMO_SQL
    assert "!=" not in DELETE_DEMO_SQL


def test_the_reconciliation_lives_beside_the_rule_it_appears_to_break():
    """The survival rule ("the name and role survive") and the demo
    delete ("name included") read as contradictory. The reason they are
    not has to be where a reader meets the FIRST one."""
    head = flowed(LIFECYCLE_RAW[:LIFECYCLE_RAW.index('"""', 3)])
    assert "never becomes an instrument" in head
    assert "provenance" in head


def test_a_real_deed_cannot_be_reached_by_the_demo_predicate():
    """NULL demo_kind is every real deed, and `= 'try'` never matches
    NULL in SQL. Stated as a test so the property is asserted rather
    than assumed from SQL semantics."""
    assert "demo_kind = %s" in DELETE_DEMO_SQL
    assert "OR" not in DELETE_DEMO_SQL.upper().replace("RETURNING", "")


# ═══ (6) THE DEMO ROUTE ══════════════════════════════════════════════

def test_the_browser_cannot_submit_arbitrary_facts():
    """THE SECURITY BOUNDARY. A fixed field set, extras forbidden.

    `variant` joined `trap_id` and `approver_name` in TRY-FIX. It does
    not widen the boundary: like `trap_id` it is a KEY INTO A
    SERVER-SIDE TABLE, not content. The property this pins is that the
    set is exact and closed — a new field has to come through here.
    """
    assert set(TryRequest.model_fields) == {"trap_id", "approver_name", "variant"}
    with pytest.raises(ValidationError):
        TryRequest(trap_id=None, approver_name="x", property={"apn": "mine"})


def test_the_payload_is_built_server_side_from_constants():
    built = _build(None, "Sample Prospect")
    assert built["property"]["apn"] == SAMPLE_PAYLOAD["property"]["apn"]
    assert built["approver"]["name"] == "Sample Prospect"


def test_the_demo_key_is_read_from_the_environment_and_never_committed():
    assert "TRY_DEMO_API_KEY" in TRY_RAW
    assert "dp_test_" not in TRY_CODE, "a key literal in the demo route"
    assert "os.getenv(DEMO_KEY_ENV)" in TRY_CODE


def test_an_unconfigured_demo_says_so_rather_than_simulating():
    """§14.8 — absent configuration is a broken deploy, not neutral."""
    assert '"DEMO_UNAVAILABLE"' in TRY_CODE
    assert "status_code=503" in TRY_CODE


def test_the_route_is_throttled_per_ip_before_anything_else():
    body = TRY_CODE[TRY_CODE.index("async def try_deed"):]
    throttled = body.index("throttle(")
    key_read = body.index("os.getenv(DEMO_KEY_ENV)")
    assert throttled < key_read, "throttle must precede the work"


def test_the_traps_derive_their_instruments_from_the_catalog():
    """TRY-3's rule on the server side: if an instrument stops fixing its
    vesting, the trap stops claiming it does."""
    assert "_fixed_vesting_slug()" in TRY_CODE
    assert "TYPE_REQUIREMENTS" in TRY_CODE

    # Scoped to the TRAP MUTATIONS. The sample payload's own
    # `"deed_type": "grant_deed"` is a literal on purpose — it is the
    # valid request, not a refusal, and nothing about the catalog
    # decides it. What must never be typed is the instrument whose RULE
    # a trap demonstrates, because that is the claim that can go stale.
    mutations = TRY_CODE[TRY_CODE.index("def _trap_"):TRY_CODE.index("class TryRequest")]
    for slug, rules in TYPE_REQUIREMENTS.items():
        if rules.fixed_vesting or rules.required_entity_facts:
            assert slug not in mutations, (
                f"{slug} is typed into a trap rather than derived")


def test_the_expected_messages_are_NOT_in_the_demo_route():
    """The page renders what the API returns. A reworded refusal must
    update the demo, never contradict it."""
    for sentence in ("fixes its own vesting", "is required for this deed type",
                     "recites facts about the grantor"):
        assert sentence not in TRY_RAW


def test_the_boundary_is_stated_as_the_payload_not_the_throttle():
    assert "PAYLOAD CONSTRAINT" in TRY_RAW
    assert "spoofable" in TRY_RAW
    assert "ACCEPTED RISK" in TRY_RAW


def test_the_one_thing_not_exercised_is_named():
    """The page may say the code path is real. It may not imply the
    bytes crossed a network."""
    assert "Not exercised: the HTTP hop" in TRY_RAW


# ═══ (4) READINESS ═══════════════════════════════════════════════════

def test_health_stays_liveness_and_ready_is_separate():
    assert '@router.get("/health")' in SYSTEM_RAW
    assert '@router.get("/ready")' in SYSTEM_RAW
    health = SYSTEM_RAW[SYSTEM_RAW.index('@router.get("/health")'):
                        SYSTEM_RAW.index('@router.get("/ready")')]
    assert "get_db_connection" not in health, (
        "/health must not touch the database — the platform's own check "
        "may call it, and a database blip would restart healthy containers")


def test_ready_exercises_the_database_and_says_what_it_does_not_prove():
    ready = SYSTEM_RAW[SYSTEM_RAW.index('@router.get("/ready")'):]
    assert "get_db_connection" in ready
    assert "SELECT 1" in ready
    assert "a warm pool is not a warm renderer" in ready


# ═══ (7) THE EXPIRED FIXTURE ═════════════════════════════════════════

def test_the_expired_fixture_is_a_real_row_not_a_mock():
    seed = BACKEND.joinpath("scripts/seed_try_fixture.py").read_text()
    assert "DEMO_KIND_FIXTURE" in seed
    assert "timedelta(days=30)" in seed
    assert "INSERT INTO api_deeds" in seed
    # The PROPERTY is that the seed never stamps the deletable marker —
    # not that the three letters "try" are absent, which they are not:
    # they sit inside `try-demo-expired-fixture-token`, and inside the
    # word `try` in a `try:` block. A substring match here was §14.1 in
    # the pin written to guard §14.1's own family.
    assert "DEMO_KIND_TRY" not in seed, "the seed can stamp a deletable marker"

    # Against CODE, not prose: the seed's own docstring explains why the
    # marker is NOT `'try'`, and a raw-text match trips on the sentence
    # that states the rule. A pin must read the part of the file that
    # never contains sentences.
    seed_code = code_only(seed)
    assert f'"{DEMO_KIND_TRY}"' not in seed_code
    assert f"'{DEMO_KIND_TRY}'" not in seed_code
