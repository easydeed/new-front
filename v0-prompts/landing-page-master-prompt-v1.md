# Title: DeedPro Landing Page — Production V1.1 (Next.js 15, App Router, Tailwind, shadcn/ui)

**Target**: Vercel V0 AI  
**Date**: October 30, 2025  
**Version**: 1.1 (Production-Ready)  
**Performance Budget**: Lighthouse ≥ 90 (Performance ≥90, Accessibility ≥95, Best Practices ≥90, SEO ≥90)  
**Core Web Vitals**: LCP < 2.5s, CLS < 0.1

---

**⚠️ IMPORTANT FOR UPDATES**: When V0 generates updates to this landing page, refer to **`V0_UPDATE_PROCEDURE_CHECKLIST.md`** in this folder for step-by-step integration instructions.

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
// Professional palette for escrow officers + tech integrations
--primary: #f9f9f9        // Near-white (clean, professional, plenty of white space)
--secondary: #1F2B37      // Dark slate (headers, text, contrast)
--accent-green: #77F2A1   // Fresh mint green (success, CTAs, energy)
--accent-blue: #4F76F6    // Tech blue (links, tech features, trust)
--white: #FFFFFF          // Pure white (maximum breathing room)
--gray-100: #F3F4F6       // Very light gray (subtle sections)
--gray-800: #1F2937       // Dark gray (body text)
--gray-900: #111827       // Near black (headings)

// Semantic colors
--success: #77F2A1        // Mint green (checkmarks, success states)
--tech: #4F76F6           // Tech blue (badges, tech features)
--text-primary: #1F2B37   // Dark slate (main text)
--text-secondary: #6B7280 // Medium gray (secondary text)

