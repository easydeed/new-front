// Phase 11 - Wizard Integration: Flow Registry
// This file defines the step sequences for each deed type

export type DocType =
  | 'grant_deed'
  | 'quitclaim'
  | 'interspousal_transfer'
  | 'warranty_deed'
  | 'tax_deed';

export type StepId =
  | 'Address'
  | 'RequestDetails'
  | 'Tax'
  | 'Parties'
  | 'DTTExemption'
  | 'Covenants'
  | 'TaxSaleRef'
  | 'Preview';

/**
 * Flow registry mapping deed types to their step sequences.
 * 
 * Grant Deed: 5 steps (unchanged crown jewel)
 * Quitclaim: 4 steps (no tax step)
 * Interspousal: 5 steps (+ DTTExemption instead of Tax)
 * Warranty: 5 steps (+ Covenants instead of Tax)
 * Tax Deed: 5 steps (+ TaxSaleRef instead of Tax)
 */
export const flows: Record<DocType, StepId[]> = {
  grant_deed: ['Address', 'RequestDetails', 'Tax', 'Parties', 'Preview'],
  quitclaim: ['Address', 'RequestDetails', 'Parties', 'Preview'],
  interspousal_transfer: ['Address', 'RequestDetails', 'DTTExemption', 'Parties', 'Preview'],
  warranty_deed: ['Address', 'RequestDetails', 'Covenants', 'Parties', 'Preview'],
  tax_deed: ['Address', 'RequestDetails', 'TaxSaleRef', 'Parties', 'Preview'],
};

/**
 * Get the step sequence for a given document type.
 * Falls back to grant_deed flow if type not found.
 */
export function getFlowForDocType(docType: string): StepId[] {
  return flows[docType as DocType] ?? flows.grant_deed;
}

/**
 * Get the total number of steps for a given document type.
 */
export function getStepCount(docType: string): number {
  return getFlowForDocType(docType).length;
}

/**
 * Get the step number (1-indexed) for a given step ID in a flow.
 * Returns 0 if step not found.
 */
export function getStepNumber(docType: string, stepId: StepId): number {
  const flow = getFlowForDocType(docType);
  const index = flow.indexOf(stepId);
  return index >= 0 ? index + 1 : 0;
}

/**
 * Check if a step exists in a flow.
 */
export function hasStep(docType: string, stepId: StepId): boolean {
  return getFlowForDocType(docType).includes(stepId);
}

