// frontend/src/features/wizard/validation/useValidation.ts
'use client';

import { useMemo } from 'react';
import { validateCanonical } from './zodSchemas';
import { toCanonicalFromWizardData } from './adapters';

type ValidationIssue = { path: string; message: string; code: 'VALIDATION_ERROR' };

export function useFinalizeValidator(getWizardData: () => any) {
  return useMemo(() => {
    return {
      run: (docType?: string) => {
        const wd = getWizardData();
        const effectiveDoc = wd?.docType || docType || 'grant-deed';
        const canonical = toCanonicalFromWizardData(wd, effectiveDoc);
        const res = validateCanonical(effectiveDoc, canonical);
        return { canonical, result: res };
      },
    };
  }, [getWizardData]);
}

// Minimal mapping from error path → step index (so we can auto-scroll the user)
export function mapErrorToStep(path: string): number {
  // Conservative heuristic (adjust to your step config if needed)
  if (path.startsWith('property.')) return 0;     // property/summary
  if (path.startsWith('parties.')) return 1;      // grantor/grantee
  if (path.startsWith('vesting.')) return 2;      // vesting / other
  // fallback to review
  return 3;
}

// Pretty label from path
export function labelFor(path: string): string {
  const map: Record<string, string> = {
    'property.address': 'Property address',
    'property.apn': 'APN',
    'property.county': 'County',
    'property.legalDescription': 'Legal description',
    'parties.grantor.name': 'Grantor name',
    'parties.grantee.name': 'Grantee name',
    'transferTax.amount': 'Transfer tax amount / exemption',
  };
  return map[path] || path;
}
