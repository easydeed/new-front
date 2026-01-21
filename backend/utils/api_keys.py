"""
API Key Generation and Validation Utilities
"""
import secrets
import bcrypt
from datetime import datetime


def generate_api_key(is_test: bool = False) -> tuple:
    """
    Generate a new API key.
    
    Returns: (full_key, prefix, hash)
    - full_key: The complete key to give to the user (only shown once)
    - prefix: The prefix for database lookup (stored in DB)
    - hash: The bcrypt hash for validation (stored in DB)
    """
    prefix_type = "dp_test_" if is_test else "dp_live_"
    random_part = secrets.token_urlsafe(24)  # ~32 chars
    full_key = f"{prefix_type}{random_part}"
    
    # Store only prefix + hash
    key_prefix = full_key[:20]  # "dp_live_abc123def456" (enough to be unique)
    key_hash = bcrypt.hashpw(full_key.encode(), bcrypt.gensalt()).decode()
    
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
