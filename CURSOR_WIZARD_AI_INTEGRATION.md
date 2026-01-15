# DeedPro Wizard Integration + AI Assistance

## Overview

This document outlines the integration work needed to connect all backend components to the frontend wizard, and introduces an AI assistance layer that guides users through the deed creation process.

**Goal:** Make DeedPro feel like having an expert title officer looking over your shoulder — catching mistakes, explaining implications, and suggesting better approaches.

---

## Part 1: Wire Up Backend Components

### 1.1 Property Search Integration

**File:** `frontend/src/components/PropertySearchWithTitlePoint.tsx`

**Current State:** Uses old SiteX endpoint, no multi-match handling, no loading states

**Changes Needed:**

```tsx
// frontend/src/components/PropertySearchWithTitlePoint.tsx

import { useState, useCallback } from 'react';
import { PropertyMatchPicker } from './PropertyMatchPicker';
import { EnrichmentStatus } from './EnrichmentStatus';

interface PropertySearchProps {
  onPropertySelected: (data: PropertyData) => void;
  onEnrichmentComplete: (data: PropertyData) => void;
}

export function PropertySearchWithTitlePoint({ 
  onPropertySelected,
  onEnrichmentComplete 
}: PropertySearchProps) {
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'enriching' | 'multi-match' | 'complete' | 'error'>('idle');
  const [multiMatches, setMultiMatches] = useState<PropertyMatch[]>([]);
  const [enrichedData, setEnrichedData] = useState<PropertyData | null>(null);
  const [searchAddress, setSearchAddress] = useState('');

  const handleAddressSelect = useCallback(async (place: google.maps.places.PlaceResult) => {
    const address = place.formatted_address || '';
    setSearchAddress(address);
    setSearchStatus('searching');

    try {
      // Call new v2 endpoint
      const response = await fetch('/api/property/search-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: extractStreetAddress(place),
          city: extractCity(place),
          state: 'CA',
          zip_code: extractZip(place),
        }),
      });

      const result = await response.json();

      if (result.status === 'multi_match') {
        setMultiMatches(result.matches);
        setSearchStatus('multi-match');
      } else if (result.status === 'success') {
        setSearchStatus('enriching');
        setEnrichedData(result.data);
        
        // Brief delay to show enrichment status
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setSearchStatus('complete');
        onEnrichmentComplete(result.data);
      } else {
        setSearchStatus('error');
      }
    } catch (error) {
      setSearchStatus('error');
    }
  }, [onEnrichmentComplete]);

  const handleMatchSelect = useCallback(async (match: PropertyMatch) => {
    setSearchStatus('enriching');
    setMultiMatches([]);

    try {
      const response = await fetch('/api/property/resolve-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fips: match.fips,
          apn: match.apn,
        }),
      });

      const result = await response.json();
      
      if (result.status === 'success') {
        setEnrichedData(result.data);
        setSearchStatus('complete');
        onEnrichmentComplete(result.data);
      } else {
        setSearchStatus('error');
      }
    } catch (error) {
      setSearchStatus('error');
    }
  }, [onEnrichmentComplete]);

  return (
    <div className="property-search-container">
      {/* Google Places Autocomplete */}
      <GooglePlacesAutocomplete
        onPlaceSelect={handleAddressSelect}
        disabled={searchStatus === 'searching' || searchStatus === 'enriching'}
        placeholder="Enter property address..."
      />

      {/* Recent Properties Quick Select */}
      <RecentPropertiesDropdown 
        onSelect={(property) => {
          // Re-enrich from recent
          handleAddressSelect({ formatted_address: property.address } as any);
        }}
      />

      {/* Enrichment Status Display */}
      {(searchStatus === 'searching' || searchStatus === 'enriching' || searchStatus === 'complete') && (
        <EnrichmentStatus 
          status={searchStatus}
          data={enrichedData}
        />
      )}

      {/* Multi-Match Picker Modal */}
      {searchStatus === 'multi-match' && (
        <PropertyMatchPicker
          matches={multiMatches}
          onSelect={handleMatchSelect}
          onCancel={() => {
            setSearchStatus('idle');
            setMultiMatches([]);
          }}
          searchAddress={searchAddress}
        />
      )}
    </div>
  );
}
```

### 1.2 Enrichment Status Component

**File:** `frontend/src/components/EnrichmentStatus.tsx` (NEW)

