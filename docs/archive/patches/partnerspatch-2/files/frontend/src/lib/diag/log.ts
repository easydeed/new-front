// frontend/src/lib/diag/log.ts
export const DIAG = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_DIAG === '1');

export function dlog(prefix: string, ...args: any[]) {
  if (!DIAG) return;
  try {
    // Structured + plain for visibility
    console.log(`[${prefix}]`, ...args);
  } catch { /* no-op */ }
}
