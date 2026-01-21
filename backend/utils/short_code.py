"""
Short Code Generation for Document Verification
Generates human-readable, unique document identifiers.
"""

import random
import string
import hashlib
from datetime import datetime


def generate_short_code() -> str:
    """
    Generate a human-readable document ID.
    Format: DOC-YYYY-XXXXX
    
    Example: DOC-2026-A7X9K
    
    Uses only unambiguous characters (removes 0, O, I, L, 1)
    """
    year = datetime.now().year
    # Remove ambiguous characters: 0, O, I, L, 1
    chars = string.ascii_uppercase + string.digits
    chars = chars.replace('0', '').replace('O', '').replace('I', '').replace('L', '').replace('1', '')
    random_part = ''.join(random.choices(chars, k=5))
    return f"DOC-{year}-{random_part}"


def generate_content_hash(content: str) -> str:
    """
    Generate SHA-256 hash of content.
    
    Args:
        content: The content to hash (HTML, JSON, etc.)
    
    Returns:
        64-character hexadecimal hash string
    """
    return hashlib.sha256(content.encode('utf-8')).hexdigest()


def abbreviate_name(name: str) -> str:
    """
    Abbreviate name for privacy display.
    
    Examples:
        "JOHN SMITH" -> "JOHN S."
        "JANE DOE" -> "JANE D."
        "JOHN AND JANE SMITH" -> "JOHN AND JANE S."
    
    Args:
        name: Full name to abbreviate
    
    Returns:
        Abbreviated name with last name initial
    """
    if not name:
        return ""
    
    name = name.strip().upper()
    
    # Handle "AND" in names (e.g., "JOHN AND JANE SMITH")
    if " AND " in name:
        parts = name.split(" AND ")
        if len(parts) == 2:
            # Get the last word as the shared last name
            last_part_words = parts[1].strip().split()
            if len(last_part_words) >= 2:
                last_name_initial = last_part_words[-1][0] + "."
                first_names = parts[0].strip() + " AND " + " ".join(last_part_words[:-1])
                return f"{first_names} {last_name_initial}"
    
    # Standard single person abbreviation
    parts = name.split()
    if len(parts) >= 2:
        return f"{parts[0]} {parts[-1][0]}."
    
    return name
