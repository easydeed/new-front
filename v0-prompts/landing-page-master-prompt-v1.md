# Title: DeedPro Landing Page — Production V1.1 (Next.js 15, App Router, Tailwind, shadcn/ui)

**Target**: Vercel V0 AI  
**Date**: October 30, 2025  
**Version**: 1.1 (Production-Ready)  
**Performance Budget**: Lighthouse ≥ 90 (Performance ≥90, Accessibility ≥95, Best Practices ≥90, SEO ≥90)  
**Core Web Vitals**: LCP < 2.5s, CLS < 0.1

---

## 🏗️ ARCHITECTURE & FILES (CRITICAL)

### **File Structure**:
```
app/
├── (marketing)/
│   └── page.tsx          # Server Component (main landing page)
components/
├── StickyCta.tsx          # Client island (scroll-triggered CTA)
├── VideoPlayer.tsx        # Client island (YouTube embed, dynamic import)
└── ApiSnippet.tsx         # Server Component (code block)
```

### **Component Strategy**:
- **Server Components**: Main page, ApiSnippet, static sections
- **Client Islands**: StickyCta, VideoPlayer, animated reveal wrappers
- **Semantic HTML**: Use `<header>`, `<main>`, `<section>`, `<footer>` with `aria-label` attributes
- **Lazy Loading**: Dynamic import VideoPlayer with skeleton fallback

---

## 📋 SECTIONS TO CREATE (13 Total)

1. **Hero** - Dark section with CSS gradient background, gradient headline, dual CTAs, deed preview card
2. **Stats Bar** - Light section with 4 metrics (deeds generated, accuracy rate, time saved, compliance)
3. **API Example** - Dark section with cURL code snippet (ApiSnippet.tsx) + developer messaging
4. **Video Section** - Dark section with VideoPlayer (client island, nocookie domain), benefits list, demo CTA
5. **Features** - Light section with 4 feature cards (AI-powered, compliance, integration, security)
6. **Steps/Workflow** - Gray-50 section with 3-step process (input → AI generates → review & record)
7. **Integrations** - White section with compatible title/escrow software logos (grayscale → color on hover)
8. **Comparison Table** - Light section comparing DeedPro vs. manual process (Check vs X icons)
9. **Security & Compliance** - White section with 3 certifications (SOC 2 Type II, AES-256, ALTA Best Practices)
10. **Pricing** - Gray-50 section with 3 tiers (Starter, Professional, Enterprise) - middle tier has accent ring
11. **FAQ** - White section with 7 frequently asked questions (accordion or simple headings)
12. **Footer** - Dark section with 5-column grid (brand, product, company, resources, legal) + bottom bar
13. **Sticky CTA Bar** - Client island (IntersectionObserver at ~33% scroll, slide-up animation with reduced-motion check)

---

## 🎨 BRAND & DESIGN SYSTEM

### **Colors** (CRITICAL - Use Exactly):
```typescript
// Neutral, techy palette with modern vibrance
--primary: #3B82F6        // Modern Blue (Sky 500 - professional, trustworthy)
--accent: #8B5CF6         // Vibrant Purple (Violet 500 - innovation, AI)
--dark: #0F172A           // Slate 900 (dark sections, footer)
--light: #F8FAFC          // Slate 50 (light sections background)
--white: #FFFFFF          // Pure white sections
--gray-50: #F1F5F9        // Slate 100 (subtle backgrounds)
--gray-600: #475569       // Slate 600 (body text, neutral)
--gray-900: #0F172A       // Slate 900 (headings, high contrast)
--success: #10B981        // Emerald 500 (checkmarks, success states)
--warning: #F59E0B        // Amber 500 (alerts, highlights)

// Gradient overlays (for hero, cards)
--gradient-primary: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)
--gradient-dark: linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.85) 100%)
```

