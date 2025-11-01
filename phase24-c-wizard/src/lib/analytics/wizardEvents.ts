// Lightweight, non‑blocking telemetry for Wizard
export type WizardEvent =
  | 'Wizard.StepShown'
  | 'Wizard.StepCompleted'
  | 'Wizard.ResumeDraft'
  | 'Wizard.FinalizeAttempt'
  | 'Wizard.Success'
  | 'Wizard.Error';

export function trackWizardEvent(type: WizardEvent, payload: Record<string, any> = {}) {
  try {
    // Fire‑and‑forget; do not await
    fetch('/usage/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: type,
        billable: false,
        metadata: payload,
        created_at: new Date().toISOString()
      })
    }).catch(() => {});
  } catch {}
}
