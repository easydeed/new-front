# 🎨 PHASE 24-D: V0 WIZARD REDESIGN - MASTER PLAN

**Status**: 🟢 IN PROGRESS  
**Started**: November 1, 2025  
**Goal**: Redesign Modern Wizard with V0 AI (beautiful UI, same functionality)  
**Approach**: Feature flags + A/B testing + data-driven rollout

---

## 🎯 **OBJECTIVE**

Redesign the Modern Wizard UI using Vercel V0 AI while:
- ✅ Preserving all existing functionality (no regressions)
- ✅ Using feature flags for safe rollout
- ✅ Measuring improvement via telemetry (Phase 24-C)
- ✅ Achieving a more polished, professional UI

---

## 📊 **SUCCESS CRITERIA**

**Phase 24-D is COMPLETE when**:
- ✅ All 5 wizard components redesigned with V0
- ✅ Feature flag system implemented
- ✅ V0 wizard works end-to-end (property search → PDF)
- ✅ A/B testing shows improvement over baseline:
  - Completion rate increases (target: +10%)
  - Average duration decreases (target: -20%)
  - Error rate stays same or lower
  - User feedback positive
- ✅ Gradual rollout complete (10% → 50% → 100%)

---

## 🏗️ **ARCHITECTURE**

### **Current State** (Phase 24-C):
```
WizardHost
├── PropertyStepBridge (property search)
└── ModernEngine (Q&A flow)
    ├── ProgressBar
    ├── MicroSummary
    ├── PrefillCombo (input fields)
    └── SmartReview (final review)
```

### **Target State** (Phase 24-D):
```
WizardHost (with feature flag)
├── IF flag=false: Current wizard (Phase 24-C)
└── IF flag=true: ModernWizardV0
    ├── PropertySearchV0 (redesigned)
    └── ModernEngineV0 (redesigned)
        ├── ProgressIndicatorV0 (redesigned)
        ├── MicroSummaryV0 (redesigned)
        ├── StepCardV0 (redesigned input fields)
        └── SmartReviewV0 (redesigned review)
```

### **Feature Flag Logic**:
```typescript
// Environment variable controls rollout percentage
NEXT_PUBLIC_V0_ROLLOUT=10  // 10% of users see V0

// In WizardHost.tsx
const shouldShowV0 = () => {
  const rolloutPercent = process.env.NEXT_PUBLIC_V0_ROLLOUT || 0;
  const randomValue = Math.random() * 100;
  return randomValue < rolloutPercent;
};

if (shouldShowV0()) {
  return <ModernWizardV0 docType={docType} />;
} else {
  return <ModernEngine docType={docType} />; // Current
}
```

---

## 🎨 **COMPONENTS TO REDESIGN**

### **1. PropertySearchV0** (Step 1: Property Search)
**Current**: `PropertySearchWithTitlePoint.tsx` (681 lines, refactored in Phase 24-C)

**V0 Improvements**:
- Larger, more prominent address input
- Better autocomplete dropdown (cards instead of plain list)
- Beautiful property details card with icons
- Smooth loading states (skeleton UI)
- Better error states (illustrations + retry)
- Modern spacing (8px grid, generous padding)

**Design Inspiration**: Airbnb search, Zillow property search

---

### **2. StepCardV0** (Step 2+: Q&A Flow)
**Current**: `ModernEngine.tsx` with inline rendering

**V0 Improvements**:
- Large, card-based question layout
- Better input fields (floating labels, icons, validation)
- Smooth transitions between questions
- Tactile button interactions (hover states, animations)
- Better prefill UI (suggestions as pills/badges)
- Modern typography (larger, clearer)

**Design Inspiration**: Typeform, Google Forms, Linear

---

### **3. ProgressIndicatorV0** (Navigation)
**Current**: `ProgressBar.tsx` (simple bar)

**V0 Improvements**:
- Step breadcrumbs with labels
- Animated progress between steps
- Click to jump to completed steps
- Current step highlighting
- Mobile-friendly (stacked on small screens)

**Design Inspiration**: Stripe checkout, Shopify checkout

---

### **4. SmartReviewV0** (Final Review)
**Current**: `SmartReview.tsx` (functional but basic)

