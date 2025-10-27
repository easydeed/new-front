# DeedPro — Vibrant Fix + Real Deed Preview

This patch gives you:
1) A **real deed preview** in the hero (PNG + SVG fallback).
2) **Vibrant section backgrounds** (radial tints, stripes, gradient bands).

## Files
- `public/images/deed-hero.png` — generated preview (swap with a crisp SmartReview screenshot when ready).
- `app/components/DeedPreview.tsx` — Next/Image with SVG fallback (never blank again).
- `styles/globals.css` — background utilities (import once).

## Install
1. Copy `public/images/deed-hero.png` **into your app root’s** `public/images/` folder.
   - If your Next app lives in `/frontend`, use `/frontend/public/images/`.
2. Copy `app/components/DeedPreview.tsx` into your components folder.
3. Add to your `app/layout.tsx` (or `_app.tsx`): `import '../styles/globals.css'`

## Update your hero card (in `app/page.tsx`)
Replace the `<Image .../>` in the hero preview with:
```tsx
import DeedPreview from '@/app/components/DeedPreview'

<div className="mt-4 relative rounded-b-xl overflow-hidden">
  <DeedPreview className="w-full h-auto" />
  <div className="pointer-events-none absolute inset-0 ring-1 ring-black/5" />
</div>
```

## Make backgrounds pop (examples)
Wrap sections with these classes to add personality:
```tsx
<section className="py-20 section-blue bg-radial-brand">
  ...
</section>

<section className="py-20 section-accent bg-stripes">
  ...
</section>

<section className="py-20 section-duo mask-top-fade">
  ...
</section>
```

**Suggested mapping**
- API block: `section-blue bg-radial-brand`
- Features: `section-duo`
- Steps: `section-accent bg-radial-brand`
- Pricing: `section-duo bg-stripes`

## Commit
```bash
git add public/images/deed-hero.png app/components/DeedPreview.tsx styles/globals.css
git commit -m "Landing: vibrant backgrounds + non-blank deed preview (SVG fallback)"
git push origin <your-branch>
```
