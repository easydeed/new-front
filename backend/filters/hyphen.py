"""
Soft Hyphenation Filter
Adds soft hyphens (U+00AD) to long words for better text wrapping
"""
import pyphen

# Initialize English (US) hyphenation dictionary
_dic = pyphen.Pyphen(lang='en_US')

def hyphenate_soft(text: str) -> str:
    """
    Insert soft hyphens into text for better line breaking
    
    Args:
        text: Input text (e.g., legal description)
    
    Returns:
        Text with soft hyphens inserted
    
    Example:
        >>> hyphenate_soft("PARCEL B OF PARCEL MAP")
        "PAR­CEL B OF PAR­CEL MAP"
    """
    if not text:
        return ""
    
    return _dic.inserted(text, hyphen='\u00AD')  # Soft hyphen character