**V0 Improvements**:
- Grouped review sections (property, parties, legal)
- Inline edit buttons (no full page navigation)
- Expandable/collapsible sections
- Visual hierarchy (important fields prominent)
- Clear CTA button ("Generate Deed" with icon)

**Design Inspiration**: Notion, Linear task view

---

### **5. MicroSummaryV0** (Persistent Summary)
**Current**: `MicroSummary.tsx` (basic data display)

**V0 Improvements**:
- Sticky sidebar on desktop (always visible)
- Compact cards on mobile
- Icons for each field
- Color-coded status (verified, pending, error)
- Smooth updates when data changes

**Design Inspiration**: Sidebar in Notion, GitHub PR sidebar

---

## 📋 **EXECUTION PLAN (STEP-BY-STEP)**

### **PREP PHASE** (Steps 1-4): Setup Infrastructure
- [x] **Step 1**: Create Phase 24-D Master Plan (this document)
- [ ] **Step 2**: Create V0 prompts for all 5 components
- [ ] **Step 3**: Set up feature flag system
- [ ] **Step 4**: Create `phase24-d` directory structure

### **V0 GENERATION PHASE** (Steps 5-9): Generate Components
- [ ] **Step 5**: Generate PropertySearchV0 with V0 AI
- [ ] **Step 6**: Generate StepCardV0 with V0 AI
- [ ] **Step 7**: Generate ProgressIndicatorV0 with V0 AI
- [ ] **Step 8**: Generate SmartReviewV0 with V0 AI
- [ ] **Step 9**: Generate MicroSummaryV0 with V0 AI

### **IMPLEMENTATION PHASE** (Steps 10-12): Integration
- [ ] **Step 10**: Implement ModernWizardV0 wrapper component
- [ ] **Step 11**: Wire up feature flag routing in WizardHost
- [ ] **Step 12**: Test V0 wizard flow end-to-end

### **ROLLOUT PHASE** (After Step 12): Gradual Deployment
- [ ] **Step 13**: Deploy with 0% rollout (shadow mode for testing)
- [ ] **Step 14**: Enable 10% rollout (measure telemetry)
- [ ] **Step 15**: Compare metrics vs. baseline (1 week)
- [ ] **Step 16**: If positive → 50% rollout
- [ ] **Step 17**: If still positive → 100% rollout
- [ ] **Step 18**: Document results, deprecate old UI

---

## 🎨 **DESIGN SYSTEM**

### **Colors** (Consistent with Phase 24-B):
- **Primary**: Purple `#7C4DFF` (buttons, highlights)
- **Secondary**: Blue `#4F76F6` (links, info)
- **Success**: Green `#10B981` (verified states)
- **Warning**: Amber `#F59E0B` (warnings)
- **Error**: Red `#EF4444` (errors)
- **Neutral**: Gray scale (text, borders, backgrounds)

### **Typography**:
- **Headings**: `font-semibold` or `font-bold`, large sizes (text-2xl, text-3xl)
- **Body**: `font-normal`, readable sizes (text-base, text-lg)
- **Labels**: `font-medium`, uppercase with tracking (text-xs, text-sm)

### **Spacing** (Tailwind):
- Use 8px grid: `space-2` (8px), `space-4` (16px), `space-6` (24px), `space-8` (32px)
- Generous padding in cards: `p-6` or `p-8`
- Consistent gaps: `gap-4` or `gap-6`

### **Components** (Shadcn/ui):
- Use Shadcn components where possible
- Customize with Tailwind classes
- Maintain consistent interaction patterns

### **Animations**:
- Smooth transitions: `transition-all duration-200`
- Respect `prefers-reduced-motion`
- Use Framer Motion for complex animations
- Hover states on interactive elements

---

## 🧪 **TESTING STRATEGY**

### **Manual Testing** (Each Component):
1. Visual inspection (looks polished?)
2. Responsive design (mobile, tablet, desktop)
3. Keyboard navigation (Tab, Enter, Escape)
4. Screen reader (ARIA labels)
5. Dark mode (if applicable)
6. Error states (validation, API failures)
7. Loading states (skeleton UI)

### **Integration Testing** (Full Flow):
1. Property search → enrichment → Q&A → review → PDF
2. All 5 deed types (grant, quitclaim, interspousal, warranty, tax)
3. Draft save/resume
4. Browser back/forward
5. Page refresh (state persistence)

