# DeedPro Document Builder — Implementation Guide

## Overview

Replace the step-wizard with a **two-panel document builder**. Escrow officers see all information at once, with a live preview of the actual deed updating in real-time.

**Key Principles:**
- Everything visible at all times — no hidden steps
- Confirm, don't collect — SiteX pre-fills, user verifies
- Live preview — see the deed as you build it
- Status indicators — green checks show completion, not progress bars

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  [←] Exit    Grant Deed                                          [? Help]       │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────┐  ┌───────────────────────────────────────────────┐ │
│  │                         │  │                                               │ │
│  │     INPUT PANEL         │  │           LIVE DEED PREVIEW                   │ │
│  │     (420px fixed)       │  │           (Flexible width)                    │ │
│  │                         │  │                                               │ │
│  │  • Accordion sections   │  │  • Actual deed document                       │ │
│  │  • Status indicators    │  │  • Updates in real-time                       │ │
│  │  • Scrollable           │  │  • Highlights active section                  │ │
│  │                         │  │                                               │ │
│  │  [Generate Button]      │  │                                               │ │
│  │                         │  │                                               │ │
│  └─────────────────────────┘  └───────────────────────────────────────────────┘ │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Sidebar Auto-Collapse

When entering the builder, collapse the sidebar to maximize workspace.

### File: `hooks/useBuilderMode.ts`

```tsx
'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

// Assuming you have a sidebar context or store
import { useSidebar } from '@/contexts/SidebarContext';

export function useBuilderMode() {
  const pathname = usePathname();
  const { setCollapsed } = useSidebar();
  
  const isBuilderRoute = pathname?.includes('/create-deed') || 
                         pathname?.includes('/deed-builder');

  useEffect(() => {
    if (isBuilderRoute) {
      setCollapsed(true);
    }
  }, [isBuilderRoute, setCollapsed]);

  return { isBuilderMode: isBuilderRoute };
}
```

### Update: Sidebar Component

Add support for collapsed state if not already present. When collapsed, hide the sidebar completely to give full width to the builder.

---

## Step 2: Builder Header

Minimal header showing deed type and exit option.

### File: `components/builder/BuilderHeader.tsx`

```tsx
'use client';

import { ArrowLeft, FileText, HelpCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface BuilderHeaderProps {
  deedType: string;
}

export function BuilderHeader({ deedType }: BuilderHeaderProps) {
  const router = useRouter();

  const handleExit = () => {
    router.push('/dashboard');
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={handleExit}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Exit</span>
        </button>
        
        <div className="h-6 w-px bg-gray-200" />
        
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-brand-500" />
          <h1 className="font-semibold text-gray-900">{deedType}</h1>
        </div>
      </div>

      <button className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
        <HelpCircle className="w-5 h-5" />
        <span className="text-sm font-medium">Help</span>
      </button>
    </header>
  );
}
```

---

## Step 3: Input Section Component

Reusable accordion section with status indicator.

### File: `components/builder/InputSection.tsx`

```tsx
'use client';

import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertTriangle, Circle, ChevronDown } from 'lucide-react';

export type SectionStatus = 'complete' | 'warning' | 'empty' | 'error';

interface InputSectionProps {
  id: string;
  title: string;
  status: SectionStatus;
  preview: string;
  isExpanded: boolean;
  onToggle: () => void;
  badge?: string;
  children: ReactNode;
}

const STATUS_CONFIG = {
  complete: {
    icon: Check,
    iconColor: 'text-emerald-500',
    bgColor: 'bg-emerald-100',
    borderColor: 'border-emerald-200',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-200',
  },
  empty: {
    icon: Circle,
    iconColor: 'text-gray-300',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
  },
  error: {
    icon: AlertTriangle,
    iconColor: 'text-red-500',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-200',
  },
};

export function InputSection({
  id,
  title,
  status,
  preview,
  isExpanded,
  onToggle,
  badge,
  children,
}: InputSectionProps) {
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  return (
    <div
      className={`
        rounded-xl border-2 overflow-hidden transition-all duration-200
        ${isExpanded ? 'border-brand-400 shadow-lg' : config.borderColor}
      `}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className={`
          w-full flex items-center justify-between p-4
          transition-colors duration-150
          ${isExpanded ? 'bg-brand-50' : 'bg-white hover:bg-gray-50'}
        `}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.bgColor}`}>
            <StatusIcon className={`w-5 h-5 ${config.iconColor}`} />
          </div>

          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">{title}</span>
              {badge && (
                <span className="px-2 py-0.5 text-xs font-medium bg-brand-100 text-brand-700 rounded-full">
                  {badge}
                </span>
              )}
            </div>
            {!isExpanded && preview && (
              <p className="text-sm text-gray-500 truncate max-w-[280px] mt-0.5">
                {preview}
              </p>
            )}
          </div>
        </div>

        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4 pt-2 border-t border-gray-100 bg-white">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

