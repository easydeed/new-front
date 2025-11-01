# V0 PROMPT — Property Search UI Shell (UI‑only)

Goal: Improve the **visual shell** of Property Search while keeping **all logic** untouched.

**Constraints**
- Do not modify Google Places, SiteX calls, or any handler signatures
- Maintain `onVerified`, `onChange`, `onSelect`, debouncing, refs
- Preserve error/empty/loading states

**Enhance**
- Input group: label, helper, hint copy
- Suggestions dropdown: readable density, highlight active row (keyboard)
- Verified badge and prefill summary (APN, County, Legal Description, Owner) when available
- Inline error placement with `aria-describedby`
- Mobile: full‑width input, large tap targets

**Deliverable**
- Return a component TSX where logic is pasted into `// [PASTE EXISTING LOGIC HERE]`
- Only Tailwind className/layout changes
