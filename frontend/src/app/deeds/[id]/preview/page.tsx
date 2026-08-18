'use client';

import React, { useEffect, useState } from 'react';

import { useParams, useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { 
  CheckCircleIcon, 
  ArrowDownTrayIcon, 
  ShareIcon, 
  PencilIcon, 
  HomeIcon, 
  ArrowPathIcon 
} from '@heroicons/react/24/solid';
import Sidebar from '@/components/Sidebar';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { SessionExpiredError, apiFetch } from '@/lib/apiClient';
import { PartnersProvider } from '@/features/partners/PartnersContext';
import { ShareForReviewModal } from '@/features/signing/ShareForReviewModal';
import { RequestSigningModal } from '@/features/signing/RequestSigningModal';
import '@/styles/dashboard.css';
import './preview.css';

interface DeedData {
  id: number;
  deed_type: string;
  property_address: string;
  apn?: string;
  county?: string;
  grantor_name?: string;
  grantee_name?: string;
  legal_description?: string;
  vesting?: string;
  requested_by?: string;  // Phase 16: Add requested_by field
  status: string;
  created_at?: string;
}

export default function DeedPreviewPage() {
  /* HX0 — THE ROUTE GUARD THIS PAGE NEVER HAD.
     Its only `access_token` reference read a token to SEND it, inside a
     data fetch, and the sweep detected guards by looking for that
     string — so the page counted as guarded for as long as it called an
     authenticated endpoint. A logged-out visitor loaded it and learned
     she was logged out only when the fetch was refused.
     The shared hook rather than a fifth inline check: it redirects to
     /login carrying the path she was trying to reach. */
  const { checked } = useRequireAuth();

  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const deedId = params.id as string;
  const mode = searchParams.get('mode') || 'classic';

  const [deed, setDeed] = useState<DeedData | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Set when the server says this deed has no instrument yet. Not an
   *  error — a draft that has not been generated is a normal state, and
   *  the honest answer is the builder rather than a broken frame. */
  const [notGenerated, setNotGenerated] = useState<string | null>(null);

  // Format deed type for display
  const formatDeedType = (type: string) => {
    return type
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  /**
   * `validateDeedData` USED TO LIVE HERE and is deleted with the
   * re-render it guarded. It checked grantor / grantee / address / APN
   * before POSTing to the generate endpoint — a pre-flight for a
   * generation this page no longer performs, and a second opinion about
   * completeness beside the builder's own.
   *
   * What replaced it is the server's answer: a deed with no stored
   * instrument is a draft, and the builder is where its missing fields
   * are named and filled.
   */

  // Fetch deed details
  useEffect(() => {
    const fetchDeed = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        const res = await fetch(`/api/deeds/${deedId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (!res.ok) {
          throw new Error('Failed to load deed details');
        }

        const data = await res.json();
        setDeed(data);
      } catch (e: any) {
        setError(e.message || 'Failed to load deed');
      } finally {
        setLoading(false);
      }
    };

    if (deedId) {
      fetchDeed();
    }
  }, [deedId]);

  /**
   * THE INSTRUMENT IS SERVED, NOT RE-MADE.
   *
   * ═══ WHAT THIS REPLACED ═══
   *
   * This page used to POST the deed's fields to `/api/generate/{type}`
   * on every visit and display the result, and its Download button
   * handed over that blob. Meanwhile the success page fetched
   * `/deeds/{id}/download`, which serves the bytes stored in
   * `deed_pdfs`.
   *
   * So two surfaces showed "the deed" and only one showed the deed.
   * `deed_pdfs` is one row per deed, INSERT-OR-REFUSE under §9, with a
   * sha256 stamped on the deed row — deliberately immutable, because
   * verification survives as data and that hash is the substrate. A
   * re-render routes around all of it.
   *
   * The two agree until a template, the rate registry, or the deed's own
   * fields change after generation. Nothing checked that they agreed,
   * and the registry version is a known mover (RED-S4). "Probably the
   * instrument" is the wrong phrase for the thing being signed and
   * recorded.
   *
   * ═══ AND WHY A DRAFT IS NOT RENDERED INSTEAD ═══
   *
   * The obvious repair — call the download endpoint, let it render when
   * nothing is stored — has a trap in it. Storing stamps `completed`
   * and refuses to be replaced, so rendering a draft on demand does not
   * preview it, it FINALISES it, with whatever half-entered fields it
   * had at that moment.
   *
   * So the server decides (`deed_pdf.may_self_heal`) and this page shows
   * what it is told: a completed deed shows its instrument, a draft says
   * it has not been generated and points at the builder. Generation
   * stays the act that creates an instrument, in one place, once.
   */
  useEffect(() => {
    if (!deed || pdfUrl || loadingPdf) return;
    let revoked = false;
    let url: string | null = null;
    (async () => {
      setLoadingPdf(true);
      setError(null);
      try {
        const res = await apiFetch(`/deeds/${deedId}/download`, {},
                                   { label: 'Loading this deed' });
        if (res.status === 409) {
          // Not an error: a draft honestly has no instrument yet.
          const body = await res.json().catch(() => ({}));
          setNotGenerated(body.detail
            || 'This deed has not been generated yet.');
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || `Could not load the document (${res.status})`);
        }
        url = window.URL.createObjectURL(await res.blob());
        if (!revoked) setPdfUrl(url);
      } catch (e: any) {
        if (e instanceof SessionExpiredError) return;
        // §4: a document we could not fetch says so. An empty frame
        // would read as a deed with nothing in it.
        setError(e?.message || 'Could not load this deed\u2019s document');
      } finally {
        setLoadingPdf(false);
      }
    })();
    return () => { revoked = true; if (url) window.URL.revokeObjectURL(url); };
  }, [deed, deedId, pdfUrl, loadingPdf]);

  // Download handler
  const handleDownload = () => {
    if (!pdfUrl || !deed) return;

    const a = document.createElement('a');
    a.href = pdfUrl;
    const fileName = `${formatDeedType(deed.deed_type).replace(/\s+/g, '_')}_${deed.property_address?.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  /**
   * SHARE OPENS THE DIALOG, ON THE DEED SHE IS LOOKING AT.
   *
   * It used to `router.push('/shared-deeds?deed={id}')` — and nothing
   * has ever read `?deed=`. So a button labelled Share navigated away
   * from the deed, landed on an unfiltered tracker with no dialog open,
   * and left her to find the deed she had just been looking at. A
   * parameter built by one half and read by neither, which is the same
   * defect DASH1 found in `?focus=` from the other end.
   *
   * Teaching `/requests` to read `?deed=` would have worked and
   * optimises the wrong journey (owner-ruled): the tracker is for
   * FINDING things and she has already found it. A surface that tells
   * you about a thing and then makes you go locate it is a list of
   * chores — the same reasoning as the dashboard queue's `onOpen`.
   *
   * The kind is not asked. `share_kind` is set by which button she
   * pressed, never inferred (PARTNER2/B), and this button has always
   * meant a review — it pointed at the reviews tracker. The signing path
   * is reachable only through the interrupt, which is FLOW1 item 1's
   * other half rather than a chooser.
   */
  const [reviewOpen, setReviewOpen] = useState(false);
  const [signingOpen, setSigningOpen] = useState(false);
  const handleShare = () => setReviewOpen(true);

  // Edit handler
  const handleEdit = () => {
    const modeParam = mode === 'modern' ? '?mode=modern' : '';
    router.push(`/deed-builder/${deed?.deed_type}${modeParam}`);
  };

  // Loading state
  /* THE HOOK REDIRECTS; THIS IS WHAT STOPS THE CONTENT RENDERING.
     `useRequireAuth` navigates from an effect, so without this line the
     page paints its chrome for a frame first — and the property the
     sweep asserts is not "redirects eventually", it is "does not render
     its content when no token is present". `/team` had both; adopting
     only the hook would have been adopting half the mechanism. */
  if (!checked) return null;

  if (loading) {
    return (
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <div className="main-content">
          <div className="wizard-container">
            <div className="preview-loading">
              <ArrowPathIcon className="animate-spin" style={{ width: 48, height: 48 }} />
              <p>Loading deed details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state - distinguish between validation errors and other errors
  if ((error && !deed) || (!deed && !loading)) {
    return (
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <div className="main-content">
          <div className="wizard-container">
            <div className="preview-error">
              <div className="error-icon">⚠️</div>
              <h2>Unable to Load Deed</h2>
              <p>{error || 'This deed could not be found.'}</p>
              <button onClick={() => router.push('/dashboard')} className="btn-secondary">
                <HomeIcon style={{ width: 18, height: 18 }} />
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // A draft has no instrument yet. Not an error — a normal state with
  // an obvious next step, which is the builder.
  if (notGenerated && deed) {
    return (
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <div className="main-content">
          <div className="wizard-container">
            <div className="preview-error">
              <div className="error-icon">📝</div>
              <h2>This deed has not been generated yet</h2>
              <p>{notGenerated}</p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button onClick={handleEdit} className="btn-primary">
                  <PencilIcon style={{ width: 18, height: 18 }} />
                  Continue in the builder
                </button>
                <button onClick={() => router.push('/past-deeds')} className="btn-secondary">
                  <HomeIcon style={{ width: 18, height: 18 }} />
                  Back to your deeds
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div className="main-content">
        <div className="wizard-container preview-container">
      {/* Header */}
      <header className="preview-header">
        <div className="header-content">
          <button 
            onClick={() => router.push('/dashboard')} 
            className="back-button"
            aria-label="Back to dashboard"
          >
            <HomeIcon style={{ width: 20, height: 20 }} />
          </button>
          {mode === 'modern' && (
            <span className="mode-badge">Modern Wizard</span>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="preview-hero">
        <div className="hero-icon">
          <CheckCircleIcon style={{ width: 64, height: 64 }} className="success-icon" />
        </div>
        <h1 className="hero-title">
          Your {formatDeedType(deed.deed_type)} is Ready
        </h1>
        <div className="hero-details">
          <span className="detail-item">
            {new Date(deed.created_at || Date.now()).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
          <span className="detail-divider">•</span>
          <span className="detail-item">{deed.property_address}</span>
        </div>
      </section>

      {/* PDF Viewer */}
      <section className="preview-pdf-section">
        {loadingPdf ? (
          <div className="pdf-loading">
            <ArrowPathIcon className="animate-spin" style={{ width: 48, height: 48 }} />
            {/* Loading, not generating. This page no longer makes a
                document — it fetches the one that was recorded. */}
            <p>Loading the recorded document…</p>
          </div>
        ) : pdfUrl ? (
          <div className="pdf-viewer">
            <embed
              src={pdfUrl}
              type="application/pdf"
              width="100%"
              height="800px"
              aria-label="Deed document preview"
            />
          </div>
        ) : (
          <div className="pdf-error">
            <p>Unable to preview PDF in your browser</p>
            <button onClick={handleDownload} className="btn-primary">
              <ArrowDownTrayIcon style={{ width: 18, height: 18 }} />
              Download PDF
            </button>
          </div>
        )}
      </section>

      {/* Action Bar */}
      <section className="preview-actions">
        <button onClick={handleDownload} className="btn-primary" disabled={!pdfUrl}>
          <ArrowDownTrayIcon style={{ width: 20, height: 20 }} />
          Download PDF
        </button>
        <button onClick={handleShare} className="btn-secondary">
          <ShareIcon style={{ width: 20, height: 20 }} />
          Share Deed
        </button>
        <button onClick={handleEdit} className="btn-secondary">
          <PencilIcon style={{ width: 20, height: 20 }} />
          Edit Deed
        </button>
      </section>

      {/* Info Panels */}
      <section className="preview-info">
        <div className="info-panel deed-details">
          <h3>Deed Details</h3>
          <dl>
            {deed.property_address && (
              <>
                <dt>Property</dt>
                <dd>{deed.property_address}</dd>
              </>
            )}
            {deed.apn && (
              <>
                <dt>APN</dt>
                <dd>{deed.apn}</dd>
              </>
            )}
            {deed.county && (
              <>
                <dt>County</dt>
                <dd>{deed.county}</dd>
              </>
            )}
            {deed.grantor_name && (
              <>
                <dt>Grantor</dt>
                <dd>{deed.grantor_name}</dd>
              </>
            )}
            {deed.grantee_name && (
              <>
                <dt>Grantee</dt>
                <dd>{deed.grantee_name}</dd>
              </>
            )}
            {deed.vesting && (
              <>
                <dt>Vesting</dt>
                <dd>{deed.vesting}</dd>
              </>
            )}
            <dt>Deed ID</dt>
            <dd>#{deed.id}</dd>
          </dl>
        </div>

        <div className="info-panel next-steps">
          <h3>Next Steps</h3>
          <ul>
            <li>
              <input type="checkbox" id="step-share" />
              <label htmlFor="step-share">Share with partners or title company</label>
            </li>
            <li>
              <input type="checkbox" id="step-review" />
              <label htmlFor="step-review">Review and verify all details</label>
            </li>
            <li>
              <input type="checkbox" id="step-edit" />
              <label htmlFor="step-edit">Edit if corrections are needed</label>
            </li>
          </ul>
        </div>
      </section>

      {/* Footer */}
      <footer className="preview-footer">
        <button onClick={() => router.push(`/deed-builder${mode === 'modern' ? '?mode=modern' : ''}`)} className="btn-link">
          Create Another Deed
        </button>
        <span className="footer-divider">•</span>
        <button onClick={() => router.push('/dashboard')} className="btn-link">
          Back to Dashboard
        </button>
      </footer>

      {/* Both modals sit under one PartnersProvider, as on Past Deeds:
          the recipient picker and its inline "add a partner" reuse the
          existing partner path rather than growing another creation
          form. */}
      {(reviewOpen || signingOpen) && (
        <PartnersProvider>
          {reviewOpen && (
            <ShareForReviewModal
              deedId={Number(deedId)}
              onClose={() => setReviewOpen(false)}
              /* FLOW1 item 1: the interrupt's other half. Asking "did you
                 mean a signing?" and then making her close the modal and
                 go find another button would be a scolding rather than a
                 suggestion. */
              onSwitchToSigning={() => {
                setReviewOpen(false);
                setSigningOpen(true);
              }}
            />
          )}
          {signingOpen && (
            <RequestSigningModal
              deedId={Number(deedId)}
              propertyAddress={deed?.property_address}
              /* Party NAMES only. The deed has never held a way to reach
                 anybody (§13.1) and does not start now — she types the
                 addresses. */
              suggestedSigners={[deed?.grantor_name, deed?.grantee_name]
                .filter((n): n is string => !!n && !!n.trim())}
              onClose={() => setSigningOpen(false)}
            />
          )}
        </PartnersProvider>
      )}
        </div>
      </div>
    </div>
  );
}