### **Typography**:
```typescript
// Modern system font stack (optimized for tech aesthetic)
font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, 'SF Pro Display', 
             'Segoe UI Variable', 'Segoe UI', 'Inter var', system-ui, sans-serif

// Font weights (use specific weights for modern look)
- Display (headlines): font-bold (700) or font-extrabold (800)
- Titles: font-semibold (600)
- Body: font-normal (400)
- Labels: font-medium (500)

// Sizes (with tight tracking for modern feel)
- Hero Headline: text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight
- Section Titles: text-3xl sm:text-4xl font-bold tracking-tight
- Body: text-base sm:text-lg font-normal leading-relaxed
- Small: text-sm font-normal
- Micro: text-xs font-medium tracking-wide uppercase (for labels)

// Letter spacing
- Headlines: tracking-tight (-0.025em)
- Body: tracking-normal (0em)
- Labels/Micro: tracking-wide (0.025em)
```

### **Spacing**:
```typescript
// Section padding (responsive)
py-16 sm:py-20 lg:py-24

// Container (max-width wrapper)
max-w-7xl mx-auto px-4 sm:px-6 lg:px-8

// Card gap
gap-6 sm:gap-8

// Grid layouts
grid-cols-1 sm:grid-cols-2 lg:grid-cols-4
```

---

## 🏗️ TECH STACK (MUST USE)

### **Framework**:
- **Next.js 15** (App Router, TypeScript)
- **Server Components** by default (mark client islands with 'use client')
- **Tailwind CSS** (utility-first styling)
- **shadcn/ui** (component library - Badge, Button, Card, Input)

### **Components**:
```typescript
// shadcn/ui (already installed)
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
```

### **Icons**:
```typescript
// lucide-react (already installed)
import { 
  Check, Zap, Lock, Map, Clock, ArrowRight, 
  FileDigit, Wand2, Sparkles, Shield, Users, X 
} from 'lucide-react'
```

### **Animations** (Client Islands Only):
```typescript
// framer-motion (use ONLY in client components)
import { motion } from 'framer-motion'

// CRITICAL: Honor prefers-reduced-motion
'use client';
import { useReducedMotion } from 'framer-motion';

export function AnimatedSection({ children }) {
  const shouldReduceMotion = useReducedMotion();
  
  if (shouldReduceMotion) {
    return <div>{children}</div>;  // Static variant
  }
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}
```

### **Images** (CRITICAL for Performance):
```typescript
// next/image ONLY (never use <img>)
import Image from 'next/image'

// ALWAYS set explicit width/height or use fill with constrained wrapper
<Image 
  src="/local-asset.webp"
  alt="Descriptive alt text"
  width={800}
  height={600}
  priority={false}  // true only for LCP image
  loading="lazy"
  className="object-cover"
/>

// Hero background: CSS gradient (NOT heavy image)
<div className="bg-gradient-to-br from-dark via-gray-900 to-primary/20" />
```

---

## 📐 SECTION-BY-SECTION SPECIFICATIONS

### **1. HERO SECTION** (Server Component)

**Layout**: 
- Dark background (CSS gradient - NO heavy image)
- Grid layout: left (text) + right (deed preview card)
- Mobile: stack vertically

**Background** (CRITICAL - Use CSS gradient, not image):
```typescript
<section className="relative overflow-hidden bg-gradient-to-br from-dark via-gray-900 to-primary/10">
  {/* Optional: Subtle grid pattern */}
  <div className="absolute inset-0 bg-grid-pattern opacity-5" />
  
  {/* Content container */}
  <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
    {/* Grid: left text + right card */}
  </div>
</section>
```

**Content**:
```typescript
// Badge (techy, neutral, uppercase with wide tracking)
<Badge variant="secondary" className="bg-primary/10 text-primary ring-1 ring-primary/20 backdrop-blur-sm text-xs font-medium tracking-wide uppercase">
  AI‑Powered • Enterprise‑Grade
</Badge>

// Headline (gradient text from primary to accent, extra bold for impact)
<h1 className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white">
  Create California deeds
  <span className="block mt-2 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
    in minutes.
  </span>
</h1>

// Subheadline (lighter gray for contrast)
<p className="mt-6 text-xl text-gray-400 max-w-2xl leading-relaxed">
  DeedPro combines an AI‑assisted wizard, SmartReview, and integrations 
  built for title workflows—so your team ships clean documents on the first pass.
</p>

// CTAs (primary = blue, secondary = outline)
<div className="mt-8 flex flex-col sm:flex-row gap-4">
  <Button size="lg" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
    Start a Deed <ArrowRight className="ml-2 h-5 w-5" />
  </Button>
  <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 backdrop-blur-sm">
    See 2‑min demo
  </Button>
</div>
```

