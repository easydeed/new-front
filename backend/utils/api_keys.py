"""
API Key Generation and Validation Utilities
"""
import secrets
import bcrypt
from datetime import datetime


TEST_PREFIX = "dp_test_"
LIVE_PREFIX = "dp_live_"


class KeyClassMismatch(ValueError):
    """The stored prefix and the stored `is_test` disagree.

    ═══ WHY THIS IS AN EXCEPTION AND NOT A WARNING ═══

    **The prefix is the only thing a human reads.** It appears in the
    admin console, in the value an integrator pastes into their config,
    and in every support conversation about a key. `is_test` appears
    nowhere a person looks — it is a column that silently decides
    whether renders carry `SAMPLE — NOT FOR RECORDING`.

    So a key whose prefix says `dp_test_` while its column says live
    produces clean, recordable-looking deeds while every human signal
    around it says "this is a sandbox". That is the defect underneath
    the whole 2026-09-22 watermark investigation, and it is the kind
    that is invisible until a document reaches a county recorder.

    Owner-ruled 2026-09-23: the two cannot disagree. Asserted where the
    row is written, not checked on a later pass.
    """


def key_class_of(key_prefix: str) -> bool:
    """The `is_test` a prefix IMPLIES. One declaration, so a second
    reader cannot invent a different spelling of the same question."""
    return (key_prefix or "").startswith(TEST_PREFIX)


def assert_key_class(key_prefix: str, is_test: bool) -> None:
    """Raise unless the prefix and the flag say the same thing."""
    if key_class_of(key_prefix) != bool(is_test):
        raise KeyClassMismatch(
            f"key_prefix {key_prefix!r} and is_test={bool(is_test)} "
            f"disagree about this key's class")


def generate_api_key(is_test: bool = False) -> tuple:
    """
    Generate a new API key.

    Returns: (full_key, prefix, hash)
    - full_key: The complete key to give to the user (only shown once)
    - prefix: The prefix for database lookup (stored in DB)
    - hash: The bcrypt hash for validation (stored in DB)
    """
    prefix_type = TEST_PREFIX if is_test else LIVE_PREFIX
    random_part = secrets.token_urlsafe(24)  # ~32 chars
    full_key = f"{prefix_type}{random_part}"

    # Store only prefix + hash
    key_prefix = full_key[:20]  # "dp_live_abc123def456" (enough to be unique)
    key_hash = bcrypt.hashpw(full_key.encode(), bcrypt.gensalt()).decode()

    # Near-tautological, and that is exactly the point: the only way it
    # can fire is somebody editing one of these two lines without the
    # other, which is the single way this invariant has ever been at
    # risk. A check that cannot fail today is cheap insurance against
    # the edit that makes it able to.
    assert_key_class(key_prefix, is_test)

    return full_key, key_prefix, key_hash


def validate_api_key(full_key: str, stored_hash: str) -> bool:
    """Validate an API key against its stored hash."""
    try:
        return bcrypt.checkpw(full_key.encode(), stored_hash.encode())
    except Exception:
        return False


def generate_deed_id() -> str:
    """Generate a unique deed ID for API-created deeds."""
    random_part = secrets.token_urlsafe(12)  # ~16 chars
    return f"deed_{random_part}"


def generate_document_id() -> str:
    """Generate a human-readable document ID for verification."""
    year = datetime.now().year
    # Use characters that are easy to read/type (no 0, O, I, L, 1)
    chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
    random_part = ''.join(secrets.choice(chars) for _ in range(5))
    return f"DOC-{year}-{random_part}"


def extract_key_prefix(full_key: str) -> str:
    """Extract the prefix from a full API key for database lookup."""
    return full_key[:20] if len(full_key) >= 20 else full_key
