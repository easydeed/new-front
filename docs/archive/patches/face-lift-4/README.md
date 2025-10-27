# DeedPro Landing (Vibrant Edition)

**What's new**  
- Hero now includes a dedicated **deed image** slot (replace: `/public/images/deed-hero.png`).  
- Richer **color backgrounds** for contrast (brand blue + accent tints).  
- Section pops: gradient bands, colored auras, and accent borders—without sacrificing readability.

**Palette**: Blue #2563EB, Surface #F7F9FC, Accent #F26B2B

## Install
```bash
git checkout -b feat/landing-vibrant
npm i lucide-react framer-motion @tailwindcss/typography
npx shadcn@latest add button badge card input
```
Optional backup:
```bash
mkdir -p app/_legacy-landing && git mv app/page.tsx app/_legacy-landing/page.tsx || true
```

## Tailwind tokens (merge into tailwind.config.ts)
```ts
import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}','./components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#2563EB', blue: '#2563EB', accent: '#F26B2B', surface: '#F7F9FC' }
      },
      boxShadow: {
        soft: '0 10px 30px rgba(2,6,23,0.08)',
        glow: '0 10px 40px rgba(37,99,235,0.25)'
      },
      borderRadius: { xl: '16px', '2xl': '24px' }
    }
  },
  plugins: [typography],
}
export default config
```

## Swap the deed image
Replace `/public/images/deed-hero.png` with a cropped screenshot of your SmartReview preview. Ideal size: ~960×540 (16:9).

## Routes wired
- Start a Deed → `/app/wizard`
- See 2‑min demo → `/demo`
- Docs → `/docs`

## Ship
```bash
git add .
git commit -m "Landing: vibrant edition (hero deed image, colored sections)"
git push origin feat/landing-vibrant
```
