'use client';
import { useEffect, useState } from 'react';
import StatCard from './StatCard';
import Badge from './Badge';

interface VerificationStats {
  total_documents: number;
  active_documents: number;
  revoked_documents: number;
  total_scans_today: number;
  total_scans_week: number;
}

interface VerificationDocument {
  id: string;
  short_code: string;
  document_type: string;
  property_address: string;
  county: string;
  grantor_display: string;
  grantee_display: string;
  status: string;
  verification_count: number;
  generated_at: string;
  last_verified_at: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

function authHeaders() {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('access_token') || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function VerificationTab() {
  const [stats, setStats] = useState<VerificationStats | null>(null);
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<VerificationDocument | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');

  /** Whether the document list is a real answer or an unanswered call.
   *  An empty array from a failed fetch renders identically to an empty
   *  database — doctrine §4, and this tab had exactly that hole. */
  const [docsLoaded, setDocsLoaded] = useState(false);

  async function loadData() {
    setLoading(true);
    setError('');
    setDocsLoaded(false);
    try {
      // ADMIN1.5 relapse sweep. Both fetches used to be `if (res.ok)`
      // with no else: a 500 left `stats` null and `documents` empty, and
      // the cards below rendered `?? 0` while the table said "No
      // verified documents yet". A dead endpoint was indistinguishable
      // from a quiet platform — the fabricated-success pattern ADMIN1
      // was fired to remove, still alive on this tab.
      const failures: string[] = [];

      const statsRes = await fetch(`${API_BASE}/admin/verification/stats`, {
        headers: { ...authHeaders() }
      });
      if (statsRes.ok) {
        setStats(await statsRes.json());
      } else {
        setStats(null);
        failures.push(`stats (HTTP ${statsRes.status})`);
      }

      const docsRes = await fetch(`${API_BASE}/admin/verification/documents?limit=50`, {
        headers: { ...authHeaders() }
      });
      if (docsRes.ok) {
        const data = await docsRes.json();
        setDocuments(data.items || []);
        setDocsLoaded(true);
      } else {
        setDocuments([]);
        failures.push(`documents (HTTP ${docsRes.status})`);
      }

      if (failures.length) {
        setError(`Verification data unavailable — ${failures.join(', ')}. `
          + 'Nothing below is being shown as zero.');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load verification data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleRevoke() {
    if (!selectedDoc || !revokeReason.trim()) return;
    
    setRevoking(true);
    try {
      const res = await fetch(`${API_BASE}/admin/verification/documents/${selectedDoc.short_code}/revoke`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...authHeaders() 
        },
        body: JSON.stringify({ reason: revokeReason })
      });
      
      if (res.ok) {
        setSelectedDoc(null);
        setRevokeReason('');
        loadData();
      } else {
        const data = await res.json();
        alert(`Failed to revoke: ${data.detail || 'Unknown error'}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setRevoking(false);
    }
  }

  if (loading) {
    return (
      <div className="vstack">
        <div className="grid stats">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card skeleton" style={{ height: 92 }} />
          ))}
        </div>
        <div className="card skeleton" style={{ height: 300 }} />
      </div>
    );
  }

  return (
    <div className="vstack">
      {/* What this tab covers — stated before the numbers.
          `document_authenticity` has exactly one live writer:
          routers/api_v1/router.py, the partner-API lane.
          `create_document_authenticity` in routers/verification.py has
          zero callers, so a deed made in the wizard gets a stored PDF
          hash and no short code. Every count on this tab is therefore an
          API-lane count. Unlabelled, "Total Documents" read as "every
          document DeedPro has ever issued", which is off by the entire
          wizard. Whether wizard deeds should be publicly verifiable is
          VERIFY1 — a parked product question, not a bug to paper over. */}
      <div className="card" style={{ borderColor: 'var(--dp-border)' }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>
          Partner-API documents only
        </div>
        <div style={{ fontSize: 13, opacity: 0.75 }}>
          Verification codes are issued by the partner API. Deeds created in the
          wizard are stored with a PDF hash but no short code, so they never
          appear here and are not counted below. Public verification for wizard
          deeds has not been decided yet, so this table is complete as it
          stands rather than missing rows.
        </div>
      </div>

      {/* Stats Cards — em-dash, never 0, when the stats call failed.
          `?? 0` here was a silent zero of the same family as the Revenue
          and QR ones ADMIN1 killed: it turned "we could not ask" into
          "the answer is none". */}
      <div className="grid stats">
        <StatCard title="Total Documents" value={stats?.total_documents ?? '—'} />
        <StatCard title="Active" value={stats?.active_documents ?? '—'} />
        <StatCard title="Revoked" value={stats?.revoked_documents ?? '—'} />
        <StatCard title="Scans Today" value={stats?.total_scans_today ?? '—'} />
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--dp-danger)', color: 'var(--dp-danger)' }}>
          {error}
        </div>
      )}

      {/* Documents Table */}
      <div className="card">
        <div className="hstack" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Verified Documents</div>
          <Badge kind="neutral">
            {docsLoaded ? `${documents.length} documents` : 'count unavailable'}
          </Badge>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Doc ID</th>
              <th>Type</th>
              <th>Property</th>
              <th>Status</th>
              <th>Scans</th>
              <th>Generated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {!docsLoaded ? (
              <tr>
                <td colSpan={7} style={{ color: 'var(--dp-danger)', textAlign: 'center', padding: 24 }}>
                  The document list did not load. This is not an empty table —
                  it is an unanswered request.
                </td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ opacity: 0.75, textAlign: 'center', padding: 24 }}>
                  No partner-API documents yet. A row appears here when a deed is
                  generated through the partner API, which issues the short code.
                  Wizard deeds are never listed here — see the note above.
                </td>
              </tr>
            ) : documents.map(doc => (
              <tr key={doc.short_code}>
                <td>
                  <code style={{ 
                    background: 'var(--dp-surface)', 
                    padding: '2px 6px', 
                    borderRadius: 4,
                    fontSize: 12
                  }}>
                    {doc.short_code}
                  </code>
                </td>
                <td>{formatDocType(doc.document_type)}</td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc.property_address || '—'}
                </td>
                <td>
                  <Badge kind={doc.status === 'active' ? 'success' : 'danger'}>
                    {doc.status}
                  </Badge>
                </td>
                <td>{doc.verification_count}</td>
                <td>{doc.generated_at ? new Date(doc.generated_at).toLocaleDateString() : '—'}</td>
                <td style={{ textAlign: 'right' }}>
                  <button 
                    className="button ghost" 
                    onClick={() => setSelectedDoc(doc)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Document Detail Modal */}
      {selectedDoc && (
        <div className="modal-backdrop" onClick={() => setSelectedDoc(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="hstack" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Document Details</div>
              <button className="button ghost" onClick={() => setSelectedDoc(null)}>Close</button>
            </div>
            
            <div style={{ display: 'grid', gap: 12, fontSize: 13, marginBottom: 16 }}>
              <div>
                <div style={{ opacity: 0.6, fontSize: 11, marginBottom: 2 }}>Document ID</div>
                <code style={{ fontSize: 14, fontWeight: 600 }}>{selectedDoc.short_code}</code>
              </div>
              <div>
                <div style={{ opacity: 0.6, fontSize: 11, marginBottom: 2 }}>Type</div>
                <div style={{ fontWeight: 500 }}>{formatDocType(selectedDoc.document_type)}</div>
              </div>
              <div>
                <div style={{ opacity: 0.6, fontSize: 11, marginBottom: 2 }}>Property</div>
                <div style={{ fontWeight: 500 }}>{selectedDoc.property_address || '—'}</div>
                {selectedDoc.county && <div style={{ opacity: 0.7 }}>{selectedDoc.county} County</div>}
              </div>
              <div>
                <div style={{ opacity: 0.6, fontSize: 11, marginBottom: 2 }}>Parties</div>
                <div style={{ fontWeight: 500 }}>
                  {selectedDoc.grantor_display} → {selectedDoc.grantee_display}
                </div>
              </div>
              <div className="hstack" style={{ gap: 24 }}>
                <div>
                  <div style={{ opacity: 0.6, fontSize: 11, marginBottom: 2 }}>Status</div>
                  <Badge kind={selectedDoc.status === 'active' ? 'success' : 'danger'}>
                    {selectedDoc.status}
                  </Badge>
                </div>
                <div>
                  <div style={{ opacity: 0.6, fontSize: 11, marginBottom: 2 }}>Scans</div>
                  <div style={{ fontWeight: 600 }}>{selectedDoc.verification_count}</div>
                </div>
              </div>
              <div>
                <div style={{ opacity: 0.6, fontSize: 11, marginBottom: 2 }}>Generated</div>
                <div>{selectedDoc.generated_at ? new Date(selectedDoc.generated_at).toLocaleString() : '—'}</div>
              </div>
              {selectedDoc.last_verified_at && (
                <div>
                  <div style={{ opacity: 0.6, fontSize: 11, marginBottom: 2 }}>Last Verified</div>
                  <div>{new Date(selectedDoc.last_verified_at).toLocaleString()}</div>
                </div>
              )}
            </div>

            {selectedDoc.status === 'active' && (
              <div style={{ borderTop: '1px solid var(--dp-border)', paddingTop: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--dp-danger)' }}>
                  Revoke Document
                </div>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 12 }}>
                  Revoking will mark this document as invalid. Anyone scanning the QR code will see it as revoked.
                </div>
                <textarea
                  className="input"
                  placeholder="Reason for revocation (required)..."
                  value={revokeReason}
                  onChange={e => setRevokeReason(e.target.value)}
                  style={{ width: '100%', minHeight: 60, marginBottom: 12 }}
                />
                <button 
                  className="button" 
                  style={{ background: 'var(--dp-danger)', color: 'white' }}
                  onClick={handleRevoke}
                  disabled={revoking || !revokeReason.trim()}
                >
                  {revoking ? 'Revoking...' : 'Revoke Document'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatDocType(type: string): string {
  const mapping: Record<string, string> = {
    'grant_deed': 'Grant Deed',
    'quitclaim_deed': 'Quitclaim Deed',
    'interspousal_transfer': 'Interspousal Transfer',
    'warranty_deed': 'Warranty Deed',
    'tax_deed': 'Tax Deed',
  };
  return mapping[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