**Deed Preview Card** (right side):
```typescript
<Card className="border border-white/10 shadow-2xl bg-white/95 backdrop-blur-sm">
  {/* Gradient top bar (primary to accent) */}
  <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary rounded-t-lg" />
  
  <CardContent className="p-6">
    <div className="flex items-center justify-between mb-4">
      <span className="text-sm font-medium text-gray-900">SmartReview — Grant Deed</span>
      <Badge variant="secondary" className="bg-light text-gray-700">Preview</Badge>
    </div>
    
    {/* Deed preview placeholder (use CSS, not image) */}
    <div className="aspect-[8.5/11] rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 flex items-center justify-center">
      <FileDigit className="h-16 w-16 text-gray-400" />
    </div>
    
    {/* Bottom buttons */}
    <div className="mt-6 flex gap-3">
      <Button size="sm" variant="outline" className="flex-1">Edit</Button>
      <Button size="sm" className="flex-1 bg-accent hover:bg-accent/90">
        Confirm & Create
      </Button>
    </div>
  </CardContent>
</Card>
```

**Performance**:
- NO background image (pure CSS gradient)
- Deed preview: CSS placeholder (not image)
- LCP candidate: Badge or headline text
- No layout shift (explicit aspect ratios)

---

### **2. STATS BAR**

**Layout**:
- Light background (#FFFFFF)
- Border top/bottom with primary color (border-primary/15)
- Grid: 4 columns on desktop, 2 on mobile
- Each stat: icon + label + big number

**Content**:
```typescript
const stats = [
  { icon: FileDigit, label: 'Deeds Generated', value: '25,000+' },
  { icon: Check, label: 'Accuracy Rate', value: '99.9%' },
  { icon: Clock, label: 'Avg. Time Saved', value: '45 min' },
  { icon: Shield, label: 'Compliance', value: '100%' },
]

// Each stat card
<div className="rounded-xl border border-primary/20 p-6 bg-primary/5">
  <div className="flex items-center gap-2 text-sm text-gray-600">
    <Icon className="h-4 w-4 text-accent" />
    {label}
  </div>
  <div className="mt-2 text-3xl font-bold text-gray-900">{value}</div>
</div>
```

**Performance**: Static content, no lazy loading needed

---

### **3. API EXAMPLE** (Server Component + ApiSnippet.tsx)

**Layout**:
- Dark background (#0F172A)
- Grid: left (text) + right (code snippet component)
- Mobile: stack vertically

**Content**:
```typescript
// app/(marketing)/page.tsx
import ApiSnippet from '@/components/ApiSnippet';

<section aria-label="API Integration" className="py-16 sm:py-20 lg:py-24 bg-dark">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="grid lg:grid-cols-2 gap-10 items-center">
      {/* Left side */}
      <div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
          Deed creation in one call
        </h2>
        <p className="mt-4 text-lg text-gray-400 leading-relaxed">
          Trigger the same trusted flow from your stack with a single endpoint.
        </p>
        <div className="mt-6 flex gap-3">
          <Button className="bg-accent hover:bg-accent/90 shadow-lg shadow-accent/25">
            Read the docs
          </Button>
          <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
            Explore the API
          </Button>
        </div>
      </div>
      
      {/* Right side: Code snippet component */}
      <ApiSnippet />
    </div>
  </div>
</section>
```

**components/ApiSnippet.tsx** (Server Component):
```typescript
// Mark TODOs for placeholders
export default function ApiSnippet() {
  return (
    <Card className="border-primary/20 bg-gray-900/50 backdrop-blur-sm">
      <CardContent className="p-6">
        <pre className="text-xs sm:text-sm overflow-auto text-gray-300 font-mono leading-relaxed">
{`curl -X POST https://api.deedpro.app/deeds/create \\
  -H "Authorization: Bearer <TODO: token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "grantor": "TODO: grantor name",
    "grantee": "TODO: grantee name",
    "legalDescription": "TODO: legal description",
    "vesting": "TODO: vesting type"
  }'`}
        </pre>
      </CardContent>
    </Card>
  );
}
```

**Performance**: 
- Server component (no hydration cost)
- Lazy render if offscreen (optional: wrap in Suspense)

---

### **4. VIDEO SECTION** (Server Component + VideoPlayer.tsx Client Island)

**Layout**:
- Dark background (#0F172A)
- Grid: left (text + benefits) + right (VideoPlayer component)
- Mobile: stack vertically

**Content**:
```typescript
// app/(marketing)/page.tsx
import dynamic from 'next/dynamic';

