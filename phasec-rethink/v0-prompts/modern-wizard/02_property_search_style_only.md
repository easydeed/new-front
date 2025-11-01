# V0 Prompt — Property Search (Style Only)

Redesign the **appearance only** of our Property Search UI. Keep these **unchanged**:
- useState/useEffect logic
- Google Places + SiteX calls
- onChange/onVerify/onSelect handlers
- hydration & error logic

Style guidelines:
- Inputs: large radius, soft focus ring (purple), compact help text
- Suggestions: list with two‑line items (label + secondary), hover background
- Enrichment chips: APN, County, Owner, Legal Description as read‑only rows

Deliver:
- TSX with class changes and markup wrappers only
- No new dependencies