```tsx
// frontend/src/components/EnrichmentStatus.tsx

import { Check, Loader2, X } from 'lucide-react';

interface EnrichmentStatusProps {
  status: 'searching' | 'enriching' | 'complete' | 'error';
  data: PropertyData | null;
}

export function EnrichmentStatus({ status, data }: EnrichmentStatusProps) {
  if (status === 'searching') {
    return (
      <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg mt-4">
        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
        <span className="text-blue-800">Searching for property...</span>
      </div>
    );
  }

  if (status === 'enriching') {
    return (
      <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg mt-4">
        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
        <span className="text-blue-800">Retrieving property details...</span>
      </div>
    );
  }

  if (status === 'complete' && data) {
    return (
      <div className="p-4 bg-green-50 rounded-lg mt-4 border border-green-200">
        <div className="flex items-center gap-2 mb-3">
          <Check className="w-5 h-5 text-green-600" />
          <span className="font-medium text-green-800">Property Found</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <FieldStatus label="Address" found={!!data.address} value={data.address} />
          <FieldStatus label="APN" found={!!data.apn} value={data.apn} />
          <FieldStatus label="County" found={!!data.county} value={data.county} />
          <FieldStatus label="Owner" found={!!data.primary_owner?.full_name} value={data.primary_owner?.full_name} />
          <FieldStatus 
            label="Legal Description" 
            found={!!data.legal_description} 
            value={data.legal_description ? 'Found' : 'Not available'} 
          />
          {data.secondary_owner?.full_name && (
            <FieldStatus label="Secondary Owner" found={true} value={data.secondary_owner.full_name} />
          )}
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg mt-4">
        <X className="w-5 h-5 text-red-600" />
        <span className="text-red-800">Unable to find property. Please verify the address.</span>
      </div>
    );
  }

  return null;
}

function FieldStatus({ label, found, value }: { label: string; found: boolean; value?: string }) {
  return (
    <div className="flex items-center gap-2">
      {found ? (
        <Check className="w-4 h-4 text-green-600" />
      ) : (
        <X className="w-4 h-4 text-gray-400" />
      )}
      <span className={found ? 'text-gray-700' : 'text-gray-400'}>
        {label}: {found && value ? (value.length > 30 ? value.slice(0, 30) + '...' : value) : '—'}
      </span>
    </div>
  );
}
```

### 1.3 Vesting Input Integration

**File:** `frontend/src/features/wizard/mode/components/ConsolidatedPartiesSection.tsx`

**Changes:** Replace text input for vesting with VestingInput component

```tsx
// In ConsolidatedPartiesSection.tsx

import { VestingInput } from '@/components/ui/VestingInput';

// Replace the vesting text input with:
<VestingInput
  value={wizardState.vesting || ''}
  onChange={(value) => updateWizardState({ vesting: value })}
  granteeCount={countGrantees(wizardState.grantees_text)}
  showAIGuidance={true}
/>
```

### 1.4 Recent Properties Integration

**File:** `frontend/src/components/RecentPropertiesDropdown.tsx` (NEW)

```tsx
// frontend/src/components/RecentPropertiesDropdown.tsx

import { useState } from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import { getRecentProperties, RecentProperty } from '@/features/wizard/services/recentProperties';

interface RecentPropertiesDropdownProps {
  onSelect: (property: RecentProperty) => void;
}

export function RecentPropertiesDropdown({ onSelect }: RecentPropertiesDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const recentProperties = getRecentProperties();

  if (recentProperties.length === 0) {
    return null;
  }

  return (
    <div className="relative mt-2">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <Clock className="w-4 h-4" />
        <span>Recent properties</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
          {recentProperties.slice(0, 5).map((property, index) => (
            <button
              key={property.apn || index}
              onClick={() => {
                onSelect(property);
                setIsOpen(false);
              }}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0"
            >
              <div className="font-medium text-gray-900 text-sm">{property.address}</div>
              <div className="text-xs text-gray-500">
                {property.city} • APN: {property.apn || 'N/A'}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 1.5 Enhanced Prefill Logic

**File:** `frontend/src/features/wizard/services/propertyPrefill.ts`

```typescript
// frontend/src/features/wizard/services/propertyPrefill.ts

import { PropertyData } from '@/types/property';
import { WizardState } from '../types';
import { addRecentProperty } from './recentProperties';

/**
 * Cities in California that have their own Documentary Transfer Tax
 * These require selecting "City" in the DTT section
 */
