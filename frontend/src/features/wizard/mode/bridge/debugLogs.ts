export const dbg = (...args: any[]) => {
  if (typeof window !== 'undefined' && (window as any).__DEBUG_WIZARD__) {
    // eslint-disable-next-line no-console
    console.log('[WizardDBG]', ...args);
  }
};

