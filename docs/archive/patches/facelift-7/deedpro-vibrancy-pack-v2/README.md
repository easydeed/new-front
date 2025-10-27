
# DeedPro Vibrancy Pack — v2 (Deed Hero) • Cursor‑Ready

This update keeps your **deed preview** in the hero (not code) and adds depth, motion and polish similar to pdfshift.io — without changing your structure.

**Quick start**
1. `npm i framer-motion clsx`
2. Merge `patches/tailwind.extend.ts` into your Tailwind config.
3. Import `styles/vibrancy.css` in your global CSS.
4. Drop `<Background />` in `app/layout.tsx` (once).
5. Replace your hero with `<DeedHero />` (or copy the JSX into your existing hero).
6. (Optional) Replace pricing with `<InteractivePricing />` or keep your current table and add it below.

**What’s new in v2**
- **DeedHero**: shows a tilted, glossy deed preview with a subtle “Recorded” stamp pulse and a tabbed header (`Edit | Confirm & Create`). 
- **StickyCTA**: shows “Start a Deed” + “See 2‑min demo” as a sticky bar after 33% scroll.
- **InteractivePricing** (optional): a tiny slider to estimate cost by deeds/month while preserving your Team/Enterprise tiers.
- **Tokens**: CSS variables for colors and elevation; keep your palette in one place.