### **A/B Testing Metrics**:
- **Completion Rate**: % who reach "Generate Deed"
- **Average Duration**: Time from start to completion
- **Error Rate**: % of sessions with errors
- **Bounce Rate**: % who leave before completing
- **User Feedback**: Qualitative feedback (if available)

---

## 🔄 **ROLLBACK PLAN**

### **If Issues Found**:
1. **Immediate**: Set `NEXT_PUBLIC_V0_ROLLOUT=0` (disable V0)
2. **Deploy**: Push to production (Vercel auto-deploys)
3. **Investigate**: Check telemetry for error patterns
4. **Fix**: Address issues in V0 components
5. **Re-enable**: Gradual rollout again (10% → 50% → 100%)

### **Rollback Triggers**:
- ❌ Error rate >10% (vs. <5% baseline)
- ❌ Completion rate drops >20%
- ❌ Critical bug (wizard won't load, PDF generation fails)
- ❌ Negative user feedback (multiple reports)

---

## 📅 **TIMELINE**

### **Week 1** (Nov 1-8): Prep + V0 Generation
- Day 1: Setup infrastructure (Steps 1-4)
- Day 2-3: Generate PropertySearchV0 + StepCardV0 (Steps 5-6)
- Day 4-5: Generate ProgressIndicatorV0 + SmartReviewV0 (Steps 7-8)
- Day 6: Generate MicroSummaryV0 (Step 9)
- Day 7: Buffer/refinement

### **Week 2** (Nov 8-15): Implementation + Testing
- Day 8-10: Implement ModernWizardV0 wrapper (Step 10)
- Day 11-12: Wire up feature flag routing (Step 11)
- Day 13-14: Test V0 wizard end-to-end (Step 12)

### **Week 3** (Nov 15-22): Rollout + Monitoring
- Day 15: Deploy with 10% rollout (Step 14)
- Day 16-21: Monitor telemetry, compare metrics (Step 15)
- Day 22: Decision point (rollout more or iterate)

### **Week 4** (Nov 22-29): Full Rollout or Iteration
- If positive: 50% → 100% rollout (Steps 16-17)
- If issues: Iterate based on data
- Document results (Step 18)

---

## 📊 **TELEMETRY INTEGRATION**

### **New Events to Track** (Phase 24-D):
```typescript
// Track which wizard version user sees
trackWizardEvent('Wizard.VersionShown', { version: 'v0' or 'current' });

// Track user interactions with V0 components
trackWizardEvent('V0.PropertySearch.Autocomplete', { resultsShown: 3 });
trackWizardEvent('V0.StepCard.InputFocused', { field: 'grantorName' });
trackWizardEvent('V0.SmartReview.SectionExpanded', { section: 'property' });

// Track completion by version
trackWizardEvent('Wizard.Completed', { 
  version: 'v0',
  durationV0: 120, 
  deedType: 'grant_deed' 
});
```

### **Analysis**:
After 1 week of A/B testing:
```javascript
// Compare metrics by version
const v0Sessions = events.filter(e => e.data.version === 'v0');
const currentSessions = events.filter(e => e.data.version === 'current');

const v0CompletionRate = calculateCompletionRate(v0Sessions);
const currentCompletionRate = calculateCompletionRate(currentSessions);

console.log('V0 Improvement:', v0CompletionRate - currentCompletionRate);
```

---

## 🎯 **NEXT IMMEDIATE STEPS**

**Right Now** (Step 1): ✅ Master Plan created (this document)

**Next** (Step 2): Create V0 prompts for all 5 components

**Then** (Step 3): Set up feature flag system

**Let's go, Champ!** 🚀

---

## 📞 **RESOURCES**

- **Vercel V0**: https://v0.dev
- **Shadcn/ui**: https://ui.shadcn.com
- **Tailwind CSS**: https://tailwindcss.com
- **Framer Motion**: https://www.framer.com/motion
- **Phase 24-C Plan**: `phasec-rethink/01_MASTER_PLAN.md`
- **Telemetry System**: `frontend/src/lib/telemetry.ts`

---

**Ready to execute, step-by-step!** 💪

