// frontend/src/app/deeds/[id]/preview/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { validateCanonical } from '@/features/wizard/validation';
import Link from 'next/link';

type Deed = any;

export default function DeedPreviewPage() {
  const params = useParams();
  const mode = useSearchParams().get('mode') || 'modern';
  const [deed, setDeed] = useState<Deed | null>(null);
  const [errors, setErrors] = useState<{ path: string; message: string }[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // 1) Fetch deed from backend
        const res = await fetch(`/deeds/${id}`, { credentials: 'include' });
        if (!res.ok) throw new Error(`Failed to load deed: ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setDeed(data);

        // 2) Validate before attempting PDF generation
        const docType: string = data?.deed_type || data?.docType || 'grant-deed';
        const canonical = normalizeToCanonical(data, docType);
        const v = validateCanonical(docType, canonical);
        if (!v.ok) {
          // Do NOT generate
          setErrors((v as any).errors);
          return;
        }

        // 3) Generate PDF if not already present (idempotent behavior expected server-side)
        const gen = await fetch(`/api/generate/${slugForDoc(docType)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deed_id: id }),
        });
        if (!gen.ok) {
          const msg = await gen.text();
          throw new Error(`Generate failed: ${gen.status} ${msg}`);
        }
        const { pdf_url } = await gen.json();
        setPdfUrl(pdf_url || `/deeds/${id}/download`);
      } catch (e) {
        console.error('[Preview] error:', e);
        if (!errors) setErrors([{ path: 'preview', message: (e as Error).message }]);
      } finally {
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const editHref = useMemo(() => {
    return `/create-deed/grant-deed?mode=${mode}&deedId=${id}`;
  }, [id, mode]);

  if (loading) return <div style={{padding: 24}}>Loading preview…</div>;

  if (errors && errors.length > 0) {
    return (
      <div style={{padding: 24, maxWidth: 920, margin: '0 auto'}}>
        <h2>We need a bit more info before we can generate your deed.</h2>
        <p>Please fix the items below:</p>
        <ul>
          {errors.map((e, i) => <li key={i}><strong>{e.path}</strong>: {e.message}</li>)}
        </ul>
        <div style={{marginTop: 16}}>
          <Link href={editHref} className="btn">Edit Deed</Link>
        </div>
        <style jsx>{`
          .btn { padding: 10px 16px; border-radius: 8px; border: 1px solid #ccc; display: inline-block; }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{padding: 24}}>
      <h2>Deed Preview</h2>
      {pdfUrl ? (
        <iframe src={pdfUrl} style={{width: '100%', height: '80vh', border: '1px solid #ddd', borderRadius: 8}} />
      ) : (
        <p>PDF is ready. <a href={`/deeds/${id}/download`}>Download</a></p>
      )}
    </div>
  );
}

// --- helpers

function slugForDoc(docType: string) {
  // Normalize to API route suffix, adjust if your backend expects a different path
  const slug = (docType || '').replace('_', '-');
  return `${slug}-ca`;
}

function normalizeToCanonical(data: any, docType: string) {
  // Convert DB deed row → canonical structure expected by zod
  const property = {
    address: data?.property_address || data?.property?.address || '',
    apn: data?.apn || data?.property?.apn || '',
    county: data?.county || data?.property?.county || '',
    legalDescription: data?.legal_description || data?.property?.legalDescription || '',
  };
  const parties = {
    grantor: { name: data?.grantor_name || data?.parties?.grantor?.name || '' },
    grantee: { name: data?.grantee_name || data?.parties?.grantee?.name || '' },
  };
  const vesting = { description: data?.vesting || data?.vesting?.description || null };
  const requestDetails = {
    requestedBy: data?.requested_by,
    titleCompany: data?.title_company,
    escrowNo: data?.escrow_no,
    titleOrderNo: data?.title_order_no,
  };
  const mailTo = data?.mail_to;
  const transferTax = {
    amount: data?.dtt_amount,
    assessedValue: data?.assessed_value,
    exemptionCode: data?.exemption_code,
  };
  return { docType, property, parties, vesting, requestDetails, mailTo, transferTax };
}