---

## Step 4: Input Panel

The left panel containing all input sections.

### File: `components/builder/InputPanel.tsx`

```tsx
'use client';

import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { InputSection, SectionStatus } from './InputSection';
import { PropertySection } from './sections/PropertySection';
import { GrantorSection } from './sections/GrantorSection';
import { GranteeSection } from './sections/GranteeSection';
import { VestingSection } from './sections/VestingSection';
import { TransferTaxSection } from './sections/TransferTaxSection';
import { RecordingSection } from './sections/RecordingSection';
import { DeedBuilderState } from '@/types/builder';

interface InputPanelProps {
  state: DeedBuilderState;
  onChange: (updates: Partial<DeedBuilderState>) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  expandedSection: string;
  onSectionChange: (section: string) => void;
}

export function InputPanel({
  state,
  onChange,
  onGenerate,
  isGenerating,
  expandedSection,
  onSectionChange,
}: InputPanelProps) {
  
  const statuses = useMemo(() => {
    const getStatus = (section: string): SectionStatus => {
      switch (section) {
        case 'property':
          return state.property?.address ? 'complete' : 'empty';
        case 'grantor':
          return state.grantor?.trim() ? 'complete' : 'empty';
        case 'grantee':
          if (!state.grantee?.trim()) return 'empty';
          if (state.grantee.trim().toUpperCase() === state.grantor?.trim().toUpperCase()) return 'warning';
          return 'complete';
        case 'vesting':
          return state.vesting ? 'complete' : 'empty';
        case 'transferTax':
          if (state.dtt?.isExempt && state.dtt?.exemptReason) return 'complete';
          if (state.dtt?.transferValue) return 'complete';
          return 'empty';
        case 'recording':
          return state.requestedBy?.trim() ? 'complete' : 'empty';
        default:
          return 'empty';
      }
    };

    return {
      property: getStatus('property'),
      grantor: getStatus('grantor'),
      grantee: getStatus('grantee'),
      vesting: getStatus('vesting'),
      transferTax: getStatus('transferTax'),
      recording: getStatus('recording'),
    };
  }, [state]);

  const completedCount = Object.values(statuses).filter(s => s === 'complete').length;
  const totalSections = 6;
  const isReady = completedCount === totalSections;

  const toggleSection = (section: string) => {
    onSectionChange(expandedSection === section ? '' : section);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="p-4 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Deed Information</h2>
            <p className="text-sm text-gray-500">
              {completedCount} of {totalSections} sections complete
            </p>
          </div>
          
          <div className="flex items-center gap-1.5">
            {Object.values(statuses).map((status, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  status === 'complete' ? 'bg-emerald-500' :
                  status === 'warning' ? 'bg-amber-500' :
                  'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <InputSection
          id="property"
          title="Property"
          status={statuses.property}
          preview={state.property?.address || 'Search for a property'}
          isExpanded={expandedSection === 'property'}
          onToggle={() => toggleSection('property')}
          badge="Auto-filled"
        >
          <PropertySection
            value={state.property}
            onChange={(property) => onChange({ property })}
            onComplete={() => toggleSection('grantor')}
          />
        </InputSection>

        <InputSection
          id="grantor"
          title="Grantor"
          status={statuses.grantor}
          preview={state.grantor || 'Current property owner'}
          isExpanded={expandedSection === 'grantor'}
          onToggle={() => toggleSection('grantor')}
          badge="From Records"
        >
          <GrantorSection
            value={state.grantor}
            onChange={(grantor) => onChange({ grantor })}
            suggestedName={state.property?.owner}
          />
        </InputSection>

        <InputSection
          id="grantee"
          title="Grantee"
          status={statuses.grantee}
          preview={state.grantee || 'Enter the new owner'}
          isExpanded={expandedSection === 'grantee'}
          onToggle={() => toggleSection('grantee')}
        >
          <GranteeSection
            value={state.grantee}
            onChange={(grantee) => onChange({ grantee })}
            grantorName={state.grantor}
          />
        </InputSection>

        <InputSection
          id="vesting"
          title="Vesting"
          status={statuses.vesting}
          preview={state.vesting || 'How title will be held'}
          isExpanded={expandedSection === 'vesting'}
          onToggle={() => toggleSection('vesting')}
        >
          <VestingSection
            value={state.vesting}
            onChange={(vesting) => onChange({ vesting })}
            granteeCount={countGrantees(state.grantee)}
            deedType={state.deedType}
          />
        </InputSection>

        <InputSection
          id="transferTax"
          title="Transfer Tax"
          status={statuses.transferTax}
          preview={
            state.dtt?.isExempt
              ? `Exempt - ${state.dtt.exemptReason || 'Select reason'}`
              : state.dtt?.calculatedAmount
                ? `$${state.dtt.transferValue} → $${state.dtt.calculatedAmount} DTT`
                : 'Calculate or mark exempt'
          }
          isExpanded={expandedSection === 'transferTax'}
          onToggle={() => toggleSection('transferTax')}
        >
          <TransferTaxSection
            value={state.dtt}
            onChange={(dtt) => onChange({ dtt })}
            city={state.property?.city}
            deedType={state.deedType}
          />
        </InputSection>

        <InputSection
          id="recording"
          title="Recording Info"
          status={statuses.recording}
          preview={state.requestedBy || 'Who is requesting recording'}
          isExpanded={expandedSection === 'recording'}
          onToggle={() => toggleSection('recording')}
        >
          <RecordingSection
            requestedBy={state.requestedBy}
            returnTo={state.returnTo}
            onChange={(updates) => onChange(updates)}
          />
        </InputSection>
      </div>

      {/* Generate Button */}
      <div className="p-4 bg-white border-t border-gray-200 flex-shrink-0">
        <button
          onClick={onGenerate}
          disabled={!isReady || isGenerating}
          className={`
            w-full flex items-center justify-center gap-3
            py-4 rounded-xl font-semibold text-lg
            transition-all duration-200
            ${isReady
              ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/25'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate Deed
            </>
          )}
        </button>

        {!isReady && (
          <p className="text-center text-sm text-gray-500 mt-2">
            Complete all sections to generate
          </p>
        )}
      </div>
    </div>
  );
}

