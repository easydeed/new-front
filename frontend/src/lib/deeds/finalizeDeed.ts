/**
 * finalizeDeed - Matches Patch 6-c's expected signature
 * Takes canonical payload and returns { success, deedId }
 */

export async function finalizeDeed(payload: any): Promise<{ success: boolean; deedId?: string }> {
  try {
    console.log('[finalizeDeed] Canonical payload received:', payload);
    
    // Get auth token
    const token = typeof window !== 'undefined' 
      ? (localStorage.getItem('token') || localStorage.getItem('access_token')) 
      : null;
    
    // Flatten canonical payload to backend format (snake_case)
    const backendPayload = {
      deed_type: payload.docType,
      property_address: payload.property?.address || '',
      apn: payload.property?.apn || '',
      county: payload.property?.county || '',
      legal_description: payload.property?.legalDescription || null,
      grantor_name: payload.parties?.grantor?.name || '',
      grantee_name: payload.parties?.grantee?.name || '',
      vesting: payload.vesting?.description || null
    };
    
    console.log('[finalizeDeed] Backend payload:', backendPayload);
    
    const res = await fetch('/api/deeds/create', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
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

