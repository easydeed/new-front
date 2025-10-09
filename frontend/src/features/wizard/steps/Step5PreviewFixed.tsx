'use client';
import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import PreviewTitle from '@/features/wizard/components/PreviewTitle';
import { FEATURE_FLAGS } from '@/features/wizard/lib/featureFlags';
import { saveDeedMetadata } from '@/features/wizard/services/deeds';
import type { DocType } from '@/features/wizard/components/PreviewTitle';

interface Step5PreviewFixedProps {
  docType: DocType;
  onStepChange: (step: number) => void;
  wizardData: any;
  contextBuilder: (data: any) => any;
}

function getGenerateEndpoint(docType: DocType) {
  const usePixelPerfectPDF = process.env.NEXT_PUBLIC_PDF_PIXEL_PERFECT === 'true';
  
  switch (docType) {
    case 'grant_deed':
      return usePixelPerfectPDF 
        ? '/api/generate/grant-deed-ca-pixel'
        : '/api/generate/grant-deed-ca';
    case 'quitclaim':
      return '/api/generate/quitclaim-deed-ca';
    case 'interspousal_transfer':
      return '/api/generate/interspousal-transfer-ca';
    case 'warranty_deed':
      return '/api/generate/warranty-deed-ca';
    case 'tax_deed':
      return '/api/generate/tax-deed-ca';
    default:
      return '/api/generate/grant-deed-ca';
  }
}

export default function Step5PreviewFixed({
  docType,
  onStepChange,
  wizardData,
  contextBuilder,
}: Step5PreviewFixedProps) {
  const router = useRouter();
  const [isBusy, setIsBusy] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const endpoint = getGenerateEndpoint(docType);
  const filenameBase = useMemo(() => docType.replace(/_/g, '_'), [docType]);

  // Get auth token
  const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token') || localStorage.getItem('token');
  };

  async function handleGeneratePreview() {
    setIsBusy(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const token = getToken();
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Build context using the adapter
      const payload = contextBuilder(wizardData);
      
      console.log(`[Phase 11] Generating PDF for ${docType}`, { endpoint, payload });

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Authentication expired. Please refresh and log in again.');
        }
        const j = await res.json().catch(() => ({ detail: 'Failed to generate PDF' }));
        throw new Error(j.detail || 'Failed to generate PDF');
      }

      const b = await res.blob();
      setBlob(b);
      const url = URL.createObjectURL(b);
      setBlobUrl(url);
      setSuccessMessage('PDF generated successfully! Review it below, then click "Finalize & Save".');
    } catch (e: any) {
      console.error('[Phase 11] PDF generation error:', e);
      setError(e?.message || 'Failed to generate PDF');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleFinalize() {
    if (!blob) return;
    
    setIsBusy(true);
    setError(null);
    
    try {
      const token = getToken();

      // 1. Download PDF
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${filenameBase}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      // 2. Save to database (use context adapter output for consistency)
      const contextData = contextBuilder(wizardData);
      
      const payload = {
        deed_type: docType,
        property_address: contextData.property_address || '',
        apn: contextData.apn || '',
        county: contextData.county || '',
        legal_description: contextData.legal_description || '',
        grantee_name: contextData.grantees_text || '',
        vesting: '', // Could be extracted from wizard if needed
        owner_type: '', // Could be extracted from wizard if needed
        sales_price: null, // Could be extracted from DTT data if needed
      };

      console.log('[Phase 11] Saving deed metadata:', payload);
      
      await saveDeedMetadata(payload, token || undefined);

      // 3. Clear draft
      localStorage.removeItem('deedWizardDraft');

      // 4. Show success
      setSuccessMessage('✅ Deed finalized and saved successfully!');

      // 5. Redirect to Past Deeds
      setTimeout(() => {
        router.push('/past-deeds?success=1');
      }, 2000);
    } catch (e: any) {
      console.error('[Phase 11] Finalize error:', e);
      setError(e?.message || 'PDF downloaded but failed to save metadata to database');
    } finally {
      setIsBusy(false);
    }
  }

  function handleEditDocument() {
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
    }
    setBlobUrl(null);
    setBlob(null);
    setError(null);
    setSuccessMessage(null);
  }

  const showEmbed = FEATURE_FLAGS.EMBED_PDF_PREVIEW && !!blobUrl;

  return (
    <div className="space-y-6">
      <div>
        <PreviewTitle docType={docType} />
        <p className="text-gray-600 text-center">
          Review your deed before finalizing and saving to your dashboard
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Stage 1: Generate Preview */}
      {!blobUrl ? (
        <div className="rounded-2xl border p-6 bg-white shadow-sm">
          <p className="mb-4 text-gray-700">
            Generate a preview using the exact PDF templates. You can review the document, 
            make edits if needed, then finalize and save to your dashboard.
          </p>
          
          <button
            onClick={handleGeneratePreview}
            disabled={isBusy}
            className="px-5 py-2 rounded-xl border border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isBusy ? 'Generating PDF...' : 'Generate PDF Preview'}
          </button>
        </div>
      ) : (
        /* Stage 2: Review & Finalize */
        <div className="rounded-2xl border p-6 bg-white shadow-sm space-y-4">
          {/* PDF Embed */}
          {showEmbed ? (
            <iframe
              src={blobUrl}
              className="w-full border border-gray-300 rounded-lg"
              style={{ height: '70vh' }}
              title="PDF Preview"
            />
          ) : (
            <div className="p-6 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-700">
                ✅ Preview ready! Click "Finalize & Save" below to download and save this deed to your dashboard.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => onStepChange(2)}
                className="px-4 py-2 rounded-xl border hover:bg-gray-50 transition-colors"
              >
                Edit Step 2
              </button>
              <button
                onClick={() => onStepChange(3)}
                className="px-4 py-2 rounded-xl border hover:bg-gray-50 transition-colors"
              >
                Edit Step 3
              </button>
              <button
                onClick={() => onStepChange(4)}
                className="px-4 py-2 rounded-xl border hover:bg-gray-50 transition-colors"
              >
                Edit Step 4
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleEditDocument}
                className="px-4 py-2 rounded-xl border hover:bg-gray-50 transition-colors"
                disabled={isBusy}
              >
                Edit Document
              </button>
              
              {FEATURE_FLAGS.REQUIRE_FINALIZE && (
                <button
                  onClick={handleFinalize}
                  disabled={isBusy}
                  className="px-5 py-2 rounded-xl border border-green-700 bg-green-700 text-white hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBusy ? 'Finalizing...' : 'Finalize & Save to Dashboard'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

