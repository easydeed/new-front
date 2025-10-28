# Face‑Lift 9 — Glassmorphism (No Gradients) + Essential Sections

This implements your Systems Architect analysis: a minimal, glassmorphism landing **with** must‑have sections so nav links aren’t dead.

## What’s inside
- `app/landing-v9/page.tsx` – Header, Hero (glass deed card), Features, Pricing, FAQ, Footer
- `app/landing-v9/DeedPreview.tsx` – Image with **SVG fallback** so hero never blanks
- `public/images/deed-hero.png` – 1200×675 SmartReview‑style preview (replace with your screenshot)

## Install (A/B test route recommended)
```bash
git checkout -b feat/landing-v9-glass
# copy these into your Next.js app root:
#  app/landing-v9
#  public/images/deed-hero.png
git add app/landing-v9 public/images/deed-hero.png
git commit -m "Face‑Lift 9: glass hero + sections, solid brand backgrounds"
git push origin feat/landing-v9-glass
```
Visit **/landing-v9** to QA.

## Promote to main
If it wins, move `app/landing-v9/page.tsx` → `app/page.tsx` (or route `/` → `/landing-v9`).

## Maps to the analysis
- Adds Features, Pricing, FAQ, Footer → fixes missing sections & broken anchors.
- Keeps **pure CSS**: Tailwind classes, no component libs.
- Uses **solid brand backgrounds** only (Blue #2563EB, Orange #F26B2B, Surface #F7F9FC).

## QA checklist
- Anchors scroll to `#features`, `#pricing`, `#faq`
- CTAs: Start a Deed → `/app/wizard`, Demo → `/demo`
- Replace `public/images/deed-hero.png` with your real SmartReview screenshot
- Add analytics events (start/demo/cta)
- Test mobile/tablet/desktop; run Lighthouse
