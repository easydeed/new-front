# V0 PROMPT — Wizard UI Facelift (UI‑only, preserve logic)

**You are redesigning only the visual layer** for DeedPro’s Wizard (Modern + Classic). Do **NOT** change any data flow, hooks, or event handlers. We will paste the real component code into the sections marked `// [PASTE EXISTING LOGIC HERE]`. Return updated TSX with Tailwind‑only styling and improved layout/spacing/accessibility.

## Brand / Tone
- Light, modern, “Tech Vibrance”; smooth transitions; no harsh contrast
- No gradients/bars intruding above deed preview; no global fonts/colors asserted
- Use system fonts; keep colors neutral; accent only via spacing/weight

## Must‑Keep (Critical)
- All imports, state/hooks, handlers, props, and `finalizeDeed` calls
- LocalStorage keys (e.g., `deedWizardDraft`), `useWizardStoreBridge`, Modern/Classic modes
- SiteX enrichment display (APN, county, legal desc, owner) if props present
- Accessibility (labels, `aria-*`, focus order)
- Mobile‑first responsiveness

## Improve
- Card shells, spacing rhythm (8/12px grid), readable headings
- Input groupings, help/error text placement
- Stepper/progress visibility
- Review section readability; edit buttons discoverable
- Subtle micro‑interactions (hover/active), respect `prefers-reduced-motion`

## Return
- TSX file(s) per component with Tailwind classes only
- No logic changes beyond classNames and presentational div wrappers