// Gradient overlays (for hero, cards)
--gradient-hero: linear-gradient(135deg, #FFFFFF 0%, #f9f9f9 50%, #F3F4F6 100%)
--gradient-accent: linear-gradient(135deg, #77F2A1 0%, #4F76F6 100%)
--gradient-dark: linear-gradient(180deg, #1F2B37 0%, #111827 100%)
```

### **Typography**:
```typescript
// Modern system font stack (heavy weights for impact)
font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, 'SF Pro Display', 
             'Segoe UI Variable', 'Segoe UI', 'Inter var', system-ui, sans-serif

// Font weights (HEAVY fonts on headers as requested)
- Display (hero): font-black (900) - MAXIMUM WEIGHT
- Section Headers: font-extrabold (800) - VERY HEAVY
- Subheadings: font-bold (700) - HEAVY
- Body: font-normal (400) - readable
- Labels: font-semibold (600) - medium weight

// Sizes (generous spacing between lines)
- Hero Headline: text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight
- Section Titles: text-4xl sm:text-5xl font-extrabold tracking-tight
- Subheadings: text-2xl sm:text-3xl font-bold
- Body: text-lg sm:text-xl font-normal leading-relaxed
- Small: text-base font-normal
- Micro: text-sm font-semibold

// Letter spacing
- Headlines: tracking-tight (-0.025em) - tight and impactful
- Body: tracking-normal (0em)
- Generous line height: leading-loose (2) for body text
```

### **Spacing** (GENEROUS - Plenty of breathing room):
```typescript
// Section padding (EXTRA generous as requested)
py-20 sm:py-28 lg:py-36  // More vertical space than usual

// Container (max-width wrapper)
max-w-7xl mx-auto px-6 sm:px-8 lg:px-12  // Extra horizontal padding

// Element spacing (generous gaps everywhere)
gap-8 sm:gap-12 lg:gap-16  // Large gaps between elements
space-y-8 sm:space-y-12    // Vertical rhythm

// Card padding (roomy)
p-8 sm:p-10 lg:p-12

// Grid layouts (breathing room)
grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-12

// Margins between sections
mb-16 sm:mb-20 lg:mb-24
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
- **White/light background** (plenty of white space as requested)
- Grid layout: left (text) + right (**actual deed illustration**)
- Mobile: stack vertically
- Generous padding (py-28 lg:py-36)

**Background** (CRITICAL - Clean white with subtle gradient):
```typescript
<section className="relative overflow-hidden bg-gradient-to-br from-white via-primary to-gray-100">
  {/* Optional: Subtle dot grid pattern for texture */}
  <div className="absolute inset-0 bg-dot-pattern opacity-[0.02]" />
  
  {/* Content container with GENEROUS spacing */}
  <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-28 lg:py-36">
    <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
      {/* Left: Text */}
      {/* Right: Deed illustration */}
    </div>
  </div>
</section>
```

**Content**:
```typescript
// Badge (mint green background, tech blue text)
<Badge className="bg-accent-green/10 text-accent-blue border border-accent-green/20 text-sm font-semibold px-4 py-2">
  Trusted by 500+ Escrow Officers
</Badge>

// Headline (FONT-BLACK - maximum weight as requested, dark slate color)
<h1 className="mt-8 text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight text-secondary leading-[1.1]">
  Create California deeds
  <span className="block mt-3 bg-gradient-to-r from-accent-green to-accent-blue bg-clip-text text-transparent">
    in minutes, not hours.
  </span>
</h1>

// Subheadline (larger text, generous line height)
<p className="mt-8 text-xl sm:text-2xl text-gray-800 max-w-2xl leading-loose">
  DeedPro combines an AI‑assisted wizard, SmartReview, and integrations 
  built for title workflows—so your team ships clean documents on the first pass.
</p>

// CTAs (mint green primary, outline secondary - generous spacing)
<div className="mt-12 flex flex-col sm:flex-row gap-6">
  <Button size="lg" className="bg-accent-green hover:bg-accent-green/90 text-secondary font-bold text-lg px-8 py-6 shadow-xl shadow-accent-green/25">
    Start Creating Deeds <ArrowRight className="ml-2 h-6 w-6" />
  </Button>
  <Button size="lg" variant="outline" className="border-2 border-secondary text-secondary hover:bg-gray-50 font-bold text-lg px-8 py-6">
    Watch 2‑min Demo
  </Button>
</div>

// Trust indicators (below CTAs)
<div className="mt-12 flex items-center gap-8 text-sm text-gray-600">
  <div className="flex items-center gap-2">
    <Check className="h-5 w-5 text-accent-green" />
    <span className="font-medium">No credit card required</span>
  </div>
  <div className="flex items-center gap-2">
    <Check className="h-5 w-5 text-accent-green" />
    <span className="font-medium">Free 14-day trial</span>
  </div>
</div>
```

**Deed Illustration** (right side - ACTUAL DEED VISUAL):
```typescript
<div className="relative">
  {/* Main deed illustration */}
  <div className="relative rounded-2xl bg-white shadow-2xl border-2 border-gray-200 overflow-hidden">
    {/* Deed header bar (gradient) */}
    <div className="h-3 w-full bg-gradient-to-r from-accent-green to-accent-blue" />
    
    {/* Deed content area - realistic deed preview */}
    <div className="p-8 sm:p-12">
      {/* Official-looking header */}
      <div className="text-center mb-8">
        <div className="text-xs font-semibold text-gray-500 tracking-wider uppercase mb-2">
          Recording Requested By
        </div>
        <div className="text-sm font-bold text-secondary">
          DeedPro • Escrow Services
        </div>
      </div>
      
      {/* Deed title */}
      <div className="text-center mb-8 pb-6 border-b-2 border-gray-200">
        <h3 className="text-2xl font-black text-secondary tracking-tight">
          GRANT DEED
        </h3>
        <p className="mt-2 text-xs text-gray-500">
          CALIFORNIA CIVIL CODE § 1092
        </p>
      </div>
      
      {/* Deed body (sample text) */}
      <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
        <p className="font-medium">
          <span className="font-bold text-secondary">GRANTOR:</span> John A. Smith and Jane B. Smith
        </p>
        <p className="font-medium">
          <span className="font-bold text-secondary">GRANTEE:</span> Michael C. Johnson
        </p>
        <p className="text-xs text-gray-600 leading-loose">
          For valuable consideration, receipt of which is hereby acknowledged, 
          Grantor(s) hereby GRANT(S) to Grantee(s) the following described real property...
        </p>
        
        {/* Property description box */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-xs font-semibold text-secondary mb-2">LEGAL DESCRIPTION:</div>
          <div className="text-xs text-gray-600 font-mono">
            LOT 42, TRACT NO. 12345<br />
            IN THE CITY OF LOS ANGELES<br />
            COUNTY OF LOS ANGELES
          </div>
        </div>
      </div>
      
      {/* Signature area */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="text-xs text-gray-500">Signature of Grantor(s)</div>
        <div className="mt-2 h-px bg-gray-300 w-48" />
      </div>
    </div>
    
    {/* "AI Generated" badge overlay */}
    <div className="absolute top-4 right-4">
      <Badge className="bg-accent-blue text-white font-semibold shadow-lg">
        <Sparkles className="h-3 w-3 mr-1" />
        AI Generated
      </Badge>
    </div>
  </div>
  
  {/* Floating accent elements */}
  <div className="absolute -top-6 -right-6 w-32 h-32 bg-accent-green/20 rounded-full blur-3xl" />
  <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-accent-blue/20 rounded-full blur-3xl" />
</div>
```

**Performance**:
- Light background (fast render)
- Deed illustration: Pure HTML/CSS (no image loading)
- LCP candidate: Headline text
- No layout shift (explicit dimensions)

---

### **2. STATS BAR**

**Layout**:
- **Pure white background** (plenty of white space)
- Subtle border top/bottom (border-gray-200)
- Grid: 4 columns on desktop, 2 on mobile
- Each stat: Large number + icon + label
- **Generous padding** (py-20)

**Content**:
```typescript
const stats = [
  { icon: FileDigit, label: 'Deeds Generated', value: '25,000+', color: 'text-accent-green' },
  { icon: Check, label: 'Accuracy Rate', value: '99.9%', color: 'text-accent-blue' },
  { icon: Clock, label: 'Time Saved', value: '45 min', color: 'text-accent-green' },
  { icon: Shield, label: 'Compliance', value: '100%', color: 'text-accent-blue' },
]

// Section wrapper (generous spacing)
<section className="py-20 bg-white border-y border-gray-200">
  <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-12">
      {stats.map((stat) => (
        <div key={stat.label} className="text-center">
          {/* Big number first (font-black as requested) */}
          <div className="text-5xl sm:text-6xl font-black text-secondary mb-3">
            {stat.value}
          </div>
          
          {/* Icon + Label (stacked, generous spacing) */}
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <stat.icon className={`h-5 w-5 ${stat.color}`} />
            <span className="text-base font-semibold">{stat.label}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
</section>
```

**Performance**: Static content, no lazy loading needed

---

### **3. API / INTEGRATIONS SECTION** (Server Component)

**Layout**:
- **Dark slate background** (#1F2B37) for contrast
- Grid: left (text) + right (integration logos or code snippet)
- Mobile: stack vertically
- **Generous padding** (py-28)

**Content** (Tech Integration Focus):
```typescript
<section aria-label="Integrations" className="py-28 bg-secondary">
  <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
    <div className="grid lg:grid-cols-2 gap-16 items-center">
      {/* Left side */}
      <div>
        {/* Badge */}
        <Badge className="bg-accent-blue/10 text-accent-blue border border-accent-blue/20 text-sm font-semibold px-4 py-2 mb-6">
          <Zap className="h-4 w-4 mr-2" />
          API & Integrations
        </Badge>
        
        {/* Title (font-extrabold, white text) */}
        <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-6">
          One API call.<br />
          Instant deed generation.
        </h2>
        
        {/* Description (larger, generous line height) */}
        <p className="text-xl text-gray-300 leading-loose mb-8">
          Integrate DeedPro into your existing workflow. Works seamlessly with 
          SoftPro, Qualia, and all major title software platforms.
        </p>
        
        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button className="bg-accent-green hover:bg-accent-green/90 text-secondary font-bold px-6 py-3">
            View API Docs
          </Button>
          <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 font-bold px-6 py-3">
            Explore Integrations
          </Button>
        </div>
        
        {/* Trust badges */}
        <div className="mt-12 grid grid-cols-2 gap-6">
          <div>
            <div className="text-3xl font-black text-accent-green mb-2">99.9%</div>
            <div className="text-sm text-gray-400">API Uptime</div>
          </div>
          <div>
            <div className="text-3xl font-black text-accent-blue mb-2">&lt;200ms</div>
            <div className="text-sm text-gray-400">Avg Response</div>
          </div>
        </div>
      </div>
      
      {/* Right side: Integration logos or code snippet */}
      <div>
        {/* Integration logos grid */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-10">
          <div className="text-sm font-semibold text-gray-400 mb-8 text-center">
            TRUSTED INTEGRATIONS
          </div>
          <div className="grid grid-cols-2 gap-8 items-center">
            {/* Placeholder for integration logos */}
            {['SoftPro', 'Qualia', 'RamQuest', 'ResWare'].map((name) => (
              <div key={name} className="bg-white/10 rounded-xl p-6 text-center">
                <div className="text-lg font-bold text-white">{name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
```

**Performance**: 
- Dark background for visual contrast
- Static content (fast render)

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
- **Pure white background** (maximum breathing room)
- Grid: 3 columns on desktop, 1 column on mobile
- Each card: Large icon + heavy title + description
- **Generous spacing** (py-28, gap-12)

**Content**:
```typescript
const features = [
  { 
    icon: Wand2, 
    title: 'AI-Powered Wizard',
    description: 'Clean, accessible forms with inline validation. Less friction, fewer do-overs.',
    accent: 'accent-green'
  },
  { 
    icon: Shield, 
    title: 'CA Compliance Built-in',
    description: 'All 58 counties supported with up-to-date recording requirements and formatting.',
    accent: 'accent-blue'
  },
  { 
    icon: Zap, 
    title: 'Instant Integrations',
    description: 'SoftPro, Qualia, and major title software. Fits your existing workflow seamlessly.',
    accent: 'accent-green'
  },
]

// Section wrapper (generous spacing, clean white)
<section className="py-28 bg-white">
  <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
    {/* Section header (font-extrabold as requested) */}
    <div className="text-center mb-20">
      <h2 className="text-4xl sm:text-5xl font-extrabold text-secondary tracking-tight mb-6">
        Everything you need to create deeds faster
      </h2>
      <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-loose">
        Built for escrow officers, loved by title companies. Trusted integrations for seamless workflow.
      </p>
    </div>
    
    {/* Feature grid (generous spacing) */}
    <div className="grid md:grid-cols-3 gap-12">
      {features.map((feature) => (
        <div key={feature.title} className="group">
          {/* Icon (large, colored background) */}
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${
            feature.accent === 'accent-green' 
              ? 'bg-accent-green/10' 
              : 'bg-accent-blue/10'
          } mb-6 group-hover:scale-110 transition-transform`}>
            <feature.icon className={`h-8 w-8 ${
              feature.accent === 'accent-green' 
                ? 'text-accent-green' 
                : 'text-accent-blue'
            }`} />
          </div>
          
          {/* Title (font-extrabold as requested) */}
          <h3 className="text-2xl font-extrabold text-secondary mb-4">
            {feature.title}
          </h3>
          
          {/* Description (larger text, generous line height) */}
          <p className="text-lg text-gray-600 leading-loose">
            {feature.description}
          </p>
        </div>
      ))}
    </div>
  </div>