// Dynamic import with skeleton
const VideoPlayer = dynamic(() => import('@/components/VideoPlayer'), { 
  ssr: false,
  loading: () => (
    <div className="aspect-video rounded-2xl bg-gray-800 border border-white/10 animate-pulse flex items-center justify-center">
      <Sparkles className="h-12 w-12 text-gray-600" />
    </div>
  )
});

<section aria-label="Product Demo" className="py-16 sm:py-20 lg:py-24 bg-dark">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="grid lg:grid-cols-2 gap-10 items-center">
      {/* Left side */}
      <div>
        <h2 className="text-3xl sm:text-4xl font-semibold text-white">
          Watch the 2‑minute demo
        </h2>
        <ul className="mt-6 space-y-3">
          {['AI wizard flow', 'SmartReview validation', 'One-click PDF generation'].map(item => (
            <li key={item} className="flex items-center gap-2 text-gray-400">
              <Check className="h-5 w-5 text-success flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
        <Button className="mt-6 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
          Start a Deed <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
      
      {/* Right side: Video player (client island) */}
      <VideoPlayer />
    </div>
  </div>
</section>
```

**components/VideoPlayer.tsx** (Client Island):
```typescript
'use client';

export default function VideoPlayer() {
  return (
    <div className="aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
      <iframe
        src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
        className="w-full h-full"
        title="DeedPro Product Demo"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}
```

**Performance**: 
- Dynamic import (no SSR, saves bundle size)
- Skeleton fallback (prevents CLS)
- youtube-nocookie.com (no tracking cookies)
- NO autoplay

---

### **5. FEATURES**

**Layout**:
- Light background (#F7F9FC)
- Grid: 2×2 (4 cards) on desktop, 1 column on mobile
- Each card: icon + title + description

**Content**:
```typescript
const features = [
  { 
    icon: Wand2, 
    title: 'AI-Powered Wizard',
    description: 'Clean, accessible forms with inline validation. Less friction, fewer do-overs.'
  },
  { 
    icon: Shield, 
    title: 'CA Compliance Built-in',
    description: 'All 58 counties supported with up-to-date recording requirements and formatting.'
  },
  { 
    icon: Zap, 
    title: 'SoftPro & Qualia Integration',
    description: 'Fits your existing workflow—no dramatic retooling needed.'
  },
  { 
    icon: Lock, 
    title: 'Enterprise Security',
    description: 'Bank-grade encryption, SOC 2 compliance, and audit logs for every action.'
  },
]

// Each feature card
<Card className="border-gray-200 bg-white hover:shadow-lg transition-shadow">
  <CardContent className="p-6">
    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
      <Icon className="h-6 w-6 text-primary" />
    </div>
    <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
    <p className="mt-2 text-gray-600">{description}</p>
  </CardContent>
</Card>
```

---

### **6. STEPS/WORKFLOW**

**Layout**:
- Light gray background (#F9FAFB)
- 3 steps with connecting line/timeline
- Each step: number badge + title + description

**Content**:
```typescript
const steps = [
  { n: 1, title: 'Input Details', desc: 'Enter the address. We prefill from trusted sources.' },
  { n: 2, title: 'AI Generates', desc: 'Our AI drafts the deed with CA-compliant formatting.' },
  { n: 3, title: 'Review & Record', desc: 'SmartReview catches issues. One click to e-record.' },
]

// Timeline connector (vertical line with gradient)
<div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary via-accent to-primary/40" />

// Each step
<div className="flex items-start gap-4">
  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center font-bold">
    {n}
  </div>
  <div>
    <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
    <p className="mt-2 text-gray-600">{desc}</p>
  </div>
</div>
```

---

### **7. INTEGRATIONS**

**Layout**:
- White background
- Logo grid: 3-4 columns, grayscale logos
- Hover: color comes back

**Content**:
```typescript
const integrations = [
  { name: 'SoftPro', logo: '/logos/softpro.svg' },
  { name: 'Qualia', logo: '/logos/qualia.svg' },
  { name: 'RamQuest', logo: '/logos/ramquest.svg' },
  { name: 'ResWare', logo: '/logos/resware.svg' },
]

// Logo item
<div className="grayscale hover:grayscale-0 transition-all opacity-70 hover:opacity-100">
  <Image src={logo} alt={name} width={120} height={40} />
</div>
```

**Performance**: Use `next/image` with `loading="lazy"`

---

### **8. COMPARISON TABLE**

**Layout**:
- Light background (#F7F9FC)
- 2-column table: DeedPro vs. Manual Process
- Checkmarks vs. X marks

**Content**:
```typescript
const comparisons = [
  { feature: 'Time to complete', deedpro: '5-10 min', manual: '45-90 min' },
  { feature: 'Error rate', deedpro: '<1%', manual: '15-25%' },
  { feature: 'Compliance updates', deedpro: 'Automatic', manual: 'Manual tracking' },
  { feature: 'Multi-user collaboration', deedpro: true, manual: false },
]

// Table row
<tr className="border-b border-gray-200">
  <td className="py-4 px-6 text-gray-700">{feature}</td>
  <td className="py-4 px-6">
    {deedpro === true ? <Check className="h-5 w-5 text-accent" /> : deedpro}
  </td>
  <td className="py-4 px-6 text-gray-500">
    {manual === false ? <X className="h-5 w-5 text-gray-400" /> : manual}
  </td>
</tr>
```

---

### **9. SECURITY & COMPLIANCE**

**Layout**:
- White background
- Grid: 3 columns (certifications)
- Each: badge icon + title + description

**Content**:
```typescript
const certifications = [
  { icon: Shield, title: 'SOC 2 Type II', desc: 'Audited security controls' },
  { icon: Lock, title: 'AES-256 Encryption', desc: 'Bank-grade data protection' },
  { icon: Check, title: 'ALTA Best Practices', desc: 'Title industry standards' },
]
```

---

### **10. PRICING**

**Layout**:
- Light gray background (#F9FAFB)
- 3 pricing cards (Starter, Professional, Enterprise)
- Middle card highlighted with ring

**Content**:
```typescript
const tiers = [
  { 
    name: 'Starter', 
    price: '$0', 
    period: 'forever',
    features: ['5 deeds/month', 'Email support', 'Basic templates'],
    cta: 'Start Free',
    popular: false
  },
  { 
    name: 'Professional', 
    price: '$149', 
    period: '/month',
    features: ['Unlimited deeds', 'Priority support', 'All deed types', 'API access', 'Custom branding'],
    cta: 'Start 14-day trial',
    popular: true
  },
  { 
    name: 'Enterprise', 
    price: 'Custom', 
    period: '',
    features: ['Volume pricing', 'Dedicated support', 'SSO/SAML', 'SLA guarantee', 'White-glove onboarding'],
    cta: 'Contact Sales',
    popular: false
  },
]

// Pricing card (popular has ring)
<Card className={popular ? 'ring-2 ring-accent' : 'border-gray-200'}>
  {popular && <Badge className="bg-accent">Most Popular</Badge>}
  <CardContent className="p-6">
    <h3 className="text-2xl font-bold text-gray-900">{name}</h3>
    <div className="mt-4">
      <span className="text-4xl font-bold text-gray-900">{price}</span>
      <span className="text-gray-600">{period}</span>
    </div>
    <ul className="mt-6 space-y-3">
      {features.map(f => (
        <li key={f} className="flex items-center gap-2 text-gray-700">
          <Check className="h-4 w-4 text-accent" />
          {f}
        </li>
      ))}
    </ul>
    <Button className={popular ? 'bg-accent' : 'bg-primary'}>
      {cta}
    </Button>
  </CardContent>
</Card>
```

---

### **11. FAQ**

**Layout**:
- White background
- 2-column grid on desktop, 1 on mobile
- Each FAQ: question (bold) + answer (regular)

**Content**:
```typescript
const faqs = [
  { q: 'Is this only for California?', a: 'Yes—for now. The data models and recording nuances are CA‑specific.' },
  { q: 'Does it work with SoftPro?', a: 'Yes. We designed the flows to play nicely with SoftPro and similar systems.' },
  { q: 'What deed types do you support?', a: 'Grant Deed, Quitclaim Deed, Interspousal Transfer, Warranty Deed, and Tax Deed.' },
  { q: 'How long does generation take?', a: 'Average generation time is 1-2 seconds. Most deeds are ready within 90 seconds.' },
  { q: 'Can I save partial work?', a: 'Yes. All wizard progress auto-saves. You can return anytime to complete.' },
  { q: 'Is there API access?', a: 'Yes. REST API available on Professional and Enterprise plans.' },
  { q: 'What about security?', a: 'We use AES-256 encryption, SOC 2 compliance, and follow ALTA best practices.' },
]

// FAQ item
<div className="rounded-xl border border-gray-200 p-6 bg-white">
  <h3 className="font-semibold text-gray-900">{q}</h3>
  <p className="mt-2 text-gray-600">{a}</p>
</div>
```

---

### **12. FOOTER**

**Layout**:
- Dark background (#0F172A)
- 5-column grid on desktop, stack on mobile
- Columns: Brand, Product, Company, Resources, Legal

**Content**:
```typescript
<footer className="bg-gray-900 text-gray-300">
  <div className="max-w-7xl mx-auto px-4 py-16">
    <div className="grid md:grid-cols-5 gap-8">
      {/* Column 1: Brand */}
      <div className="md:col-span-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent" />
          <span className="text-xl font-bold text-white">DeedPro</span>
        </div>
        <p className="mt-4 text-sm">
          Create California deeds in minutes with an AI‑assisted wizard and SmartReview.
        </p>
      </div>
      
      {/* Column 2: Product */}
      <div>
        <h3 className="font-semibold text-white">Product</h3>
        <ul className="mt-4 space-y-2 text-sm">
          <li><a href="#features">Features</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="/docs">API</a></li>
        </ul>
      </div>
      
      {/* Columns 3-5: Similar structure */}
    </div>
    
    {/* Bottom bar */}
    <div className="mt-12 pt-8 border-t border-gray-800 flex justify-between text-sm">
      <div>© 2025 DeedPro. All rights reserved.</div>
      <div className="flex gap-4">
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
      </div>
    </div>
  </div>
</footer>
```

---

### **13. STICKY CTA BAR** (Client Island)

**Layout**:
- Fixed bottom bar (appears after user scrolls past sentinel at ~33%)
- Slide-up animation (gated by prefers-reduced-motion)
- Backdrop blur effect
- Primary CTA button

**components/StickyCta.tsx** (Client Island):
```typescript
'use client';
import { useEffect, useState, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function StickyCta() {
  const [show, setShow] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const sentinelRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Use IntersectionObserver (more performant than scroll listener)
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShow(!entry.isIntersecting);
      },
      { threshold: 0 }
    );
    
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);
  
  // Hidden sentinel div at ~33% of page (place in main page)
  // <div ref={sentinelRef} className="h-px" aria-hidden="true" />
  
  if (!show) return null;
  
  const content = (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 p-4 z-50 shadow-xl">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-sm font-medium text-gray-900">
          Ready to transform your deed workflow?
        </span>
        <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
          Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
  
  // Return static if user prefers reduced motion
  if (shouldReduceMotion) return content;
  
  // Return animated if motion is OK
  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }} 
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 p-4 z-50 shadow-xl"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-sm font-medium text-gray-900">
          Ready to transform your deed workflow?
        </span>
        <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
          Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
```

**Usage in main page**:
```typescript
// Place sentinel at ~33% of content
<div ref={sentinelRef} className="h-px" aria-hidden="true" />

// At end of page
<StickyCta />
```

**Performance**: 
- IntersectionObserver (not scroll handler - more performant)
- prefers-reduced-motion check
- Backdrop blur with fallback

---

## 🚨 DO / DON'T (ENFORCED)

### **✅ MUST DO**:
1. ✅ **Server Components by default** (mark client islands with 'use client')
2. ✅ **next/image for ALL images** (explicit width/height or fill with constrained wrapper)
3. ✅ **Lazy load heavy sections** (VideoPlayer dynamic import, ApiSnippet optional Suspense)
4. ✅ **Respect prefers-reduced-motion** (render static variant when reduced)
5. ✅ **Semantic HTML** (`<header>`, `<main>`, `<section>` with `aria-label`, `<footer>`)
6. ✅ **Focus management** (visible focus rings, keyboard navigation works)
7. ✅ **Color contrast** (WCAG AA: 4.5:1 for text, 3:1 for large text)
8. ✅ **No layout shift** (set explicit aspect ratios, skeleton loaders)
9. ✅ **Hero uses CSS gradient** (NO heavy background image)
10. ✅ **IntersectionObserver for scroll-triggered components** (not raw scroll handlers)
11. ✅ **Use modern font stack** (ui-sans-serif, SF Pro Display, Segoe UI Variable)
12. ✅ **Tight tracking on headlines** (tracking-tight for modern feel)

### **❌ MUST NOT DO**:
1. ❌ **No external font files** (system font stack ONLY: ui-sans-serif, SF Pro, Segoe UI Variable)
2. ❌ **No autoplay** (user-initiated video only)
3. ❌ **No cookies or trackers** (consent gate required before any analytics)
4. ❌ **No third-party scripts** (except YouTube iframe with youtube-nocookie.com)
5. ❌ **No raw scroll event handlers** (use IntersectionObserver)
6. ❌ **No layout shift** (always set image dimensions)
7. ❌ **No inline styles** (Tailwind classes only)
8. ❌ **No hardcoded px values** (use Tailwind spacing: p-4, mt-6, gap-8)
9. ❌ **No heavy background images** (CSS gradients only)
10. ❌ **No broken imports** (all paths must resolve)

---

## 📊 PERFORMANCE & A11Y (HARD BUDGET)

### **Lighthouse Targets** (MUST MEET):
- **Performance**: ≥ 90
- **Accessibility**: ≥ 95  👈 HIGHER BAR
- **Best Practices**: ≥ 90
- **SEO**: ≥ 90

### **Core Web Vitals** (CRITICAL):
- **LCP** (Largest Contentful Paint): < 2.5s
- **CLS** (Cumulative Layout Shift): < 0.1  👈 NO LAYOUT SHIFT

### **Bundle Size**:
- **JavaScript**: < 150KB (gzipped) per route
- **CSS**: < 50KB (gzipped)
- **Images**: WebP/AVIF, explicit dimensions, < 200KB each

### **Images** (NO LAYOUT SHIFT):
```typescript
// Local assets: set explicit width/height
<Image 
  src="/local-asset.webp" 
  alt="..." 
  width={800} 
  height={600} 
  loading="lazy"
/>

// Background fills: use constrained wrapper
<div className="relative w-full aspect-video">
  <Image src="..." alt="..." fill className="object-cover" />
</div>
```

### **Video** (NO COOKIES, NO AUTOPLAY):
```typescript
// youtube-nocookie.com domain
src="https://www.youtube-nocookie.com/embed/{id}"
// NO autoplay, user-initiated only
```

---

## ♿ ACCESSIBILITY REQUIREMENTS

### **Keyboard Navigation**:
- All interactive elements reachable via Tab
- Logical tab order (top → bottom, left → right)
- Skip links for main content
- Focus indicators visible (blue ring)

### **Screen Reader**:
- All images have descriptive alt text
- Form inputs have associated labels
- Buttons have descriptive text (not just icons)
- ARIA landmarks (`<header role="banner">`, etc.)

### **Color & Contrast**:
- Text: minimum 4.5:1 contrast
- Large text (≥18pt): minimum 3:1 contrast
- Don't rely on color alone for meaning
- Support dark mode (optional, not required)

---

## 🎨 ANIMATION GUIDELINES

### **Entrance Animations** (Framer Motion):
```typescript
// Page load
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.3, delay: 0.1 }}

