# PDF Formatting Specifications

**Date**: September 2025  
**Purpose**: Ensure all generated PDFs meet legal recording requirements for perfect user interaction.

- **Page Size**: US Letter (8.5 x 11 inches)—standard for CA deeds.
- **Margins**: 1 inch top/bottom, 0.5 inch sides (adjust per county, e.g., LA requires 1 inch top for tax declaration).
- **Implementation**: Use WeasyPrint @page { size: letter; margin: 1in 0.5in; } in templates.
- **Validation**: Test PDFs open in Adobe Reader, print correctly, no cutoff text.
- **Legal Reference**: Government Code §27361.7—specific formatting to avoid rejection.

Reference in backend/utils/pdf.py and templates/.