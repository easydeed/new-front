# 🛠️ **PHASE 24-C-PREP: FOUNDATION - STEP-BY-STEP GUIDE**

**Duration**: 6-8 hours  
**Goal**: Clean codebase before V0 redesign  
**Philosophy**: Can't polish a mess - clean first!  

---

## 📋 **PREP PHASE OVERVIEW**

We're going to:
1. ✅ Delete technical debt (backup files, logs, duplication)
2. ✅ Split large components (PropertySearch, ClassicWizard)
3. ✅ Delete Classic Wizard (commit to Modern only)
4. ✅ Add telemetry (capture baseline metrics)
5. ✅ Document everything (for easy debugging)

---

## 🎯 **STEP 1: BACKUP EVERYTHING** (15 minutes)

### **Create Safety Branch**

```bash
cd frontend

# Create backup branch
git checkout -b phase24c-prep-backup
git push origin phase24c-prep-backup

# Create working branch
git checkout -b phase24c-prep
```

### **Document Current State**

```bash
# Count components
find src/features/wizard -name "*.tsx" | wc -l

# Count backup files
find src/features/wizard -name "*.bak.*" -o -name "*backup*" | wc -l

# Count console.logs
grep -r "console\." src/features/wizard | wc -l
```

**Save this output** - we'll compare at the end!

---

## 🗑️ **STEP 2: DELETE BACKUP FILES** (15 minutes)

### **Find All Backup Files**

```bash
# Search for backup files
find src/features/wizard -name "*.bak.*"
find src/features/wizard -name "*backup*"
find src/features/wizard -name "*.old"
find src/features/wizard -name "*deprecated*"
```

### **Review Before Deleting**

Open each file and verify it's truly a backup (not in use).

### **Delete Backup Files**

```bash
# Delete all backup files
find src/features/wizard -name "*.bak.*" -delete
find src/features/wizard -name "*backup*" -delete
find src/features/wizard -name "*.old" -delete

# Verify deletion
find src/features/wizard -name "*.bak.*"  # Should return nothing
```

### **Commit**

```bash
git add .
git commit -m "Phase 24-C Prep: Delete backup files

- Removed 8 .bak.* files
- Removed 2 backup files
- Clean up technical debt
"
```

---

## 📝 **STEP 3: REMOVE CONSOLE.LOGS** (1 hour)

### **Strategy**

- **Delete**: Debug logs, verbose logs
- **Keep**: Critical error logs (but behind feature flag)
- **Replace**: User-facing errors with proper error tracking

### **Find All Console.logs**

```bash
grep -rn "console\." src/features/wizard --include="*.ts" --include="*.tsx"
```

### **Replace with Error Tracking**

**Before**:
```typescript
console.log('[ModernEngine] Initial state hydrated:', initial);
console.error('[WizardHost] Property verification failed:', error);
```

**After**:
```typescript
// Remove debug logs entirely

// Replace critical errors with proper tracking
import { trackWizardEvent } from '@/lib/analytics/wizardEvents';

trackWizardEvent('Wizard.Error', {
  step: 'PropertyVerification',
  error: error.message,
  context: { /* relevant data */ }
});
```

### **Files to Clean** (Priority order):

1. `ModernEngine.tsx` (31 logs)
2. `Step5PreviewFixed.tsx` (8 logs)
3. `useWizardStoreBridge.ts` (8 logs)
4. `WizardHost.tsx` (5 logs)
5. `PrefillCombo.tsx` (5 logs)
6. All other files (remaining logs)

### **Commit After Each File**

```bash
git add src/features/wizard/mode/engines/ModernEngine.tsx
git commit -m "Phase 24-C Prep: Remove console.logs from ModernEngine

- Removed 28 debug logs
- Kept 3 critical error logs behind DEBUG flag
- Replaced with trackWizardEvent calls
"
```

---

## 📦 **STEP 4: REMOVE COMPONENT DUPLICATION** (1 hour)

### **SmartReview Duplication**

**Found in 3 locations**:
1. `src/features/wizard/mode/components/SmartReview.tsx`
2. `src/features/wizard/mode/review/SmartReview.tsx`
3. `src/features/wizard/mode/engines/steps/SmartReview.tsx`

**Decision**: Keep `mode/review/SmartReview.tsx` (most current)

### **Steps**:

1. **Find all imports**:
```bash
grep -rn "SmartReview" src --include="*.ts" --include="*.tsx"
```