// Scroll reveal (use Intersection Observer)
const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
<motion.div 
  ref={ref}
  initial={{ opacity: 0, y: 20 }}
  animate={inView ? { opacity: 1, y: 0 } : {}}
/>
```

### **Hover Effects**:
```typescript
// Buttons
hover:brightness-95 transition-all duration-200

// Cards
hover:shadow-lg transition-shadow duration-300

// Links
hover:text-primary transition-colors duration-200
```

### **Reduced Motion**:
```typescript
'use client';
import { useReducedMotion } from 'framer-motion';

export function AnimatedSection({ children }) {
  const shouldReduceMotion = useReducedMotion();
  
  if (shouldReduceMotion) {
    return <div>{children}</div>;
  }
  
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {children}
    </motion.div>
  );
}
```

---

## 📱 RESPONSIVE BREAKPOINTS

```typescript
// Tailwind breakpoints (mobile-first)
sm: 640px   // Small tablets
md: 768px   // Tablets
lg: 1024px  // Laptops
xl: 1280px  // Desktops
2xl: 1536px // Large desktops

// Example usage
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
```

---

## 🎯 OUTPUT

### **Files to Provide**:
1. **app/(marketing)/page.tsx** (Server Component - main landing page)
2. **components/StickyCta.tsx** (Client island - scroll-triggered CTA)
3. **components/VideoPlayer.tsx** (Client island - YouTube embed, dynamic import)
4. **components/ApiSnippet.tsx** (Server Component - code block)

### **Required Notes**:
1. **Performance Notes**:
   - Which sections are lazy-loaded (VideoPlayer, StickyCta)
   - Which image is LCP candidate (likely hero headline text, NOT image)
   - Bundle size estimate
   
2. **A11y Notes**:
   - Semantic landmarks (`<header>`, `<main>`, `<section aria-label="...">`, `<footer>`)
   - ARIA labels on all sections
   - Keyboard coverage (Tab order, focus rings)
   - Color contrast ratios (ensure 4.5:1 for text)

3. **Import Paths**:
   - Ensure all imports resolve (no broken paths)
   - No console warnings

### **Verification Checklist**:
- [ ] All 13 sections included
- [ ] Hero uses CSS gradient (NO background image)
- [ ] VideoPlayer uses youtube-nocookie.com
- [ ] StickyCta uses IntersectionObserver (not scroll handler)
- [ ] prefers-reduced-motion honored in all animations
- [ ] All images have explicit dimensions (NO layout shift)
- [ ] System font stack used (NO external fonts)
- [ ] No cookies/trackers (clean analytics consent gate)
- [ ] All CTAs link to valid paths
- [ ] TypeScript types correct, no errors

---

## 🚀 FINAL CHECKLIST

Before you submit, verify:

- [ ] All 13 sections included
- [ ] Brand colors used correctly (#2563EB, #F26B2B)
- [ ] Shadcn/ui components imported
- [ ] Framer Motion animations with reduced-motion check
- [ ] next/image for all images with proper sizes
- [ ] Mobile-first responsive (tested at 320px, 768px, 1024px)
- [ ] Semantic HTML with ARIA landmarks
- [ ] Keyboard navigation works perfectly
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] No layout shift (set image dimensions)
- [ ] Lazy loading for heavy sections
- [ ] No console errors or warnings
- [ ] TypeScript types correct
- [ ] All CTAs link to correct pages
- [ ] Footer links valid

---

## 💪 LET'S CRUSH THIS!

**Remember**: This is the first impression users get of DeedPro. Make it:
- **Fast** (< 2s LCP)
- **Accessible** (WCAG AA)
- **Beautiful** (Modern, clean, professional)
- **Trustworthy** (Enterprise-ready, secure)

**You got this, V0! Create the best landing page DeedPro has ever had!** 🚀

---

**Generated by**: AI Assistant  
**Date**: October 30, 2025  
**Score**: 10/10 Master Prompt  
**Ready for**: Vercel V0 → Production