const CITIES_WITH_OWN_DTT = [
  'los angeles',
  'san francisco', 
  'oakland',
  'berkeley',
  'san jose',
  'sacramento',
  'riverside',
  'pomona',
  'culver city',
  'santa monica',
  'redondo beach',
  'hercules',
  'hayward',
  'richmond',
  'alameda',
  'albany',
  'emeryville',
  'piedmont',
  'san leandro',
  'san pablo',
  'mountain view',
  'palo alto',
  'petaluma',
  'santa rosa',
  'sebastopol',
  'cotati',
  'cloverdale',
];

/**
 * Infer DTT area type based on city
 */
function inferDTTAreaType(city: string): 'city' | 'unincorporated' {
  if (!city) return 'unincorporated';
  return CITIES_WITH_OWN_DTT.includes(city.toLowerCase()) ? 'city' : 'unincorporated';
}

/**
 * Format owner names for grantor field
 * Handles single owner, married couples, trusts, etc.
 */
function formatGrantorName(primaryOwner: string, secondaryOwner?: string): string {
  if (!primaryOwner) return '';
  
  // If secondary owner exists, combine them
  if (secondaryOwner) {
    return `${primaryOwner} and ${secondaryOwner}`;
  }
  
  return primaryOwner;
}

/**
 * Suggest deed type based on property data and user context
 */
function suggestDeedType(propertyData: PropertyData, currentDeedType: string): string | null {
  // If transferring between spouses and using Grant Deed, suggest Interspousal
  // This would be triggered by AI analysis
  return null;
}

/**
 * Main prefill function - populates wizard state from SiteX data
 */
export function prefillFromEnrichment(
  propertyData: PropertyData,
  currentState: WizardState
): WizardState {
  const primaryOwnerName = propertyData.primary_owner?.full_name || '';
  const secondaryOwnerName = propertyData.secondary_owner?.full_name || '';
  const grantorName = formatGrantorName(primaryOwnerName, secondaryOwnerName);
  const dttAreaType = inferDTTAreaType(propertyData.city);

  // Save to recent properties
  addRecentProperty({
    address: propertyData.address,
    city: propertyData.city,
    county: propertyData.county,
    apn: propertyData.apn,
    ownerName: grantorName,
    lastUsed: new Date().toISOString(),
  });

  return {
    ...currentState,
    
    // Property identification
    propertyAddress: propertyData.address,
    city: propertyData.city,
    county: propertyData.county,
    state: propertyData.state || 'CA',
    zip: propertyData.zip_code,
    apn: propertyData.apn,
    
    // Legal description
    legalDescription: propertyData.legal_description || '',
    
    // Grantor (current owner)
    step1: {
      ...currentState.step1,
      grantorName: grantorName,
    },
    grantorName: grantorName,
    
    // DTT defaults
    dtt: {
      ...currentState.dtt,
      area_type: dttAreaType,
      city_name: dttAreaType === 'city' ? propertyData.city : '',
    },
    
    // Vesting hint if available from SiteX
    vesting: propertyData.vesting_type || currentState.vesting,
    
    // Metadata for AI assistance
    _enriched: true,
    _enrichedAt: new Date().toISOString(),
    _enrichmentSource: 'sitex',
    _primaryOwner: primaryOwnerName,
    _secondaryOwner: secondaryOwnerName,
  };
}
```

---

## Part 2: AI Assistance Layer

### 2.1 AI Service Architecture

**File:** `frontend/src/services/aiAssistant.ts` (NEW)

```typescript
// frontend/src/services/aiAssistant.ts

import Anthropic from '@anthropic-ai/sdk';

// Types
export interface AIContext {
  deedType: string;
  grantorName: string;
  granteeName: string;
  vesting: string;
  county: string;
  legalDescription: string;
  dttAmount: string;
  dttExempt: boolean;
  dttExemptReason?: string;
  propertyData?: PropertyData;
}

export interface AIGuidance {
  type: 'info' | 'warning' | 'suggestion' | 'error';
  field?: string;
  title: string;
  message: string;
  learnMoreUrl?: string;
  action?: {
    label: string;
    handler: () => void;
  };
}

export interface AIValidation {
  isValid: boolean;
  issues: AIGuidance[];
}

