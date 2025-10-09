'use client';
import React, { useMemo, useState } from 'react';
import PreviewTitle from '@/features/wizard/components/PreviewTitle';
import { FEATURE_FLAGS } from '@/features/wizard/lib/featureFlags';
import { downloadFromResponse } from '@/features/wizard/lib/download'; // if you already have, else adjust
// TODO: wire to your context + adapters
// import { useWizardStore } from '@/features/wizard/store';
// import { toQuitclaimContext, toInterspousalContext, toWarrantyContext, toTaxDeedContext } from '@/features/wizard/context/buildContext';
import { saveDeedMetadata } from '@/features/wizard/services/deeds';

type DocType = 'grant_deed_ca'|'quitclaim_deed_ca'|'interspousal_transfer_ca'|'warranty_deed_ca'|'tax_deed_ca';

function getGenerateEndpoint(docType: DocType) {
  switch (docType) {
    case 'grant_deed_ca': return '/api/generate/grant-deed-ca';
    case 'quitclaim_deed_ca': return '/api/generate/quitclaim-deed-ca';
    case 'interspousal_transfer_ca': return '/api/generate/interspousal-transfer-ca';
    case 'warranty_deed_ca': return '/api/generate/warranty-deed-ca';
    case 'tax_deed_ca': return '/api/generate/tax-deed-ca';
    default: return '/api/generate/grant-deed-ca';
  }
}

export default function Step5PreviewFixed(props: { docType: DocType; contextBuilder?: (store:any)=>any; store?: any; onSuccess?: ()=>void }) {
  const { docType, contextBuilder, store, onSuccess } = props;
  const [isBusy, setIsBusy] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const token = (typeof window !== 'undefined') ? localStorage.getItem('token') : null;

  const endpoint = getGenerateEndpoint(docType);
  const filenameBase = useMemo(()=>docType.replace(/_ca$/, ''), [docType]);

  async function handleGeneratePreview() {
    setIsBusy(true); setError(null);
    try {
      const body = contextBuilder ? contextBuilder(store) : store; // safe default
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(()=>({ detail: 'Failed to generate' }));
        throw new Error(j.detail || 'Failed to generate');
      }
      const b = await res.blob();
      setBlob(b);
      const url = URL.createObjectURL(b);
      setBlobUrl(url);
    } catch (e:any) {
      setError(e?.message || 'Failed to generate');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleFinalize() {
    if (!blob) return;
    // 1) download
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${filenameBase}_${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    // 2) persist
    try {
      const body = {
        deed_type: docType,
        status: 'completed',
        property_address: store?.property?.addressLine || '',
        grantor: Array.isArray(store?.parties?.grantors) ? store.parties.grantors.join('; ') : (store?.parties?.grantors || ''),
        grantee: Array.isArray(store?.parties?.grantees) ? store.parties.grantees.join('; ') : (store?.parties?.grantees || ''),
        metadata: store || {},
      };
      await saveDeedMetadata(body, token || undefined);
      localStorage.removeItem('deedWizardDraft'); // if used
      if (onSuccess) onSuccess();
      // Fallback redirect
      if (typeof window !== 'undefined') window.location.href = '/past-deeds?success=1';
    } catch (e:any) {
      setError(e?.message || 'Saved PDF but failed to persist metadata');
    }
  }

  const showEmbed = FEATURE_FLAGS.EMBED_PDF_PREVIEW && !!blobUrl;

  return (
    <section>
      <PreviewTitle docType={docType} />
      {!blobUrl ? (
        <div>
          <p>Generate a preview using the exact PDF templates. You can make edits, then finalize and save.</p>
          <button onClick={handleGeneratePreview} disabled={isBusy}>
            {isBusy ? 'Generating…' : 'Generate PDF Preview'}
          </button>
          {error && <p style={{ color:'crimson' }}>{error}</p>}
        </div>
      ) : (
        <div>
          {showEmbed ? (
            <iframe src={blobUrl} style={{ width:'100%', height:'70vh', border:'1px solid #ddd' }} />
          ) : (
            <div style={{ padding:'12px', background:'#f9fafb', border:'1px dashed #ccc' }}>
              <p>Preview ready. Click “Finalize & Save” to download and record this deed in your dashboard.</p>
            </div>
          )}
          <div style={{ display:'flex', gap:12, marginTop:12 }}>
            <button onClick={()=>{ URL.revokeObjectURL(blobUrl!); setBlobUrl(null); setBlob(null); }}>Edit Document</button>
            {FEATURE_FLAGS.REQUIRE_FINALIZE && <button onClick={handleFinalize} className="primary">Finalize & Save to Dashboard</button>}
          </div>
          {error && <p style={{ color:'crimson' }}>{error}</p>}
        </div>
      )}
    </section>
  );
}
