# MASTER V0 PROMPT — Dashboard (Phase 24‑B)

**Target:** Vercel V0
**Goal:** Design a modern, user‑centric **Dashboard** UI for DeedPro with significant creative freedom **without changing any business logic**.

## 0) Context & Constraints (read carefully)
- This UI replaces the *presentation only* for our signed‑in dashboard.
- **Do not modify authentication or data fetching.**
- **Do not rename props, functions, or endpoints.**
- **Keep all redirects and localStorage keys intact.**
- You may change layout, spacing, animation, micro‑interactions, and component composition.

### Functional Contracts (must remain 100% intact)
```ts
// Data sources (MUST keep)
GET /users/profile         // verifies token
GET /deeds/summary         // -> { total, completed, in_progress, month }
GET /deeds                 // -> array (recent deeds)

// LocalStorage keys (MUST keep)
'access_token'             // JWT token
'deedWizardDraft'          // wizard draft

// Required UI regions (MUST keep in some form)
- Sidebar (collapsible)
- Four stat cards: Total, In Progress, Completed, This Month
- Resume Draft banner (visible only if deedWizardDraft exists)
- Recent Activity table (5 most recent deeds)
- “Create Deed” primary CTA
```

### Visual Language & Tokens (you propose usage; colors are fixed)
Create tokens and apply them via Tailwind classes or CSS variables:
```
--surface:  #F9F9F9
--ink:      #1F2B37
--accent-1: #7C4DFF   /* primary accent */
--accent-2: #4F76F6   /* secondary accent */
--success:  #10B981
--error:    #EF4444
```
- Light theme. Calm, modern “Tech Vibrance” feel with **subtle motion**.
- Section transitions should feel smooth and cohesive.
- Respect `prefers-reduced-motion`.

### Accessibility & Performance
- WCAG 2.1 AA contrast.
- No layout shift (size images, skeletons for loads).
- next/image for any images. Avoid heavy assets.
- Clean keyboard traversal.

## 1) What to deliver
1. **`DashboardV0` React component** (TypeScript, Tailwind) that receives the **same data** our current page computes.
2. **Stat cards, Resume Draft banner, Recent table** with improved composition & micro‑interactions.
3. **Skeleton/loading** states for summary + table.
4. **Empty states** for no deeds and no draft.
5. **Responsive**: single column on small screens; 12‑column grid suggestions for ≥ lg.

## 2) Component Contract (keep props exactly as declared)
```ts
type Summary = { total: number; completed: number; in_progress: number; month: number; }
type DeedItem = { id: number; deed_type: string; address: string; created_at: string; status: 'draft'|'in_progress'|'completed' }

interface DashboardProps {
  summary: Summary | null           // null while loading
  recent: DeedItem[] | null         // null while loading
  hasDraft: boolean
  onCreateDeed: () => void          // navigate to /create-deed
  onResumeDraft: () => void         // navigate to /create-deed
  sidebar: React.ReactNode          // we inject our existing sidebar (collapsible logic remains)
}
```
**Do not add/remove/rename fields.** If you need internal state, add it **inside** the component, not to props.

## 3) Layout Guidance (you can innovate)
- A welcoming header that uses the user’s email (we provide it via profile in the parent; you can accept it as a `children` slot).
- Stat cards should be tactile with soft elevation, interactive hover, and subtle entrance animation.
- Recent table: include status chips, deed type, address, timestamp; row hover affordance + “Open” action.
- Resume Draft banner: compact, non‑intrusive, but visually distinct; includes “Continue” CTA.

## 4) Motion Guidelines
- Section reveals on scroll (IntersectionObserver) with modest translation/opacity.
- Respect reduced‑motion.
- Keep animation curve snappy but not flashy.

## 5) Output format
Provide a single `DashboardV0.tsx` React component + any tiny utility components you need in the same file (or clearly mark file boundaries). Use Tailwind classes. Avoid global CSS.