// System prompts for different AI tasks
const SYSTEM_PROMPTS = {
  vestingGuidance: `You are an expert California real estate title officer. Your role is to help users understand vesting options when transferring property.

Be concise but thorough. Focus on practical implications:
- Tax consequences
- Estate planning effects
- Rights of survivorship
- Creditor protection

Always recommend consulting with an attorney or tax advisor for complex situations.

Respond in 2-3 sentences maximum unless asked for more detail.`,

  deedTypeAdvisor: `You are an expert California real estate title officer. Your role is to help users select the appropriate deed type for their transaction.

Consider:
- Relationship between parties (spouses, family, unrelated)
- Whether consideration is being exchanged
- Documentary Transfer Tax implications
- Title insurance implications
- Warranties being provided

Respond in 2-3 sentences maximum.`,

  legalDescriptionReview: `You are an expert California real estate title officer reviewing a legal description.

Check for:
- Completeness (does it fully describe the parcel?)
- Common errors (missing tract info, incomplete metes and bounds)
- References to recorded documents (are book/page numbers included?)
- Consistency with APN if provided

Flag any concerns concisely.`,

  preSubmitReview: `You are an expert California real estate title officer doing a final review before a deed is generated.

Check for:
- Consistency between all fields
- Common errors (single grantee with joint tenancy vesting)
- Missing required information
- DTT calculation accuracy
- Proper party naming conventions

List any issues found. If everything looks good, say so briefly.`,
};

class AIAssistantService {
  private client: Anthropic | null = null;
  private useOpenAI: boolean = false;

  constructor() {
    // Initialize based on available API keys
    if (process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY) {
      this.client = new Anthropic({
        apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY,
        dangerouslyAllowBrowser: true, // For client-side use
      });
    }
  }

