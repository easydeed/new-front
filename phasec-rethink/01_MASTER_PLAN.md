# 📋 **PHASE 24-C MASTER PLAN - 9.5/10 EDITION**

**Version**: 2.0  
**Score**: 9.5/10 (Championship-ready!)  
**Date**: October 31, 2025  

---

## 🎯 **EXECUTIVE SUMMARY**

### **The Mission**
Redesign the Modern Wizard with beautiful V0 UI while preserving 100% of business logic.

### **The Approach**
1. **Clean first** (Prep Phase: remove technical debt)
2. **Redesign second** (V0 Phase: UI only, no logic changes)
3. **Deploy gradually** (Rollout: 5% → 100% with monitoring)

### **The Commitment**
- ✅ Zero functional regressions
- ✅ Zero data loss
- ✅ Easy rollback (< 17 minutes)
- ✅ Data-driven decisions (telemetry)

---

## 🏗️ **THE THREE PHASES**

### **PHASE 24-C-PREP: Foundation** (6-8 hours)

**Goal**: Clean codebase before adding new code

**Tasks**:
1. ✅ Delete backup files (`.bak.*`, `backup`, etc.)
2. ✅ Remove 90% of console.logs (replace with proper tracking)
3. ✅ Remove component duplication (SmartReview in 3 places)
4. ✅ Split PropertySearch (1,025 lines → 5 files)
5. ✅ Delete Classic Wizard (commit to Modern only)
6. ✅ Add telemetry to existing wizard (capture baseline)

**Why This Matters**:
- Can't polish a mess - clean first!
- Smaller components = easier V0 redesign
- Baseline metrics = know if V0 is better

**Deliverable**: Clean codebase ready for V0 integration

---

### **PHASE 24-C: V0 Redesign** (8-12 hours)

**Goal**: Generate and integrate V0 UI components

**Tasks**:
1. ✅ Create V0 prompts (with actual code snippets)
2. ✅ Generate V0 components (PropertySearch, StepCard, SmartReview, Progress, Forms)
3. ✅ Integrate behind feature flag (`NEW_WIZARD_MODERN_V0`)
4. ✅ Write Playwright E2E tests (all 5 deed types)
5. ✅ Manual QA (mobile, keyboard, error states)
6. ✅ Performance check (Lighthouse, bundle size)

**Why This Matters**:
- UI-only changes = low risk
- Feature flag = instant rollback
- Comprehensive tests = catch regressions

**Deliverable**: Modern Wizard with V0 UI, fully tested

---

### **PHASE 24-C-ROLLOUT: Gradual Deployment** (1 week)

**Goal**: Deploy safely with continuous monitoring

**Timeline**:
- Day 1-2: Internal team (flag ON for staff)
- Day 3: 5% of users
- Day 4: 25% of users
- Day 5: 50% of users
- Day 6: 75% of users
- Day 7: 100% of users

**Monitoring**:
- Completion rate (target: +5%)
- Avg time (target: -10%)
- Error rate (target: -20%)
- PDF success (target: 100%)

**Auto-Rollback Triggers**:
- Error rate > 5% → Auto-disable
- Completion rate drops > 10% → Alert
- Zero PDFs in 10 min → Alert

**Deliverable**: V0 wizard serving 100% of users

---

## 📊 **END STATE CLARITY**

### **Current State** (Before Phase 24-C):
```
/create-deed/[docType] → Classic Wizard (383 lines, inline styles)
/create-deed → Modern Wizard (Original, working but old UI)
```

### **After Phase 24-C-PREP**:
```
/create-deed → Modern Wizard (Original, CLEANED, baseline metrics captured)
Classic Wizard: DELETED ❌
```

### **After Phase 24-C**:
```
/create-deed → Modern Wizard V0 (Beautiful UI, feature flag OFF)
Toggle flag ON: Modern Wizard V0 (Beautiful UI)
```

### **After Phase 24-C-ROLLOUT**:
```
/create-deed → Modern Wizard V0 (Beautiful UI, 100% of users)
Classic Wizard: Gone forever ❌
Modern Original: Replaced by V0 ✅
```

---

## 🔧 **TECHNICAL ARCHITECTURE**

### **Component Strategy**

**Before** (Current):
```
PropertySearchWithTitlePoint.tsx (1,025 lines)
├── Google Places API logic
├── SiteX enrichment logic
├── Autocomplete UI
├── Results display
└── Error handling
```

