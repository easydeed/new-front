# Cursor Package — DeedPro Landing (Branded + Live Copy)

This package replaces your marketing landing with a polished, brand‑matched page using **Next.js + Tailwind + shadcn + Motion** and ships with **ready-to-use copy**.

## Palette
- Blue: #2563EB
- Surface: #F7F9FC
- Accent: #F26B2B

## Install
```bash
git checkout -b feat/landing-livecopy
npm i lucide-react framer-motion @tailwindcss/typography
npx shadcn@latest add button badge card input
```
Optional backup of current landing:
```bash
mkdir -p app/_legacy-landing && git mv app/page.tsx app/_legacy-landing/page.tsx || true
```

## Tailwind tokens (merge into tailwind.config.ts)
```ts
import type {{ Config }} from 'tailwindcss'
import typography from '@tailwindcss/typography'

const config: Config = {{
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {{
    extend: {{
      colors: {{
        brand: {{
          DEFAULT: '#2563EB',
          blue: '#2563EB',
          accent: '#F26B2B',
          surface: '#F7F9FC'
        }},
        background: '#F7F9FC'
      }},
      boxShadow: {{
        soft: '0 10px 30px rgba(2,6,23,0.08)',
        glow: '0 10px 40px rgba(37, 99, 235, 0.25)'
      }},
      borderRadius: {{
        xl: '16px',
        '2xl': '24px'
      }}
    }}
  }},
  plugins: [typography],
}}
export default config
```

## Routes wired
- **Start a Deed** → `/app/wizard`
- **See 2‑min demo** → `/demo`

## Ship
```bash
git add .
git commit -m "Landing: branded live copy + hero preview + trust + sections"
git push origin feat/landing-livecopy
```