</section>
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
- **Pure white background** (plenty of space)
- 3 pricing cards (Starter, Professional, Enterprise)
- Middle card highlighted with mint green accent
- **Generous spacing** (py-28, gap-8)

**Content**:
```typescript
const tiers = [
  { 
    name: 'Starter', 
    price: '$0', 
    period: 'forever',
    features: ['5 deeds/month', 'Email support', 'Basic templates', 'All deed types'],
    cta: 'Start Free',
    popular: false
  },
  { 
    name: 'Professional', 
    price: '$149', 
    period: '/month',
    features: ['Unlimited deeds', 'Priority support', 'API access', 'Custom branding', 'SoftPro & Qualia integration'],
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

// Section wrapper (generous spacing, clean white)
<section className="py-28 bg-white">
  <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
    {/* Section header (font-extrabold) */}
    <div className="text-center mb-20">
      <h2 className="text-4xl sm:text-5xl font-extrabold text-secondary tracking-tight mb-6">
        Simple pricing for every team
      </h2>
      <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-loose">
        Start free, scale as you grow. No hidden fees, cancel anytime.
      </p>
    </div>
    
    {/* Pricing grid (generous spacing between cards) */}
    <div className="grid md:grid-cols-3 gap-8">
      {tiers.map((tier) => (
        <Card 
          key={tier.name}
          className={`${
            tier.popular 
              ? 'ring-4 ring-accent-green border-accent-green shadow-2xl scale-105' 
              : 'border-gray-200'
          } transition-all hover:shadow-xl`}
        >
          <CardContent className="p-10">
            {/* Popular badge */}
            {tier.popular && (
              <Badge className="bg-accent-green text-secondary font-bold mb-6 px-3 py-1">
                Most Popular
              </Badge>
            )}
            
            {/* Tier name (font-extrabold) */}
            <h3 className="text-2xl font-extrabold text-secondary">{tier.name}</h3>
            
            {/* Price (font-black) */}
            <div className="mt-6 mb-8">
              <span className="text-5xl font-black text-secondary">{tier.price}</span>
              <span className="text-lg text-gray-600">{tier.period}</span>
            </div>
            
            {/* Features (generous spacing) */}
            <ul className="space-y-4 mb-10">
              {tier.features.map(f => (
                <li key={f} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-accent-green flex-shrink-0 mt-0.5" />
                  <span className="text-base text-gray-700">{f}</span>
                </li>
              ))}
            </ul>
            
            {/* CTA button */}
            <Button 
              className={`w-full font-bold text-base py-6 ${
                tier.popular 
                  ? 'bg-accent-green hover:bg-accent-green/90 text-secondary' 
                  : 'bg-secondary hover:bg-secondary/90 text-white'
              }`}
            >
              {tier.cta}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
</section>
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

