"""
Text Fitting Filter
Automatically shrink text to fit within specified width
"""
from PIL import ImageFont
from typing import Dict, Union

def _px_per_in() -> float:
    """Pixels per inch at 96 DPI"""
    return 96.0


def _measure_text_px(text: str, font_path: str, size_pt: float) -> float:
    """
    Measure text width in pixels using PIL
    
    Args:
        text: Text to measure
        font_path: Path to TrueType font file
        size_pt: Font size in points
    
    Returns:
        Text width in pixels
    """
    try:
        font = ImageFont.truetype(font_path, int(size_pt))
    except Exception:
        # Fallback to default font if custom font not available
        font = ImageFont.load_default()
    
    try:
        # Try modern PIL method
        return font.getlength(text)
    except AttributeError:
        # Fallback for older PIL versions
        bbox = font.getbbox(text)
        return bbox[2] - bbox[0]


def shrink_to_fit(
    text: str, 
    font_path: str, 
    box_width_in: float, 
    start_pt: float = 11.0, 
    min_pt: float = 9.0
) -> Dict[str, Union[str, float]]:
    """
    Automatically shrink text font size to fit within box width
    
    Args:
        text: Text to fit
        font_path: Path to TrueType font file
        box_width_in: Box width in inches
        start_pt: Starting font size in points (default 11)
        min_pt: Minimum font size in points (default 9)
    
    Returns:
        Dictionary with 'text' and 'pt' (font size) keys
    
    Example:
        >>> shrink_to_fit("VERY LONG GRANTEE NAME", "arial.ttf", 3.0, 11, 9)
        {"text": "VERY LONG GRANTEE NAME", "pt": 9.5}
    """
    target_px = box_width_in * _px_per_in()
    size = start_pt
    
    # Decrease font size in 0.25pt increments until text fits
    while size >= min_pt:
        text_width = _measure_text_px(text or "", font_path, size)
        if text_width <= target_px:
            return {"text": text or "", "pt": size}
        size -= 0.25
    
    # If still doesn't fit, return minimum size
    return {"text": text or "", "pt": min_pt}