2. **Update imports** to point to canonical location:
```typescript
// Before
import SmartReview from '../components/SmartReview';
import SmartReview from '../engines/steps/SmartReview';

// After
import SmartReview from '../review/SmartReview';
```

3. **Delete duplicates**:
```bash
rm src/features/wizard/mode/components/SmartReview.tsx
rm src/features/wizard/mode/engines/steps/SmartReview.tsx
```

4. **Test**:
```bash
npm run build  # Should compile without errors
```

5. **Commit**:
```bash
git add .
git commit -m "Phase 24-C Prep: Remove SmartReview duplication

- Kept mode/review/SmartReview.tsx (canonical)
- Updated all imports
- Deleted 2 duplicate files
"
```

---

## ✂️ **STEP 5: SPLIT PROPERTY SEARCH** (2-3 hours)

### **Current State**: 1,025 lines in one file

### **Target State**: 5 separate files

**New structure**:
```
src/features/wizard/property-search/
├── hooks/
│   ├── useGooglePlaces.ts (150 lines - Google Places API logic)
│   └── useSiteXEnrichment.ts (100 lines - SiteX enrichment logic)
├── components/
│   ├── PropertySearchContainer.tsx (150 lines - orchestration)
│   ├── PropertySearchInput.tsx (80 lines - input UI)
│   ├── PropertySearchDropdown.tsx (80 lines - suggestions UI)
│   └── PropertySearchResults.tsx (80 lines - enriched data display)
└── types.ts (50 lines - shared types)
```

### **Step 5.1: Create Types File** (15 min)

```typescript
// src/features/wizard/property-search/types.ts
export interface PropertyData {
  fullAddress: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  neighborhood?: string;
  county?: string;
  placeId: string;
  apn?: string;
  legalDescription?: string;
  grantorName?: string;
  currentOwnerPrimary?: string;
  currentOwnerSecondary?: string;
}

export interface GoogleSuggestion {
  id: string;
  label: string;
  secondary?: string;
  placeId: string;
}

export interface SiteXEnrichment {
  apn?: string;
  county?: string;
  legalDescription?: string;
  owner?: string;
}
```

### **Step 5.2: Extract useGooglePlaces Hook** (45 min)

```typescript
// src/features/wizard/property-search/hooks/useGooglePlaces.ts
import { useState, useEffect, useRef } from 'react';
import type { GoogleSuggestion } from '../types';

export function useGooglePlaces(input: string) {
  const [suggestions, setSuggestions] = useState<GoogleSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!input || input.length < 3) {
      setSuggestions([]);
      return;
    }

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce search
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(input);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [input]);

  const fetchSuggestions = async (searchInput: string) => {
    // [PASTE EXISTING GOOGLE PLACES LOGIC HERE]
    // Extract from PropertySearchWithTitlePoint.tsx lines ~200-350
  };

  return { suggestions, loading };
}
```

### **Step 5.3: Extract useSiteXEnrichment Hook** (45 min)

```typescript
// src/features/wizard/property-search/hooks/useSiteXEnrichment.ts
import { useState } from 'react';
import type { SiteXEnrichment } from '../types';

export function useSiteXEnrichment() {
  const [enrichment, setEnrichment] = useState<SiteXEnrichment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enrichProperty = async (placeId: string, address: string) => {
    setLoading(true);
    setError(null);

    try {
      // [PASTE EXISTING SITEX LOGIC HERE]
      // Extract from PropertySearchWithTitlePoint.tsx lines ~500-700
      
      const response = await fetch('/api/property/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId, address }),
      });

      if (!response.ok) throw new Error('Enrichment failed');

      const data = await response.json();
      
      setEnrichment({
        apn: data.apn,
        county: data.county,
        legalDescription: data.legalDescription,
        owner: data.currentOwnerPrimary,
      });

      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { enrichment, loading, error, enrichProperty };
}
```

### **Step 5.4: Create Container Component** (30 min)