function countGrantees(grantee: string | undefined): number {
  if (!grantee?.trim()) return 0;
  return (grantee.match(/\s+and\s+/gi) || []).length + 1;
}
```

---

## Step 5: Section Components

### File: `components/builder/sections/PropertySection.tsx`

```tsx
'use client';

import { useState } from 'react';
import { MapPin, Search, Check, Loader2 } from 'lucide-react';
import { PropertyData } from '@/types/builder';

interface PropertySectionProps {
  value: PropertyData | null;
  onChange: (property: PropertyData) => void;
  onComplete: () => void;
}

export function PropertySection({ value, onChange, onComplete }: PropertySectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (address: string) => {
    setIsSearching(true);
    
    try {
      const response = await fetch('/api/property/search-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ address }),
      });

      const result = await response.json();
      
      if (result.status === 'success') {
        onChange(result.data);
        onComplete();
      }
    } catch (error) {
      console.error('Property search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  if (value?.address) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-700 font-medium mb-1">
                <Check className="w-4 h-4" />
                Property Found
              </div>
              <p className="font-semibold text-gray-900">{value.address}</p>
              <p className="text-sm text-gray-600 mt-1">
                APN: {value.apn} · {value.county} County
              </p>
            </div>
            <button
              onClick={() => onChange(null as any)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Change
            </button>
          </div>
        </div>

        {value.legalDescription && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Legal Description
            </label>
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600 max-h-32 overflow-y-auto">
              {value.legalDescription}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
          placeholder="Enter property address..."
          className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          autoFocus
        />
        {isSearching ? (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-500 animate-spin" />
        ) : searchQuery && (
          <button
            onClick={() => handleSearch(searchQuery)}
            className="absolute right-4 top-1/2 -translate-y-1/2"
          >
            <Search className="w-5 h-5 text-brand-500 hover:text-brand-600" />
          </button>
        )}
      </div>

      <p className="text-sm text-gray-500">
        Start typing an address and we'll pull the APN, owner, and legal description automatically.
      </p>
    </div>
  );
}
```

### File: `components/builder/sections/GrantorSection.tsx`

```tsx
'use client';

import { useEffect } from 'react';
import { User, Sparkles } from 'lucide-react';

interface GrantorSectionProps {
  value: string;
  onChange: (grantor: string) => void;
  suggestedName?: string;
}

export function GrantorSection({ value, onChange, suggestedName }: GrantorSectionProps) {
  useEffect(() => {
    if (!value && suggestedName) {
      onChange(suggestedName);
    }
  }, [suggestedName]);

  return (
    <div className="space-y-4">
      {suggestedName && value === suggestedName && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
          <Sparkles className="w-4 h-4" />
          Auto-filled from county records
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Grantor Name (Current Owner)
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            placeholder="JOHN SMITH"
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 uppercase"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          For multiple grantors, use "and" (e.g., JOHN SMITH AND JANE SMITH)
        </p>
      </div>
    </div>
  );
}
```

### File: `components/builder/sections/GranteeSection.tsx`

```tsx
'use client';

import { User, AlertTriangle } from 'lucide-react';

interface GranteeSectionProps {
  value: string;
  onChange: (grantee: string) => void;
  grantorName?: string;
}

export function GranteeSection({ value, onChange, grantorName }: GranteeSectionProps) {
  const isSameAsGrantor = value && grantorName && 
    value.trim().toUpperCase() === grantorName.trim().toUpperCase();

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Grantee Name (New Owner)
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            placeholder="JANE DOE"
            className={`
              w-full pl-10 pr-4 py-3 border rounded-lg uppercase
              focus:ring-2 focus:ring-brand-500 focus:border-brand-500
              ${isSameAsGrantor ? 'border-amber-400 bg-amber-50' : 'border-gray-300'}
            `}
            autoFocus
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          For multiple grantees, use "and" (e.g., JANE DOE AND JOHN DOE)
        </p>
      </div>

      {isSameAsGrantor && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <strong>Grantee is the same as Grantor.</strong> This is unusual — is this intentional?
          </div>
        </div>
      )}
    </div>
  );
}
```

### File: `components/builder/sections/VestingSection.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { HelpCircle, Sparkles } from 'lucide-react';

interface VestingSectionProps {
  value: string;
  onChange: (vesting: string) => void;
  granteeCount: number;
  deedType: string;
}

const VESTING_OPTIONS = [
  { value: 'a single man', label: 'A Single Man', min: 1, max: 1 },
  { value: 'a single woman', label: 'A Single Woman', min: 1, max: 1 },
  { value: 'an unmarried man', label: 'An Unmarried Man', min: 1, max: 1 },
  { value: 'an unmarried woman', label: 'An Unmarried Woman', min: 1, max: 1 },
  { value: 'a married man as his sole and separate property', label: 'Married Man - Sole & Separate', min: 1, max: 1 },
  { value: 'a married woman as her sole and separate property', label: 'Married Woman - Sole & Separate', min: 1, max: 1 },
  { value: 'husband and wife as joint tenants', label: 'Husband & Wife - Joint Tenants', min: 2, max: 2 },
  { value: 'husband and wife as community property', label: 'Husband & Wife - Community Property', min: 2, max: 2 },
  { value: 'husband and wife as community property with right of survivorship', label: 'Community Property w/ Survivorship', min: 2, max: 2 },
  { value: 'as joint tenants', label: 'Joint Tenants', min: 2, max: 99 },
  { value: 'as tenants in common', label: 'Tenants in Common', min: 2, max: 99 },
];

export function VestingSection({ value, onChange, granteeCount, deedType }: VestingSectionProps) {
  const [aiGuidance, setAiGuidance] = useState<string | null>(null);

  const filteredOptions = VESTING_OPTIONS.filter(opt => 
    granteeCount >= opt.min && granteeCount <= opt.max
  );

  useEffect(() => {
    if (!value) {
      setAiGuidance(null);
      return;
    }

    if (value.includes('joint tenants')) {
      setAiGuidance('Joint Tenancy includes right of survivorship — if one owner dies, their share automatically passes to the surviving owner(s).');
    } else if (value.includes('community property')) {
      setAiGuidance('Community Property is for married couples. Each spouse owns 50%. With survivorship, it passes directly to the surviving spouse.');
    } else if (value.includes('tenants in common')) {
      setAiGuidance('Tenants in Common can have unequal shares. Each owner can sell or will their share independently.');
    } else {
      setAiGuidance(null);
    }
  }, [value]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          How will title be held?
        </label>
        
        <div className="space-y-2">
          {filteredOptions.map((option) => (
            <label
              key={option.value}
              className={`
                flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all
                ${value === option.value 
                  ? 'border-brand-500 bg-brand-50' 
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <input
                type="radio"
                name="vesting"
                value={option.value}
                checked={value === option.value}
                onChange={(e) => onChange(e.target.value)}
                className="w-4 h-4 text-brand-500 focus:ring-brand-500"
              />
              <span className="text-gray-900">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {aiGuidance && (
        <div className="flex items-start gap-2 p-3 bg-brand-50 border border-brand-200 rounded-lg">
          <Sparkles className="w-5 h-5 text-brand-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-brand-800">{aiGuidance}</p>
        </div>
      )}

      {granteeCount === 1 && value?.includes('joint tenants') && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <HelpCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Joint tenancy requires 2 or more grantees.
          </p>
        </div>
      )}
    </div>
  );
}
```

### File: `components/builder/sections/TransferTaxSection.tsx`

```tsx
'use client';

import { useMemo, useEffect } from 'react';
import { Calculator } from 'lucide-react';
import { DTTData } from '@/types/builder';

interface TransferTaxSectionProps {
  value: DTTData | null;
  onChange: (dtt: DTTData) => void;
  city?: string;
  deedType: string;
}

const CITIES_WITH_OWN_DTT = [
  'los angeles', 'san francisco', 'oakland', 'berkeley', 'san jose',
  'sacramento', 'riverside', 'pomona', 'culver city', 'santa monica',
];

const EXEMPTION_REASONS = [
  { value: 'R&T 11911', label: 'R&T 11911 - Gift / No Consideration' },
  { value: 'R&T 11927', label: 'R&T 11927 - Interspousal Transfer' },
  { value: 'R&T 11930', label: 'R&T 11930 - Transfer to Revocable Trust' },
  { value: 'R&T 11923', label: 'R&T 11923 - Court Order' },
  { value: 'R&T 11925', label: 'R&T 11925 - Foreclosure / Deed in Lieu' },
  { value: 'Other', label: 'Other Exemption' },
];

export function TransferTaxSection({ value, onChange, city, deedType }: TransferTaxSectionProps) {
  useEffect(() => {
    if (!value) {
      const isInCity = city && CITIES_WITH_OWN_DTT.includes(city.toLowerCase());
      const isInterspousal = deedType === 'interspousal-transfer';
      
      onChange({
        isExempt: isInterspousal,
        exemptReason: isInterspousal ? 'R&T 11927' : '',
        transferValue: '',
        calculatedAmount: '',
        basis: 'full_value',
        areaType: isInCity ? 'city' : 'unincorporated',
        cityName: isInCity ? city : '',
      });
    }
  }, [city, deedType]);

  const calculatedAmount = useMemo(() => {
    if (!value || value.isExempt || !value.transferValue) return '';
    
    const amount = parseFloat(value.transferValue.replace(/[^0-9.]/g, ''));
    if (isNaN(amount)) return '';
    
    const countyTax = (amount / 1000) * 1.10;
    const cityTax = value.areaType === 'city' ? (amount / 1000) * 4.50 : 0;
    
    return (countyTax + cityTax).toFixed(2);
  }, [value]);

  useEffect(() => {
    if (value && calculatedAmount !== value.calculatedAmount) {
      onChange({ ...value, calculatedAmount });
    }
  }, [calculatedAmount]);

  if (!value) return null;

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={!value.isExempt}
            onChange={() => onChange({ ...value, isExempt: false })}
            className="w-4 h-4 text-brand-500 focus:ring-brand-500"
          />
          <span className="font-medium text-gray-900">Calculate Tax</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={value.isExempt}
            onChange={() => onChange({ ...value, isExempt: true })}
            className="w-4 h-4 text-brand-500 focus:ring-brand-500"
          />
          <span className="font-medium text-gray-900">Exempt</span>
        </label>
      </div>

      {value.isExempt ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Exemption Reason
          </label>
          <select
            value={value.exemptReason}
            onChange={(e) => onChange({ ...value, exemptReason: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Select reason...</option>
            {EXEMPTION_REASONS.map((reason) => (
              <option key={reason.value} value={reason.value}>
                {reason.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transfer Value
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="text"
                value={value.transferValue}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  const formatted = raw ? parseInt(raw).toLocaleString() : '';
                  onChange({ ...value, transferValue: formatted });
                }}
                placeholder="500,000"
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={value.basis === 'full_value'}
                onChange={() => onChange({ ...value, basis: 'full_value' })}
                className="w-4 h-4 text-brand-500"
              />
              <span className="text-sm text-gray-700">Full value</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={value.basis === 'less_liens'}
                onChange={() => onChange({ ...value, basis: 'less_liens' })}
                className="w-4 h-4 text-brand-500"
              />
              <span className="text-sm text-gray-700">Less liens</span>
            </label>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={value.areaType === 'city'}
                onChange={() => onChange({ ...value, areaType: 'city' })}
                className="w-4 h-4 text-brand-500"
              />
              <span className="text-sm text-gray-700">City of {value.cityName || '___'}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={value.areaType === 'unincorporated'}
                onChange={() => onChange({ ...value, areaType: 'unincorporated' })}
                className="w-4 h-4 text-brand-500"
              />
              <span className="text-sm text-gray-700">Unincorporated</span>
            </label>
          </div>

          {calculatedAmount && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <Calculator className="w-5 h-5 text-emerald-500" />
              <span className="font-medium text-emerald-700">
                Documentary Transfer Tax: ${calculatedAmount}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### File: `components/builder/sections/RecordingSection.tsx`

```tsx
'use client';

import { useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { usePartners } from '@/features/partners/PartnersContext';

interface RecordingSectionProps {
  requestedBy: string;
  returnTo: string;
  onChange: (updates: { requestedBy?: string; returnTo?: string }) => void;
}

export function RecordingSection({ requestedBy, returnTo, onChange }: RecordingSectionProps) {
  const { partners } = usePartners();
  
  useEffect(() => {
    if (!requestedBy && partners.length > 0) {
      const lastUsed = localStorage.getItem('lastPartnerUsed');
      if (lastUsed) {
        const partner = partners.find(p => p.id === lastUsed);
        if (partner) {
          onChange({ requestedBy: partner.label });
        }
      }
    }
  }, [partners, requestedBy]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Recording Requested By
        </label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={requestedBy}
            onChange={(e) => {
              onChange({ requestedBy: e.target.value });
              const partner = partners.find(p => p.label === e.target.value);
              if (partner) {
                localStorage.setItem('lastPartnerUsed', partner.id);
              }
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 appearance-none bg-white"
          >
            <option value="">Select partner...</option>
            {partners.map((partner) => (
              <option key={partner.id} value={partner.label}>
                {partner.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          When Recorded, Return To
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={!returnTo || returnTo === requestedBy}
              onChange={() => onChange({ returnTo: requestedBy })}
              className="w-4 h-4 text-brand-500"
            />
            <span className="text-sm text-gray-700">Same as Requested By</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={returnTo === 'grantee'}
              onChange={() => onChange({ returnTo: 'grantee' })}
              className="w-4 h-4 text-brand-500"
            />
            <span className="text-sm text-gray-700">Grantee</span>
          </label>
        </div>
      </div>
    </div>
  );
}
```

---

## Step 6: Preview Panel

### File: `components/builder/PreviewPanel.tsx`

```tsx
'use client';

import { useMemo } from 'react';
import { DeedBuilderState } from '@/types/builder';

interface PreviewPanelProps {
  state: DeedBuilderState;
  activeSection: string;
}

export function PreviewPanel({ state, activeSection }: PreviewPanelProps) {
  const preview = useMemo(() => ({
    requestedBy: state.requestedBy || '[Recording Requested By]',
    returnTo: state.returnTo || state.requestedBy || '[Return To]',
    apn: state.property?.apn || '[APN]',
    dtt: state.dtt?.isExempt 
      ? `EXEMPT - ${state.dtt.exemptReason || '___'}`
      : state.dtt?.calculatedAmount 
        ? `$${state.dtt.calculatedAmount}`
        : '[$_____]',
    grantor: state.grantor || '[GRANTOR NAME]',
    grantee: state.grantee || '[GRANTEE NAME]',
    vesting: state.vesting || '',
    legalDescription: state.property?.legalDescription || '[Legal Description]',
    county: state.property?.county || '[County]',
  }), [state]);

  const deedTitle = {
    'grant-deed': 'GRANT DEED',
    'quitclaim-deed': 'QUITCLAIM DEED',
    'interspousal-transfer': 'INTERSPOUSAL TRANSFER DEED',
    'warranty-deed': 'WARRANTY DEED',
    'tax-deed': 'TAX DEED',
  }[state.deedType] || 'DEED';

  const highlight = (section: string) =>
    activeSection === section 
      ? 'bg-brand-50 ring-2 ring-brand-300 rounded -m-2 p-2' 
      : '';

  const placeholder = (value: string) => 
    value.startsWith('[') ? 'text-gray-400 bg-gray-100 px-1 rounded' : '';

  return (
    <div className="h-full bg-gray-200 p-6 overflow-y-auto">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-2xl" style={{ minHeight: '11in' }}>
          <div className="p-12 font-serif text-[14px] leading-relaxed">
            
            {/* Header */}
            <div className="flex justify-between mb-8">
              <div className={highlight('recording')}>
                <div className="text-xs mb-4">
                  <div className="font-bold mb-1">RECORDING REQUESTED BY:</div>
                  <span className={placeholder(preview.requestedBy)}>{preview.requestedBy}</span>
                </div>
                <div className="text-xs">
                  <div className="font-bold mb-1">WHEN RECORDED MAIL TO:</div>
                  <span className={placeholder(preview.returnTo)}>{preview.returnTo}</span>
                </div>
              </div>
              
              <div className="w-56 h-28 border-2 border-black flex items-center justify-center">
                <span className="text-xs text-gray-400">RECORDER'S USE</span>
              </div>
            </div>

            {/* APN & DTT */}
            <div className="flex justify-between text-xs mb-6">
              <div className={highlight('property')}>
                <span className="font-bold">A.P.N.: </span>
                <span className={placeholder(preview.apn)}>{preview.apn}</span>
              </div>
              <div className={highlight('transferTax')}>
                <span className="font-bold">Documentary Transfer Tax: </span>
                <span className={placeholder(preview.dtt)}>{preview.dtt}</span>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-center mb-8 tracking-widest">
              {deedTitle}
            </h1>

            {/* Body */}
            <p className="mb-6">
              FOR A VALUABLE CONSIDERATION, receipt of which is hereby acknowledged,
            </p>

            <div className={`mb-6 ${highlight('grantor')}`}>
              <span className={`font-bold ${placeholder(preview.grantor)}`}>{preview.grantor}</span>
            </div>

            <p className="mb-6">hereby GRANT(S) to</p>

            <div className={`mb-6 ${highlight('grantee')}`}>
              <span className={`font-bold ${placeholder(preview.grantee)}`}>{preview.grantee}</span>
              {preview.vesting && (
                <span className={highlight('vesting')}>, {preview.vesting}</span>
              )}
            </div>

            <p className="mb-6">
              the following described real property in the County of{' '}
              <span className={placeholder(preview.county)}>{preview.county}</span>, State of California:
            </p>

            <div className={`border border-gray-300 p-4 mb-8 ${highlight('property')}`}>
              <span className={`text-sm ${placeholder(preview.legalDescription)}`}>
                {preview.legalDescription}
              </span>
            </div>

            {/* Signature */}
            <div className="mt-16 space-y-8">
              <div>
                <div className="border-b border-black w-72 mb-1" />
                <div className="text-xs">Date</div>
              </div>
              <div>
                <div className="border-b border-black w-72 mb-1" />
                <div className="text-xs">{preview.grantor}</div>
              </div>
            </div>

          </div>
        </div>
        <p className="text-center text-sm text-gray-400 mt-4">Preview updates as you type</p>
      </div>
    </div>
  );
}
```

---

## Step 7: Main Builder

### File: `features/builder/DeedBuilder.tsx`

```tsx
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { BuilderHeader } from '@/components/builder/BuilderHeader';
import { InputPanel } from '@/components/builder/InputPanel';
import { PreviewPanel } from '@/components/builder/PreviewPanel';
import { useBuilderMode } from '@/hooks/useBuilderMode';
import { DeedBuilderState, PropertyData } from '@/types/builder';

interface DeedBuilderProps {
  deedType: string;
  initialProperty?: PropertyData;
}

const DEED_LABELS: Record<string, string> = {
  'grant-deed': 'Grant Deed',
  'quitclaim-deed': 'Quitclaim Deed',
  'interspousal-transfer': 'Interspousal Transfer Deed',
  'warranty-deed': 'Warranty Deed',
  'tax-deed': 'Tax Deed',
};

export function DeedBuilder({ deedType, initialProperty }: DeedBuilderProps) {
  const router = useRouter();
  useBuilderMode();

  const [state, setState] = useState<DeedBuilderState>({
    deedType,
    property: initialProperty || null,
    grantor: initialProperty?.owner || '',
    grantee: '',
    vesting: '',
    dtt: null,
    requestedBy: '',
    returnTo: '',
  });

  const [expandedSection, setExpandedSection] = useState('property');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleChange = useCallback((updates: Partial<DeedBuilderState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/deeds/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(state),
      });

      if (!response.ok) throw new Error('Failed');
      
      const result = await response.json();
      toast.success('Deed generated!');
      router.push(`/deeds/${result.id}/success`);
    } catch {
      toast.error('Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <BuilderHeader deedType={DEED_LABELS[deedType] || deedType} />

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[420px] flex-shrink-0 border-r border-gray-300">
          <InputPanel
            state={state}
            onChange={handleChange}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            expandedSection={expandedSection}
            onSectionChange={setExpandedSection}
          />
        </div>

        <div className="flex-1">
          <PreviewPanel state={state} activeSection={expandedSection} />
        </div>
      </div>
    </div>
  );
}
```

---

## Step 8: Types

### File: `types/builder.ts`

```tsx
export interface PropertyData {
  address: string;
  city: string;
  county: string;
  state: string;
  zip: string;
  apn: string;
  legalDescription: string;
  owner?: string;
}

export interface DTTData {
  isExempt: boolean;
  exemptReason: string;
  transferValue: string;
  calculatedAmount: string;
  basis: 'full_value' | 'less_liens';
  areaType: 'city' | 'unincorporated';
  cityName?: string;
}

export interface DeedBuilderState {
  deedType: string;
  property: PropertyData | null;
  grantor: string;
  grantee: string;
  vesting: string;
  dtt: DTTData | null;
  requestedBy: string;
  returnTo: string;
}
```

---

## Step 9: Route

### File: `app/create-deed/[type]/page.tsx`

```tsx
import { DeedBuilder } from '@/features/builder/DeedBuilder';

export default function CreateDeedPage({ params }: { params: { type: string } }) {
  return <DeedBuilder deedType={params.type} />;
}
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `hooks/useBuilderMode.ts` | Sidebar collapse |
| `types/builder.ts` | TypeScript types |
| `components/builder/BuilderHeader.tsx` | Header |
| `components/builder/InputSection.tsx` | Accordion |
| `components/builder/InputPanel.tsx` | Left panel |
| `components/builder/PreviewPanel.tsx` | Right panel |
| `components/builder/sections/PropertySection.tsx` | Property |
| `components/builder/sections/GrantorSection.tsx` | Grantor |
| `components/builder/sections/GranteeSection.tsx` | Grantee |
| `components/builder/sections/VestingSection.tsx` | Vesting |
| `components/builder/sections/TransferTaxSection.tsx` | DTT |
| `components/builder/sections/RecordingSection.tsx` | Recording |
| `features/builder/DeedBuilder.tsx` | Main component |
| `app/create-deed/[type]/page.tsx` | Route |

## Dependencies

```bash
npm install framer-motion
```
