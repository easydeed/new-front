"""ENGINE1 — draft_sha256, the auditor artifact, and the licence that is
never verified.

Every assertion here guards a way this evidence could become
stronger-looking than it is. That is the whole subject: the artifact's
value is that an auditor can tell exactly what it does and does not
establish, and each ruling below closes a route by which that clarity
gets quietly upgraded into a claim.
"""
from __future__ import annotations

import hashlib
from pathlib import Path

from services.api_confirm import (
    ARTIFACT_DECLARATIONS,
    ARTIFACT_KEYS,
    assert_artifact_keys,
)
from tests.source_text import code_only

BACKEND = Path(__file__).resolve().parents[1]
ROUTER = code_only(BACKEND.joinpath("routers/api_confirm.py").read_text())
SERVICE = code_only(BACKEND.joinpath("services/api_confirm.py").read_text())

# AND THE RAW TEXT, for the assertions that are about PROSE.
#
# `code_only` strips comments and docstrings, which is right for every
# structural pin above — a rule must be in the code, not in a note about
# the code. But two rulings here ARE prose: the bounded claim about what
# the hash proves, and the statement that the two hash fields are one
# fact. Asserting those against stripped source checks that the sentence
# is absent from the part of the file that never contains sentences.
ROUTER_RAW = BACKEND.joinpath("routers/api_confirm.py").read_text()
SERVICE_RAW = BACKEND.joinpath("services/api_confirm.py").read_text()


# ═══ draft_sha256 — WHAT IT PROVES, AND WHAT IT MUST NOT CLAIM ═══════

def test_the_hash_is_compared_before_the_promotion():
    """Order is the property. Comparing after the UPDATE would store bytes
    the client never saw and then complain about it — the check has to
    leave the draft PENDING on mismatch, which only works if it runs
    first."""
    approve = ROUTER[ROUTER.index("async def approve_confirmation"):]
    approve = approve[: approve.index("@router")] if "@router" in approve else approve
    compare_at = approve.index("DRAFT_MISMATCH")
    update_at = approve.index("UPDATE api_deeds")
    assert compare_at < update_at, (
        "the hash comparison must precede the promotion, or a mismatch "
        "stores bytes the approver never had")


def test_a_mismatch_is_a_409_and_names_itself():
    assert '"code": "DRAFT_MISMATCH"' in ROUTER
    assert "status_code=409" in ROUTER


def test_the_hash_is_optional_and_the_reason_is_recorded():
    """Optional because the hosted page is not the only possible client.
    A browser that cannot hash must still be able to approve — making it
    required would deny the flow to clients over a check that is
    defence-in-depth rather than the mechanism."""
    assert "draft_sha256: Optional[str]" in ROUTER


def test_the_claim_about_what_the_hash_proves_is_bounded():
    """THE PIN THIS FILE EXISTS FOR.

    Owner-ruled, and the wording is the deliverable: the hash binds the
    name to those bytes and shows the browser fetched them. **It does not
    prove a human read them.** A client can hash bytes it never painted;
    a person can approve a page without looking at it.

    Pinned at the DISCLAIMER rather than at the feature, because the
    feature will survive any edit and the disclaimer is what gets
    trimmed when somebody shortens a docstring.
    """
    assert "does not prove a human read" in ROUTER_RAW.replace("**", "")


# ═══ THE ARTIFACT — ONE HASH, NAMED AS ONE ═══════════════════════════

def test_the_artifact_key_set_is_declared_not_derived():
    """Same reason as the confirmation package and NOTARY2's surfaces: a
    key set computed from the payload agrees with itself no matter what
    the payload becomes."""
    assert "ARTIFACT_KEYS = frozenset({" in SERVICE
    assert "def assert_artifact_keys" in SERVICE
    assert "assert_artifact_keys(artifact)" in ROUTER


def test_the_artifact_is_exactly_its_allowlist():
    artifact = {k: None for k in ARTIFACT_KEYS}
    assert_artifact_keys(artifact)   # the happy path

    for bad in ({**artifact, "extra": 1}, {k: None for k in list(ARTIFACT_KEYS)[:-1]}):
        try:
            assert_artifact_keys(bad)
        except AssertionError:
            continue
        raise AssertionError("the artifact allowlist accepted a drifted shape")


def test_the_licence_key_is_named_as_a_claim_not_a_check():
    """OWNER-RULED. `license_claimed`, never `license`.

    A bare `license` key reads as a verified fact, and the difference
    between "recorded" and "verified" is the entire thing an auditor is
    here to establish. We do not verify licences — not for escrow, title,
    bar or notary, which is also why the field is optional rather than
    required: a required-but-unverified field is stronger-looking
    provenance than we have.
    """
    assert "license_claimed" in ARTIFACT_KEYS
    assert "license" not in ARTIFACT_KEYS
    assert '"license_claimed"' in ROUTER


def test_the_declarations_say_what_is_NOT_established():
    """An artifact that lists only what it proves invites the reader to
    assume the rest. Two of the four declarations are negative on
    purpose, and the negative ones are what a vendor review reads."""
    joined = " ".join(ARTIFACT_DECLARATIONS).lower()
    assert "not verified by deedpro" in joined
    assert "read the document" in joined
    assert "entitled to approve" in joined


def test_the_two_hash_fields_are_documented_as_one_fact():
    """THE MOCKUP'S ERROR, corrected and explained rather than silently
    dropped.

    It showed a draft hash and a PDF hash as separate rows — which reads
    as two independent facts agreeing. **They cannot disagree.** Approve
    PROMOTES the preview bytes rather than re-rendering, so the bytes the
    approver saw and the bytes stored are the same object.

    Both fields are kept because the second records what was COMPARED at
    approval, and an auditor deserves to see it match rather than be told
    it does. The docstring has to say they are one fact, or two identical
    numbers read as corroboration.
    """
    assert "cannot disagree" in SERVICE_RAW or "cannot disagree" in ROUTER_RAW
    assert "TWO NAMES FOR ONE" in SERVICE_RAW.upper()


def test_the_artifact_refuses_to_exist_before_approval():
    """There is no artifact for an unapproved draft, and the endpoint says
    so rather than returning a shape with null fields — a skeleton reads
    as "approved, details missing"."""
    artifact = ROUTER[ROUTER.index("async def get_confirmation_artifact"):]
    assert '"code": "NOT_COMPLETED"' in artifact
    assert "status_code=409" in artifact


def test_the_artifact_hashes_what_we_HOLD_not_what_we_recorded():
    """`pdf_sha256` is recomputed from the stored bytes at read time.

    Reporting the stored string for both fields would make them agree by
    construction in the wrong way — the artifact would be quoting itself.
    Recomputing means the two fields disagreeing is a real signal that
    something replaced the bytes after approval.
    """
    artifact = ROUTER[ROUTER.index("async def get_confirmation_artifact"):]
    assert "hashlib.sha256(bytes(pdf)).hexdigest()" in artifact


def test_hashing_is_sha256_of_the_pdf_bytes_themselves():
    """Not of a JSON rendering of the request, which is what
    `generate_content_hash` does for the authenticity record. Two
    different hashes over two different things live in this file; a
    future edit that used the wrong one would still produce a hex string
    and still look right."""
    probe = b"%PDF-1.4 probe"
    assert hashlib.sha256(probe).hexdigest() != ""
    assert "hashlib.sha256(bytes(preview)).hexdigest()" in ROUTER
