// frontend/src/lib/deeds/finalizeDeed.ts
// Canonical V6 — single source of truth
// - Builds backend payload from canonical
// - Repairs missing canonical fields from Modern state/localStorage when possible
// - Prevents blank deed creation
// - Adds trace headers for forensic clarity

type AnyObj = Record<string, any>;

function get(obj: AnyObj | null | undefined, path: (string|number)[], dflt?: any) {
  let x: any = obj;
  for (const k of path) {
    if (x == null) return dflt;
    x = x[k as any];
  }
  return (x == null ? dflt : x);
}
function set(obj: AnyObj, path: (string|number)[], val: any) {
  let x: any = obj;
  for (let i=0;i<path.length-1;i++) {
    const k = path[i] as any;
    x[k] = x[k] ?? {};
    x = x[k];
  }
  x[path[path.length-1] as any] = val;
  return obj;
}

function readModernDraft(): AnyObj | null {
  try {
    if (typeof window === 'undefined') return null;
    const s = localStorage.getItem('deedWizardDraft_modern');
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

function assertBackendReady(b: AnyObj) {
  const missing: string[] = [];
  if (!b.grantor_name) missing.push('grantor_name');
  if (!b.grantee_name) missing.push('grantee_name');
  if (!b.legal_description) missing.push('legal_description');
  return { ok: missing.length === 0, missing };
}

export async function finalizeDeed(
  canonical: AnyObj,
  opts?: { docType?: string; state?: AnyObj; mode?: string }
): Promise<{ success: boolean; deedId?: string }> {
  try {
    console.log('[finalizeDeed v6] Canonical payload received:', canonical);

    const state = opts?.state ?? readModernDraft() ?? {};
    console.log('[finalizeDeed v6] State/localStorage:', JSON.stringify(state, null, 2));
    const docType = canonical?.deedType || opts?.docType || canonical?.docType || 'grant-deed';
    const mode = opts?.mode || 'modern';

    // Repair canonical if adapter left critical fields empty
    const repaired = { ...canonical };
    const g1 = get(repaired, ['parties','grantor','name']) || state?.grantorName || '';
    const g2 = get(repaired, ['parties','grantee','name']) || state?.granteeName || '';
    const ld = get(repaired, ['property','legalDescription']) || state?.legalDescription || '';
    console.log('[finalizeDeed v6] Rescue mapping - g1:', g1, 'g2:', g2, 'ld:', ld);
    set(repaired, ['parties','grantor','name'], g1);
    set(repaired, ['parties','grantee','name'], g2);
    set(repaired, ['property','legalDescription'], ld);
    console.log('[finalizeDeed v6] Repaired canonical:', JSON.stringify(repaired, null, 2));

    // Build backend payload (snake_case)
    const backendPayload: AnyObj = {
      deed_type: docType,
      property_address: get(repaired, ['property','address']) || state?.propertyAddress || '',
      apn: get(repaired, ['property','apn']) || state?.apn || '',
      county: get(repaired, ['property','county']) || state?.county || '',
      legal_description: get(repaired, ['property','legalDescription']) || '',
      grantor_name: get(repaired, ['parties','grantor','name']) || '',
      grantee_name: get(repaired, ['parties','grantee','name']) || '',
      vesting: get(repaired, ['vesting','description']) || state?.vesting || null,
      // Tag for server-side guardrails & analysis
      source: 'modern-canonical',
    };

    console.log('[finalizeDeed v6] Backend payload (pre-check):', backendPayload);
    console.log('[finalizeDeed v6] Backend payload JSON:', JSON.stringify(backendPayload, null, 2));

    // Guard: never create blank deed
    const check = assertBackendReady(backendPayload);
    if (!check.ok) {
      console.error('[finalizeDeed v6] Missing required fields before create:', check.missing, { repaired, state });
      if (typeof window !== 'undefined') {
        alert('Some required fields are missing: ' + check.missing.join(', ') + '. Please review and try again.');
      }
      return { success: false };
    }

    const token = (typeof window !== 'undefined')
      ? (localStorage.getItem('access_token') || localStorage.getItem('token'))
      : null;

    const headers: AnyObj = {
      'Content-Type': 'application/json',
      'x-client-flow': 'modern-engine',
      'x-ui-component': 'smartreview-review',
      'x-build-sha': (typeof process !== 'undefined' && (process as any).env
        ? ((process as any).env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
           (process as any).env.NEXT_PUBLIC_BUILD_SHA || 'dev')
        : 'dev'),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/deeds/create', {
      method: 'POST',
      headers: headers as any,
      body: JSON.stringify(backendPayload)
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.error('[finalizeDeed v6] API error:', res.status, txt);
      return { success: false };
    }

    const data = await res.json().catch(()=> ({}));
    const deedId = data?.id || data?.deedId || data?.deed_id;
    console.log('[finalizeDeed v6] Success! Deed ID:', deedId);

    // Redirect is handled by caller (ModernEngine) to preserve ?mode
    return { success: Boolean(deedId), deedId: (deedId ? String(deedId) : undefined) };
  } catch (e: any) {
    console.error('[finalizeDeed v6] Exception:', e);
    return { success: false };
  }
}
