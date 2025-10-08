'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import '../../styles/dashboard.css';

// Phase 6-1: Past Deeds API Integration
type DeedSummary = {
  id: number;
  property?: string;
  deed_type?: string;
  status?: 'draft'|'completed'|'in_progress';
  created_at?: string;
  updated_at?: string;
  pdf_url?: string;
};

export default function PastDeeds() {
  const [deeds, setDeeds] = useState<DeedSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Phase 6-1: Fetch real deeds from backend
  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'https://deedpro-main-api.onrender.com';
    const token = (typeof window !== 'undefined') ? localStorage.getItem('access_token') : null;
    
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${api}/deeds`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const data = await res.json();
        setDeeds(Array.isArray(data.deeds) ? data.deeds : Array.isArray(data) ? data : []);
      } catch (e: any) {
        console.error('Failed to load deeds:', e);
        setError(e.message || 'Failed to load deeds');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recipients, setRecipients] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedDeedId, setSelectedDeedId] = useState<number | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Force re-render to ensure styles are applied
    document.body.style.backgroundColor = 'var(--background)';
  }, []);

  const handleContinue = (deedId: number) => {
    // Navigate to create-deed with pre-filled data
    alert(`Continuing deed ${deedId} - would redirect to create-deed page with saved data`);
  };

  const handleDownload = (deedId: number) => {
    // Download the completed deed
    alert(`Downloading deed ${deedId} - would generate and download PDF`);
  };

  const handleShare = (deedId: number) => {
    setSelectedDeedId(deedId);
    setIsModalOpen(true);
  };

  const handleRecipientChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRecipients(e.target.value);
  };

  const handleAddRecipients = () => {
    if (recipients.trim()) {
      alert(`Sharing deed with: ${recipients}`);
      setRecipients('');
      setIsModalOpen(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="badge badge-success">Completed</span>;
      case 'draft':
        return <span className="badge badge-warning">Draft</span>;
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };

  if (!isClient) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#F7F9FC', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            border: '3px solid #e5e7eb', 
            borderTop: '3px solid #F57C00', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px auto'
          }}></div>
          <p style={{ color: '#6b7280', margin: 0 }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div className="main-content">
        <div className="contact-wrapper">
          
          {/* Page Header */}
          <div className="page-header">
            <h1 className="page-title">Past Deeds</h1>
            <p className="page-description">
              View and manage all your created deeds. Continue working on drafts or download completed documents.
            </p>
          </div>

          {/* Action Button */}
          <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: 'var(--gray-600)', fontSize: '1.125rem' }}>
              Showing {deeds.length} deed{deeds.length !== 1 ? 's' : ''}
            </div>
            <a href="/create-deed" className="btn-primary">
              📝 Create New Deed
            </a>
          </div>

          {/* Deeds Table */}
          <div className="card">
            <div className="card-body">
              <div className="table-responsive">
                <table className="table w-100 table-striped">
                  <thead>
                    <tr>
                      <th>Property Address</th>
                      <th>Deed Type</th>
                      <th>Status</th>
                      <th>Progress</th>
                      <th>Created</th>
                      <th>Last Updated</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Phase 6-1: Loading and error states */}
                    {loading && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-600)' }}>
                          Loading deeds...
                        </td>
                      </tr>
                    )}
                    {error && !loading && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--error)' }}>
                          Error: {error}
                        </td>
                      </tr>
                    )}
                    {!loading && !error && deeds.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-600)' }}>
                          No deeds yet. <a href="/create-deed" style={{color: 'var(--primary)', textDecoration: 'underline'}}>Create your first deed</a>
                        </td>
                      </tr>
                    )}
                    {/* Phase 6-1: Real deed data */}
                    {!loading && !error && deeds.map((deed) => {
                      const progress = deed.status === 'completed' ? 100 : deed.status === 'in_progress' ? 50 : deed.status === 'draft' ? 25 : 0;
                      return (
                        <tr key={deed.id}>
                          <td style={{ fontWeight: '500' }}>{deed.property || '—'}</td>
                          <td>{deed.deed_type || 'Grant Deed'}</td>
                          <td>{getStatusBadge(deed.status || 'draft')}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{
                                width: '80px',
                                height: '8px',
                                background: 'var(--gray-200)',
                                borderRadius: '4px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${progress}%`,
                                  height: '100%',
                                  background: progress === 100 ? 'var(--accent)' : 'var(--primary-dark)',
                                  borderRadius: '4px',
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                              <span style={{ fontSize: '0.9rem', color: 'var(--gray-600)', minWidth: '35px' }}>
                                {progress}%
                              </span>
                            </div>
                          </td>
                          <td>{deed.created_at ? new Date(deed.created_at).toLocaleDateString() : '—'}</td>
                          <td>{deed.updated_at ? new Date(deed.updated_at).toLocaleDateString() : '—'}</td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                              {deed.status === 'draft' && (
                                <button
                                  className="btn-primary"
                                  style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                                  onClick={() => handleContinue(deed.id)}
                                  title="Continue editing this deed"
                                >
                                  Continue
                                </button>
                              )}
                              {(deed.status === 'completed' || deed.pdf_url) && (
                                <>
                                  {deed.pdf_url ? (
                                    <a
                                      href={deed.pdf_url}
                                      className="btn-primary"
                                      style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', textDecoration: 'none', display: 'inline-block' }}
                                      target="_blank"
                                      rel="noreferrer"
                                      title="Download deed document"
                                    >
                                      Download
                                    </a>
                                  ) : (
                                    <button
                                      className="btn-primary"
                                      style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                                      onClick={() => handleDownload(deed.id)}
                                      title="Download deed document"
                                    >
                                      Download
                                    </button>
                                  )}
                                  <button
                                    className="btn-secondary"
                                    style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                                    onClick={() => handleShare(deed.id)}
                                    title="Share with recipients"
                                  >
                                    Share
                                  </button>
                                </>
                              )}
                            <button
                              style={{
                                background: 'var(--background)',
                                color: '#ef4444',
                                border: '2px solid #fee2e2',
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#fee2e2';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'var(--background)';
                              }}
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this deed?')) {
                                  setDeeds(deeds.filter(d => d.id !== deed.id));
                                }
                              }}
                              title="Delete this deed"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Share Modal */}
          {isModalOpen && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
              backdropFilter: 'blur(4px)'
            }}>
              <div style={{
                background: 'var(--background)',
                borderRadius: '12px',
                padding: '2.5rem',
                maxWidth: '500px',
                width: '90%',
                maxHeight: '80vh',
                overflow: 'auto',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                border: '1px solid var(--secondary-light)'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '2rem'
                }}>
                  <h3 style={{
                    fontSize: '1.5rem',
                    fontWeight: '600',
                    color: 'var(--text)',
                    margin: 0
                  }}>
                    Share Deed
                  </h3>
                  <button
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '1.5rem',
                      cursor: 'pointer',
                      color: 'var(--gray-400)',
                      padding: '0.25rem',
                      borderRadius: '4px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--text)';
                      e.currentTarget.style.background = 'var(--gray-100)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--gray-400)';
                      e.currentTarget.style.background = 'none';
                    }}
                    onClick={() => setIsModalOpen(false)}
                  >
                    ×
                  </button>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Email Recipients</label>
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="Enter email addresses separated by commas..."
                    value={recipients}
                    onChange={handleRecipientChange}
                  />
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button 
                    className="btn-secondary"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn-primary"
                    onClick={handleAddRecipients}
                  >
                    Send Invitations
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 