  /**
   * Get guidance on vesting selection
   */
  async getVestingGuidance(
    vestingType: string,
    granteeCount: number,
    context: Partial<AIContext>
  ): Promise<AIGuidance | null> {
    if (!this.client) return null;

    const prompt = `The user is creating a ${context.deedType || 'Grant Deed'} in ${context.county || 'California'} County.

They have ${granteeCount} grantee(s) and selected vesting: "${vestingType}"

Briefly explain what this vesting means and flag any concerns (e.g., if joint tenancy is selected but there's only one grantee).`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: SYSTEM_PROMPTS.vestingGuidance,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      
      // Determine if this is a warning or info based on content
      const isWarning = text.toLowerCase().includes('concern') || 
                        text.toLowerCase().includes('issue') ||
                        text.toLowerCase().includes('error') ||
                        text.toLowerCase().includes('incorrect');

      return {
        type: isWarning ? 'warning' : 'info',
        field: 'vesting',
        title: isWarning ? 'Vesting Concern' : 'About This Vesting',
        message: text,
      };
    } catch (error) {
      console.error('AI vesting guidance error:', error);
      return null;
    }
  }

  /**
   * Suggest the best deed type based on context
   */
  async suggestDeedType(context: {
    relationship: string;
    hasConsideration: boolean;
    currentDeedType: string;
    grantorName: string;
    granteeName: string;
  }): Promise<AIGuidance | null> {
    if (!this.client) return null;

    const prompt = `User is creating a ${context.currentDeedType}.

Grantor: ${context.grantorName}
Grantee: ${context.granteeName}
Relationship between parties: ${context.relationship}
Is consideration being exchanged: ${context.hasConsideration ? 'Yes' : 'No/Gift'}

Is ${context.currentDeedType} the best choice? If not, what would you recommend and why?`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: SYSTEM_PROMPTS.deedTypeAdvisor,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      
      // Only show if suggesting a different deed type
      if (text.toLowerCase().includes('recommend') || text.toLowerCase().includes('suggest')) {
        return {
          type: 'suggestion',
          title: 'Deed Type Suggestion',
          message: text,
        };
      }
      
      return null;
    } catch (error) {
      console.error('AI deed type suggestion error:', error);
      return null;
    }
  }

  /**
   * Review legal description for issues
   */
  async reviewLegalDescription(
    legalDescription: string,
    apn: string,
    county: string
  ): Promise<AIGuidance | null> {
    if (!this.client || !legalDescription || legalDescription.length < 20) return null;

    const prompt = `Review this legal description for a property in ${county} County, California:

Legal Description:
${legalDescription}

APN: ${apn || 'Not provided'}

Flag any concerns about completeness or accuracy.`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        system: SYSTEM_PROMPTS.legalDescriptionReview,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      
      // Only show if there are concerns
      const hasConcerns = text.toLowerCase().includes('concern') ||
                          text.toLowerCase().includes('missing') ||
                          text.toLowerCase().includes('incomplete') ||
                          text.toLowerCase().includes('error') ||
                          text.toLowerCase().includes('issue');

      if (hasConcerns) {
        return {
          type: 'warning',
          field: 'legalDescription',
          title: 'Legal Description Review',
          message: text,
        };
      }
      
      return null;
    } catch (error) {
      console.error('AI legal description review error:', error);
      return null;
    }
  }

  /**
   * Pre-submit validation of entire deed
   */
  async validateBeforeSubmit(context: AIContext): Promise<AIValidation> {
    if (!this.client) {
      return { isValid: true, issues: [] };
    }

    const prompt = `Review this deed before generation:

Deed Type: ${context.deedType}
County: ${context.county}

GRANTOR: ${context.grantorName}
GRANTEE: ${context.granteeName}
VESTING: ${context.vesting || 'Not specified'}

Legal Description: ${context.legalDescription?.slice(0, 500) || 'Not provided'}...

DTT Amount: $${context.dttAmount || '0.00'}
DTT Exempt: ${context.dttExempt ? 'Yes - ' + (context.dttExemptReason || 'No reason given') : 'No'}

List any issues or concerns. If everything looks correct, say "No issues found."`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: SYSTEM_PROMPTS.preSubmitReview,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      
      if (text.toLowerCase().includes('no issues found') || 
          text.toLowerCase().includes('everything looks correct') ||
          text.toLowerCase().includes('looks good')) {
        return { isValid: true, issues: [] };
      }

      // Parse issues from response
      const issues: AIGuidance[] = [{
        type: 'warning',
        title: 'Pre-Submit Review',
        message: text,
      }];

      return { isValid: false, issues };
    } catch (error) {
      console.error('AI validation error:', error);
      return { isValid: true, issues: [] };
    }
  }

  /**
   * Answer a user question about deeds/title
   */
  async askQuestion(question: string, context: Partial<AIContext>): Promise<string> {
    if (!this.client) {
      return "AI assistance is not available. Please check your API configuration.";
    }

    const systemPrompt = `You are an expert California real estate title officer assistant in DeedPro, a deed generation application.

Answer questions about:
- California deed types (Grant, Quitclaim, Interspousal, Warranty, Tax)
- Vesting options and implications
- Documentary Transfer Tax rules and exemptions
- Legal descriptions
- Recording requirements

Be concise, accurate, and helpful. If something requires legal advice, recommend consulting an attorney.

Current context:
- Deed Type: ${context.deedType || 'Not selected'}
- County: ${context.county || 'Not specified'}`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: 'user', content: question }],
      });

      return response.content[0].type === 'text' ? response.content[0].text : 'Unable to process question.';
    } catch (error) {
      console.error('AI question error:', error);
      return 'Sorry, I encountered an error processing your question.';
    }
  }
}

// Export singleton instance
export const aiAssistant = new AIAssistantService();
```

### 2.2 AI Guidance Display Component

**File:** `frontend/src/components/AIGuidance.tsx` (NEW)

```tsx
// frontend/src/components/AIGuidance.tsx

import { useState } from 'react';
import { 
  Lightbulb, 
  AlertTriangle, 
  Info, 
  XCircle, 
  ChevronDown,
  ChevronUp,
  Sparkles 
} from 'lucide-react';
import { AIGuidance as AIGuidanceType } from '@/services/aiAssistant';

interface AIGuidanceProps {
  guidance: AIGuidanceType;
  onDismiss?: () => void;
  expandable?: boolean;
}