**After Prep** (Split):
```
hooks/
├── useGooglePlaces.ts (150 lines - API logic)
└── useSiteXEnrichment.ts (100 lines - enrichment logic)

components/
├── PropertySearchContainer.tsx (150 lines - orchestration)
│   └── <PropertySearchV0 {...props} /> (UI wrapper)
├── PropertySearchInput.tsx (80 lines - input UI)
├── PropertySearchDropdown.tsx (80 lines - suggestions UI)
└── PropertySearchResults.tsx (80 lines - enriched data display)
```

**After V0** (Beautiful):
```
All components get V0 styling:
├── Tailwind classes (no inline styles)
├── Modern spacing (8/12px grid)
├── Consistent colors (purple #7C4DFF, blue #4F76F6)
├── Smooth animations (respect prefers-reduced-motion)
└── Accessible (WCAG AA, keyboard navigation)
```

---

## 🧪 **TESTING STRATEGY**

### **Unit Tests** (Jest)
```typescript
// Test adapters preserve data
test('grantDeedAdapter preserves all fields', () => {
  const input = { grantorName: 'John', granteeName: 'Jane', ... };
  const output = grantDeedAdapter(input);
  expect(output.grantor_name).toBe('John');
  expect(output.grantee_name).toBe('Jane');
});
```

### **E2E Tests** (Playwright)
```typescript
// Test full wizard flow
test('Grant Deed - Address to PDF', async ({ page }) => {
  await page.goto('/create-deed');
  await page.fill('[data-testid="property-search"]', '1358 5th St');
  await page.click('[data-testid="suggestion-0"]');
  await expect(page.locator('[data-testid="apn"]')).toContainText(/\d+/);
  // ... complete wizard ...
  await page.click('[data-testid="finalize"]');
  await expect(page).toHaveURL('/dashboard');
});
```

### **Manual QA Checklist**
- [ ] All 5 deed types generate PDFs
- [ ] SiteX enrichment works (APN, county, legal, grantor)
- [ ] Partners dropdown populates
- [ ] Draft save/resume works
- [ ] Mobile responsive (320px, 375px, 768px)
- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] Screen reader friendly (ARIA labels)
- [ ] Error states display correctly
- [ ] Loading states show progress

---

## 📈 **TELEMETRY & METRICS**

### **Events to Track**

```typescript
// Wizard lifecycle
trackWizardEvent('Wizard.Started', { mode: 'modern', deedType });
trackWizardEvent('Wizard.PropertySearched', { address });
trackWizardEvent('Wizard.PropertyEnriched', { apn, county, hasLegal });
trackWizardEvent('Wizard.StepShown', { step: 1, stepName: 'PropertySearch' });
trackWizardEvent('Wizard.StepCompleted', { step: 1, duration: 45 });
trackWizardEvent('Wizard.DraftSaved', { step: 3 });
trackWizardEvent('Wizard.DraftResumed', { step: 3 });
trackWizardEvent('Wizard.Error', { step: 2, error: 'Invalid input', field: 'granteeName' });
trackWizardEvent('Wizard.Abandoned', { step: 4, timeSpent: 120 });
trackWizardEvent('Wizard.Completed', { deedType, totalDuration: 180, stepsCompleted: 5 });
trackWizardEvent('Wizard.PDFGenerated', { deedType, fileSize: 45000 });
```

### **Baseline Metrics** (Capture in Prep Phase)

**Before V0**:
- Wizard completion rate: ___%
- Average time to complete: ___ minutes
- Error rate: ___%
- Abandonment rate: ___%
- PDF generation success: ___%
- Mobile completion rate: ___%

**After V0** (Target):
- Wizard completion rate: +5%
- Average time to complete: -10%
- Error rate: -20%
- Abandonment rate: -15%
- PDF generation success: 100%
- Mobile completion rate: +10%

---

## 🚨 **ROLLBACK PLAN**

### **Rollback SLA: < 17 Minutes**

**Detection**: < 5 minutes (error monitoring)
**Decision**: < 10 minutes (check telemetry dashboard)
**Execution**: < 2 minutes (flip feature flag)

### **Level 1: Feature Flag** (< 2 min)
```typescript
// frontend/src/config/featureFlags.ts
NEW_WIZARD_MODERN_V0: false  // ← Flip to false
```

### **Level 2: Vercel Redeploy** (< 5 min)
```bash
# If flag toggle doesn't work
git revert <last-commit-sha>
git push origin main
# Vercel auto-deploys
```

### **Level 3: Database Rollback** (N/A)
No database changes in this phase - UI only!

### **Auto-Rollback Triggers**
- Error rate > 5% in last 10 min → Auto-disable flag
- Completion rate drops > 10% vs baseline → Alert + Manual review
- Zero PDF generations in 10 min → Alert
- Telemetry events stop → Alert (system issue)

