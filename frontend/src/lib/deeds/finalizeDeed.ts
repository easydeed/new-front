/**
 * finalizeDeed - Matches Patch 6-c's expected signature
 * Takes canonical payload and returns { success, deedId }
 */


function assertPayloadComplete(payload:any) {
  const g1 = payload?.parties?.grantor?.name?.trim?.();
  const g2 = payload?.parties?.grantee?.name?.trim?.();
  const ld = payload?.property?.legalDescription?.trim?.();
  const missing = [];
  if (!g1) missing.push('grantor_name');
  if (!g2) missing.push('grantee_name');
  if (!ld) missing.push('legal_description');
  if (missing.length) {
    console.error('[finalizeDeed] Missing required fields before create:', { missing, payload });
    return { ok: false, missing };
  }
  return { ok: true };
}

export async function finalizeDeed(payload: any): Promise<{ success: boolean; deedId?: string }> {
  try {
    console.log('[finalizeDeed] Canonical payload received:', payload);
    const check = assertPayloadComplete(payload);
    if (!check.ok) {
      alert('Missing required fields: ' + check.missing.join(', ') + '. Please review and try again.');
      return { success: false };
    }
    
    // Get auth token
    const token = typeof window !== 'undefined' 
      ? (localStorage.getItem('token') || localStorage.getItem('access_token')) 
      : null;
    
    // Flatten canonical payload to backend format (snake_case)
    const backendPayload = {
      deed_type: payload.deedType,  // FIXED: was payload.docType
      property_address: payload.property?.address || '',
      apn: payload.property?.apn || '',
      county: payload.property?.county || '',
      legal_description: payload.property?.legalDescription || null,
      grantor_name: payload.parties?.grantor?.name || '',
      grantee_name: payload.parties?.grantee?.name || '',
      vesting: payload.vesting?.description || null,
      source: 'modern'
    };
    
    console.log('[finalizeDeed] Backend payload:', backendPayload);
    
    const res = await fetch('/api/deeds/create', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        'x-client-flow': 'modern-engine',
        'x-ui-component': 'smartreview-review',
        'x-build-sha': process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_BUILD_SHA || 'dev'
      },
      body: JSON.stringify(backendPayload)
    });
    
    if (!res.ok) {
      const txt = await res.text();
      console.error('[finalizeDeed] API error:', txt);
      return { success: false };
    }
    
    const data = await res.json();
    const deedId = data?.id || data?.deedId;
    
    console.log('[finalizeDeed] Success! Deed ID:', deedId);
    
    return { 
      success: Boolean(deedId), 
      deedId: String(deedId) 
    };
  } catch (e: any) {
    console.error('[finalizeDeed] Exception:', e);
    return { success: false };
  }
}