export function AIGuidance({ guidance, onDismiss, expandable = true }: AIGuidanceProps) {
  const [isExpanded, setIsExpanded] = useState(!expandable);

  const styles = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: <Info className="w-5 h-5 text-blue-600" />,
      titleColor: 'text-blue-800',
      textColor: 'text-blue-700',
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
      titleColor: 'text-amber-800',
      textColor: 'text-amber-700',
    },
    suggestion: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      icon: <Lightbulb className="w-5 h-5 text-purple-600" />,
      titleColor: 'text-purple-800',
      textColor: 'text-purple-700',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: <XCircle className="w-5 h-5 text-red-600" />,
      titleColor: 'text-red-800',
      textColor: 'text-red-700',
    },
  };

  const style = styles[guidance.type];

  return (
    <div className={`${style.bg} ${style.border} border rounded-lg p-4 mt-3`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {style.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className={`font-medium ${style.titleColor}`}>
                {guidance.title}
              </h4>
              <Sparkles className="w-3 h-3 text-gray-400" />
            </div>
            
            <div className="flex items-center gap-2">
              {expandable && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1 hover:bg-white/50 rounded"
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              )}
              
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="p-1 hover:bg-white/50 rounded"
                >
                  <XCircle className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>
          
          {(isExpanded || !expandable) && (
            <p className={`mt-1 text-sm ${style.textColor}`}>
              {guidance.message}
            </p>
          )}
          
          {guidance.action && isExpanded && (
            <button
              onClick={guidance.action.handler}
              className="mt-2 text-sm font-medium underline hover:no-underline"
            >
              {guidance.action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 2.3 AI Help Button Component

**File:** `frontend/src/components/AIHelpButton.tsx` (NEW)

```tsx
// frontend/src/components/AIHelpButton.tsx

import { useState } from 'react';
import { MessageCircleQuestion, X, Send, Loader2 } from 'lucide-react';
import { aiAssistant, AIContext } from '@/services/aiAssistant';

interface AIHelpButtonProps {
  context: Partial<AIContext>;
  fieldName?: string;
  placeholder?: string;
}

export function AIHelpButton({ context, fieldName, placeholder }: AIHelpButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAsk = async () => {
    if (!question.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await aiAssistant.askQuestion(question, context);
      setAnswer(response);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-purple-600 transition-colors"
        title="Ask AI for help"
      >
        <MessageCircleQuestion className="w-4 h-4" />
        <span>Ask AI</span>
      </button>
    );
  }

  return (
    <div className="mt-2 p-4 bg-purple-50 border border-purple-200 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageCircleQuestion className="w-5 h-5 text-purple-600" />
          <span className="font-medium text-purple-800">AI Assistant</span>
        </div>
        <button
          onClick={() => {
            setIsOpen(false);
            setQuestion('');
            setAnswer('');
          }}
          className="p-1 hover:bg-purple-100 rounded"
        >
          <X className="w-4 h-4 text-purple-600" />
        </button>
      </div>

      {answer ? (
        <div>
          <p className="text-sm text-purple-900 mb-3">{answer}</p>
          <button
            onClick={() => {
              setQuestion('');
              setAnswer('');
            }}
            className="text-sm text-purple-600 hover:underline"
          >
            Ask another question
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            placeholder={placeholder || `Ask about ${fieldName || 'this field'}...`}
            className="flex-1 px-3 py-2 text-sm border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={isLoading}
          />
          <button
            onClick={handleAsk}
            disabled={isLoading || !question.trim()}
            className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
```

### 2.4 Integration into Wizard Steps

**File:** `frontend/src/features/wizard/mode/engines/ModernEngine.tsx`

Add AI validation before submission:

```tsx
// In ModernEngine.tsx

import { aiAssistant, AIContext, AIGuidance as AIGuidanceType } from '@/services/aiAssistant';
import { AIGuidance } from '@/components/AIGuidance';

// Inside the component:
const [aiGuidance, setAIGuidance] = useState<AIGuidanceType[]>([]);
const [isValidating, setIsValidating] = useState(false);

// Before generating PDF:
const handleGenerateDeed = async () => {
  setIsValidating(true);
  
  // Build AI context from wizard state
  const aiContext: AIContext = {
    deedType: wizardState.deedType,
    grantorName: wizardState.grantorName || wizardState.step1?.grantorName,
    granteeName: wizardState.granteeName,
    vesting: wizardState.vesting,
    county: wizardState.county,
    legalDescription: wizardState.legalDescription,
    dttAmount: wizardState.dtt?.amount,
    dttExempt: wizardState.dtt?.is_exempt,
    dttExemptReason: wizardState.dtt?.exempt_reason,
  };

  // Run AI validation
  const validation = await aiAssistant.validateBeforeSubmit(aiContext);
  
  setIsValidating(false);
  
  if (!validation.isValid) {
    setAIGuidance(validation.issues);
    // Don't block, but show warnings
  }
  
  // Proceed with generation
  await generatePDF();
};

// In the render, show AI guidance:
{aiGuidance.length > 0 && (
  <div className="mb-4">
    {aiGuidance.map((guidance, index) => (
      <AIGuidance
        key={index}
        guidance={guidance}
        onDismiss={() => setAIGuidance(prev => prev.filter((_, i) => i !== index))}
      />
    ))}
  </div>
)}
```

### 2.5 Vesting Input with AI Guidance

Update VestingInput to show AI guidance when vesting changes:

```tsx
// frontend/src/components/ui/VestingInput.tsx

import { useState, useEffect } from 'react';
import { aiAssistant, AIGuidance as AIGuidanceType } from '@/services/aiAssistant';
import { AIGuidance } from '@/components/AIGuidance';
import { AIHelpButton } from '@/components/AIHelpButton';

// Add to component:
const [guidance, setGuidance] = useState<AIGuidanceType | null>(null);
const [isLoadingGuidance, setIsLoadingGuidance] = useState(false);

// Fetch guidance when vesting changes
useEffect(() => {
  if (!showAIGuidance || !value) {
    setGuidance(null);
    return;
  }

  const fetchGuidance = async () => {
    setIsLoadingGuidance(true);
    const result = await aiAssistant.getVestingGuidance(
      value,
      granteeCount,
      { deedType, county }
    );
    setGuidance(result);
    setIsLoadingGuidance(false);
  };

  // Debounce
  const timer = setTimeout(fetchGuidance, 500);
  return () => clearTimeout(timer);
}, [value, granteeCount, deedType, county, showAIGuidance]);

// In render:
{guidance && (
  <AIGuidance guidance={guidance} onDismiss={() => setGuidance(null)} />
)}

{/* Help button for questions */}
<AIHelpButton
  context={{ deedType, county }}
  fieldName="vesting"
  placeholder="E.g., What's the difference between joint tenants and community property?"
/>
```

---

## Part 3: Environment Configuration

### 3.1 Environment Variables

Add to `.env.local`:

```bash
# AI Assistance (Anthropic Claude)
NEXT_PUBLIC_ANTHROPIC_API_KEY=your_anthropic_api_key

# Or use OpenAI
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key

# Feature flags
NEXT_PUBLIC_AI_ASSISTANCE_ENABLED=true
NEXT_PUBLIC_AI_VALIDATION_ENABLED=true
```

### 3.2 Package Dependencies

Add to `package.json`:

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.27.0"
  }
}
```

---

## Part 4: Testing Checklist

### Frontend Integration Tests

- [ ] Property search triggers SiteX v2 endpoint
- [ ] Multi-match displays PropertyMatchPicker modal
- [ ] Match selection resolves to single property
- [ ] Enrichment status shows field checklist
- [ ] Recent properties dropdown appears after first search
- [ ] Selecting recent property re-enriches data
- [ ] VestingInput shows all California options
- [ ] Trust vesting shows trust name input
- [ ] Custom vesting shows text input

### AI Assistance Tests

- [ ] Vesting guidance appears after selection
- [ ] Warning shows for single grantee + joint tenancy
- [ ] Pre-submit validation catches common errors
- [ ] AI Help button opens question interface
- [ ] Questions receive relevant answers
- [ ] Guidance can be dismissed
- [ ] AI errors don't block deed generation

### Edge Cases

- [ ] Works without AI API key configured
- [ ] Graceful fallback when AI calls fail
- [ ] Loading states don't block user input
- [ ] Guidance doesn't appear for empty fields

---

## Summary of New Files

| File | Purpose |
|------|---------|
| `frontend/src/components/EnrichmentStatus.tsx` | Shows SiteX enrichment results |
| `frontend/src/components/RecentPropertiesDropdown.tsx` | Quick-select recent properties |
| `frontend/src/services/aiAssistant.ts` | AI service for guidance/validation |
| `frontend/src/components/AIGuidance.tsx` | Display AI guidance cards |
| `frontend/src/components/AIHelpButton.tsx` | Inline AI question interface |

## Files to Modify

| File | Changes |
|------|---------|
| `PropertySearchWithTitlePoint.tsx` | Add multi-match, loading states, recent properties |
| `ConsolidatedPartiesSection.tsx` | Integrate VestingInput |
| `propertyPrefill.ts` | Enhanced prefill with DTT inference |
| `ModernEngine.tsx` | Add AI validation before submit |
| `VestingInput.tsx` | Add AI guidance integration |