### **Rollback Authority**
- **Who**: Admin + Lead Dev only
- **How**: Vercel dashboard → Environment Variables → `NEW_WIZARD_MODERN_V0=false`
- **Communication**: Slack `#deedpro-deployments`
- **Post-Mortem**: Within 2 hours of rollback

---

## ✅ **ACCEPTANCE CRITERIA**

### **Functionality** (Non-Negotiable)
- [ ] All 5 deed types generate PDFs (Grant, Quitclaim, Interspousal, Warranty, Tax)
- [ ] SiteX enrichment works (APN, County, Legal Description, Grantor)
- [ ] Partners dropdown populates
- [ ] Draft save works (localStorage)
- [ ] Draft resume works (banner + correct step)
- [ ] Session clearing works (after finalization)
- [ ] Redirect to dashboard works (after PDF generation)
- [ ] Canonical adapters preserve all fields

### **Performance**
- [ ] LCP < 2.5s on wizard entry
- [ ] No console errors in production
- [ ] Lighthouse Performance ≥ 90
- [ ] Bundle size increase < 50KB

### **Accessibility**
- [ ] Lighthouse A11y ≥ 95
- [ ] Keyboard-navigable (Tab, Enter, Escape)
- [ ] Focus rings visible
- [ ] Labels mapped to inputs (aria-labelledby)
- [ ] Error messages linked (aria-describedby)
- [ ] Screen reader announcements (aria-live)
- [ ] Respects prefers-reduced-motion

### **UI/UX**
- [ ] Mobile responsive (320px, 375px, 768px, 1024px)
- [ ] Consistent spacing (8/12px grid)
- [ ] Modern colors (purple #7C4DFF, blue #4F76F6)
- [ ] Smooth animations (where appropriate)
- [ ] Loading states clear
- [ ] Error states helpful
- [ ] Empty states friendly

### **Telemetry**
- [ ] All wizard events tracked
- [ ] Baseline metrics captured
- [ ] Comparison dashboard created
- [ ] Alert thresholds configured

---

## 📁 **DELIVERABLES**

### **Prep Phase**:
- [ ] Backup files deleted
- [ ] Console.logs removed (90%)
- [ ] Component duplication removed
- [ ] PropertySearch split (5 files)
- [ ] Classic Wizard deleted
- [ ] Telemetry implemented
- [ ] Baseline metrics captured (1 week)

### **V0 Phase**:
- [ ] V0 prompts created (with real code)
- [ ] 5 V0 components generated
- [ ] Feature flag implemented
- [ ] Playwright tests written (5+ tests)
- [ ] Manual QA completed
- [ ] Performance validated

### **Rollout Phase**:
- [ ] Internal rollout (2 days)
- [ ] 5% rollout (1 day)
- [ ] 25% rollout (1 day)
- [ ] 50% rollout (1 day)
- [ ] 100% rollout
- [ ] Metrics comparison documented

---

## ⏱️ **TIMELINE**

### **Week 1: Prep + V0 Generation**
- **Day 1-2**: Prep Phase (cleanup, split components)
- **Day 3**: Telemetry implementation + baseline capture start
- **Day 4-5**: V0 prompt creation + generation
- **Day 6-7**: V0 integration + testing

### **Week 2: Baseline Capture**
- **Days 8-14**: Capture baseline metrics (original wizard)

### **Week 3: Rollout**
- **Day 15-16**: Internal testing (team only)
- **Day 17**: 5% rollout
- **Day 18**: 25% rollout
- **Day 19**: 50% rollout
- **Day 20**: 75% rollout
- **Day 21**: 100% rollout

**Total Time**: 21 days (14-20 hours active work)

---

## 🎯 **SUCCESS DEFINITION**

### **Technical Success**:
- ✅ Zero functional regressions
- ✅ 100% PDF generation success
- ✅ < 5% error rate
- ✅ Lighthouse scores maintained

### **Business Success**:
- ✅ Completion rate increases
- ✅ Time to complete decreases
- ✅ User feedback positive
- ✅ Mobile experience improved

### **Operational Success**:
- ✅ Clean, maintainable code
- ✅ Single wizard (not multiple)
- ✅ Easy to add new deed types
- ✅ Clear documentation

---

## 🚀 **NEXT STEPS**

1. **Read**: `02_PREP_PHASE_GUIDE.md` (detailed prep instructions)
2. **Execute**: Follow step-by-step checklist
3. **Track**: Use `docs/checklists/PREP_CHECKLIST.md`
4. **Document**: Update status as you go

**Let's crush this, Champ!** 💪🔥

