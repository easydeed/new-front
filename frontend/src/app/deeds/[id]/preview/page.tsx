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
  vesting?: string;
  status: string;
  created_at?: string;
}

export default function DeedPreviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const deedId = params.id as string;
  const mode = searchParams.get('mode') || 'classic';

  const [deed, setDeed] = useState<DeedData | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Format deed type for display
  const formatDeedType = (type: string) => {
    return type
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

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

  // Generate PDF
  useEffect(() => {
    const generatePDF = async () => {
      if (!deed) return;

      try {
        setGenerating(true);
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        
        // Map deed type to API endpoint
        const deedTypeMap: Record<string, string> = {
          'grant-deed': 'grant-deed-ca',
          'quitclaim-deed': 'quitclaim-deed-ca',
          'interspousal-transfer': 'interspousal-transfer-ca',
          'warranty-deed': 'warranty-deed-ca',
          'tax-deed': 'tax-deed-ca'
        };

        const endpoint = deedTypeMap[deed.deed_type] || 'grant-deed-ca';
        
        const res = await fetch(`/api/generate/${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            property_address: deed.property_address,
            apn: deed.apn,
            county: deed.county,
            grantor_name: deed.grantor_name,
            grantee_name: deed.grantee_name,
            vesting: deed.vesting
          })
        });

        if (!res.ok) {
          throw new Error('Failed to generate PDF');
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (e: any) {
        console.error('PDF generation error:', e);
        setError(e.message || 'Failed to generate PDF');
      } finally {
        setGenerating(false);
      }
    };

    if (deed && !pdfUrl && !generating) {
      generatePDF();
    }
  }, [deed, pdfUrl, generating]);

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

  // Share handler
  const handleShare = () => {
    router.push(`/shared-deeds?deed=${deedId}`);
  };

  // Edit handler
  const handleEdit = () => {
    const modeParam = mode === 'modern' ? '?mode=modern' : '';
    router.push(`/create-deed/${deed?.deed_type}${modeParam}`);
  };

  // Loading state
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

  // Error state
  if (error || !deed) {
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
        {generating ? (
          <div className="pdf-loading">
            <ArrowPathIcon className="animate-spin" style={{ width: 48, height: 48 }} />
            <p>Generating your document...</p>
            <small>This may take up to 30 seconds</small>
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
        <button onClick={() => router.push(`/create-deed${mode === 'modern' ? '?mode=modern' : ''}`)} className="btn-link">
          Create Another Deed
        </button>
        <span className="footer-divider">•</span>
        <button onClick={() => router.push('/dashboard')} className="btn-link">
          Back to Dashboard
        </button>
      </footer>
        </div>
      </div>
    </div>
  );
}

