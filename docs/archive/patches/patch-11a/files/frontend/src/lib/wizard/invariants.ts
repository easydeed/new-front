// frontend/src/lib/wizard/invariants.ts
// Foundation v8: lightweight runtime guards you can toggle via NEXT_PUBLIC_DIAG=1
export const DIAG = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_DIAG === '1');

export type WizardInvariantConfig = {
  expectedTotal?: number;      // Constant step count we expect (e.g., 5)
  label?: string;              // For log context
};

export function assertStableSteps(steps: any[], currentIndex: number, cfg: WizardInvariantConfig = {}) {
  try {
    const exp = cfg.expectedTotal ?? steps.length;
    if (DIAG) console.log(`[WizardInvariant] ${cfg.label || ''} steps=${steps.length} currentIndex=${currentIndex} expected=${exp}`);
    if (!Array.isArray(steps)) throw new Error('steps not array');
    if (steps.length !== exp) {
      console.warn('[WizardInvariant] Step count changed at runtime!', { have: steps.length, expected: exp });
    }
    if (currentIndex < 0 || currentIndex >= steps.length) {
      console.warn('[WizardInvariant] Current index out of range', { currentIndex, len: steps.length });
    }
  } catch (e) {
    console.warn('[WizardInvariant] Exception', e);
  }
}