```typescript
// src/features/wizard/property-search/components/PropertySearchContainer.tsx
'use client';

import { useState } from 'react';
import { useGooglePlaces } from '../hooks/useGooglePlaces';
import { useSiteXEnrichment } from '../hooks/useSiteXEnrichment';
import { PropertySearchInput } from './PropertySearchInput';
import { PropertySearchDropdown } from './PropertySearchDropdown';
import { PropertySearchResults } from './PropertySearchResults';
import type { PropertyData } from '../types';

interface Props {
  onVerified: (data: PropertyData) => void;
}

export function PropertySearchContainer({ onVerified }: Props) {
  const [input, setInput] = useState('');
  const { suggestions, loading: googleLoading } = useGooglePlaces(input);
  const { enrichment, loading: enrichLoading, error, enrichProperty } = useSiteXEnrichment();

  const handleSelectSuggestion = async (suggestionId: string) => {
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;

    try {
      const data = await enrichProperty(suggestion.placeId, suggestion.label);
      onVerified(data);
    } catch (err) {
      console.error('Failed to enrich property:', err);
    }
  };

  return (
    <div className="property-search">
      <PropertySearchInput
        value={input}
        onChange={setInput}
        loading={googleLoading || enrichLoading}
        error={error}
      />
      
      <PropertySearchDropdown
        suggestions={suggestions}
        onSelect={handleSelectSuggestion}
      />
      
      <PropertySearchResults
        enrichment={enrichment}
      />
    </div>
  );
}
```

### **Step 5.5: Create UI Components** (45 min)

Create these 3 simple presentational components:
- `PropertySearchInput.tsx` (80 lines)
- `PropertySearchDropdown.tsx` (80 lines)
- `PropertySearchResults.tsx` (80 lines)

### **Step 5.6: Update Imports & Test** (30 min)

1. Update all imports to use new `PropertySearchContainer`
2. Run build: `npm run build`
3. Test wizard flow manually
4. Commit:

```bash
git add src/features/wizard/property-search/
git commit -m "Phase 24-C Prep: Split PropertySearch into 5 files

- Created useGooglePlaces hook (150 lines)
- Created useSiteXEnrichment hook (100 lines)
- Created PropertySearchContainer (150 lines)
- Created 3 UI components (80 lines each)
- Split 1,025-line monolith into maintainable pieces
"
```

---

## 🗑️ **STEP 6: DELETE CLASSIC WIZARD** (30 minutes)

### **Commit to Modern Only!**

**Delete these files**:
```bash
rm src/app/create-deed/[docType]/page.tsx  # Classic Wizard (383 lines)
rm -rf src/features/wizard/steps/  # Classic-specific steps
```

**Update routing**:
```typescript
// Ensure /create-deed routes to Modern Wizard only
```

**Commit**:
```bash
git add .
git commit -m "Phase 24-C Prep: Delete Classic Wizard

- Removed Classic Wizard (383 lines)
- Removed Classic-specific step components
- Committed to Modern Wizard only
- Single source of truth
"
```

---

## 📊 **STEP 7: IMPLEMENT TELEMETRY** (2-3 hours)

### **Step 7.1: Create Telemetry Utility** (30 min)

```typescript
// src/lib/analytics/wizardEvents.ts
export async function trackWizardEvent(
  event: string,
  properties: Record<string, any>
) {
  try {
    await fetch('/api/usage/events', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify({
        event,
        properties: {
          ...properties,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        },
      }),
    });
  } catch (error) {
    // Fail silently - don't break wizard if telemetry fails
    console.warn('Failed to track wizard event:', error);
  }
}
```

### **Step 7.2: Instrument Modern Wizard** (1.5 hours)

Add these events to `ModernEngine.tsx`:

```typescript
// At wizard start
trackWizardEvent('Wizard.Started', {
  mode: 'modern',
  deedType,
  hasExistingDraft: !!localStorage.getItem('deedWizardDraft'),
});

// At each step
trackWizardEvent('Wizard.StepShown', {
  step: i + 1,
  stepName: flow[i].id,
  totalSteps: flow.length,
});

// After property enrichment
trackWizardEvent('Wizard.PropertyEnriched', {
  hasApn: !!enrichment.apn,
  hasCounty: !!enrichment.county,
  hasLegal: !!enrichment.legalDescription,
  hasGrantor: !!enrichment.owner,
});

// On step completion
trackWizardEvent('Wizard.StepCompleted', {
  step: i + 1,
  stepName: flow[i].id,
  duration: Date.now() - stepStartTime,
});

// On error
trackWizardEvent('Wizard.Error', {
  step: i + 1,
  error: error.message,
  field: failedField,
});

// On completion
trackWizardEvent('Wizard.Completed', {
  deedType,
  totalDuration: Date.now() - wizardStartTime,
  stepsCompleted: flow.length,
});
```

### **Step 7.3: Backend Endpoint** (30 min)

Ensure `/api/usage/events` endpoint exists (it should from Phase 23).

### **Step 7.4: Test Telemetry** (30 min)

1. Run wizard
2. Check database for events
3. Verify all events are captured
4. Commit:

```bash
git add .
git commit -m "Phase 24-C Prep: Implement telemetry

- Created trackWizardEvent utility
- Instrumented Modern Wizard
- Tracking 8 event types
- Ready to capture baseline metrics
"
```

---

## ✅ **STEP 8: CAPTURE BASELINE METRICS** (1 week)

### **Deploy Prep Changes**

```bash
git push origin phase24c-prep
# Create PR, review, merge to main
# Deploy to production
```

### **Monitor for 1 Week**

Let the telemetry run for 7 days to capture:
- Wizard start count
- Completion rate
- Average time to complete
- Error rate by step
- Abandonment rate by step
- Mobile vs desktop usage

### **Document Baseline**

After 1 week, pull metrics and document in:
`docs/telemetry/BASELINE_METRICS.md`

```markdown
# Baseline Metrics - Modern Wizard (Before V0)

**Date Range**: Nov 1-7, 2025  
**Total Wizard Starts**: 450  

**Completion Metrics**:
- Completion rate: 82%
- Avg time to complete: 5.8 minutes
- PDF generation success: 98%

**Error Metrics**:
- Error rate: 3.2%
- Most common error: "Invalid property address" (45%)
- Step with most errors: Step 2 (Grantee details)

**Abandonment**:
- Abandonment rate: 18%
- Step 1: 5%
- Step 2: 8%
- Step 3: 3%
- Step 4: 2%

**Device Split**:
- Desktop: 65%
- Mobile: 35%
- Mobile completion rate: 72% (vs 87% desktop)
```

---

## 📋 **PREP PHASE CHECKLIST**

Use this to track your progress:

```
PHASE 24-C-PREP CHECKLIST

Step 1: Backup
[ ] Created backup branch (phase24c-prep-backup)
[ ] Created working branch (phase24c-prep)
[ ] Documented current state (file counts, log counts)

Step 2: Delete Backup Files
[ ] Found all backup files
[ ] Reviewed each file
[ ] Deleted backup files
[ ] Verified deletion
[ ] Committed changes

Step 3: Remove Console.Logs
[ ] Found all console.logs (186 total)
[ ] Cleaned ModernEngine.tsx (31 logs)
[ ] Cleaned Step5PreviewFixed.tsx (8 logs)
[ ] Cleaned useWizardStoreBridge.ts (8 logs)
[ ] Cleaned WizardHost.tsx (5 logs)
[ ] Cleaned PrefillCombo.tsx (5 logs)
[ ] Cleaned remaining files
[ ] Committed after each file

Step 4: Remove Duplication
[ ] Found all SmartReview locations (3 total)
[ ] Decided on canonical location
[ ] Updated all imports
[ ] Deleted duplicates
[ ] Tested build
[ ] Committed changes

Step 5: Split PropertySearch
[ ] Created types.ts
[ ] Created useGooglePlaces hook
[ ] Created useSiteXEnrichment hook
[ ] Created PropertySearchContainer
[ ] Created PropertySearchInput
[ ] Created PropertySearchDropdown
[ ] Created PropertySearchResults
[ ] Updated all imports
[ ] Tested wizard flow
[ ] Committed changes

Step 6: Delete Classic Wizard
[ ] Deleted Classic Wizard files
[ ] Updated routing
[ ] Tested Modern Wizard still works
[ ] Committed changes

Step 7: Implement Telemetry
[ ] Created trackWizardEvent utility
[ ] Instrumented wizard start
[ ] Instrumented step navigation
[ ] Instrumented property enrichment
[ ] Instrumented errors
[ ] Instrumented completion
[ ] Tested telemetry
[ ] Committed changes

Step 8: Capture Baseline
[ ] Deployed prep changes to production
[ ] Monitored for 1 week
[ ] Documented baseline metrics
[ ] Ready for V0 redesign phase
```

---

## 🎯 **COMPLETION CRITERIA**

**Prep Phase is DONE when**:
- ✅ Zero backup files in codebase
- ✅ < 20 console.logs remaining (only critical)
- ✅ Zero component duplication
- ✅ PropertySearch is 5 files (not 1,025 lines)
- ✅ Classic Wizard deleted
- ✅ Telemetry implemented and tested
- ✅ Baseline metrics captured (1 week)
- ✅ All changes committed to clean branch
- ✅ Build passes: `npm run build`
- ✅ Wizard works: Manual test of all 5 deed types

---

## 🚀 **NEXT STEP**

**Read**: `03_EXECUTION_GUIDE.md` (V0 Redesign Phase)

**You've cleaned the foundation - now let's build something beautiful!** 💪🔥

