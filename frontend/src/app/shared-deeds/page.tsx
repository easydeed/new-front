'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import '../../styles/dashboard.css';

// Phase 6-1: Shared Deeds API Integration
type SharedRow = { 
  id: string; 
  deed_id: string; 
  property?: string; 
  deed_type?: string; 
  shared_with: string; 
  status: 'sent'|'opened'|'downloaded'|'revoked'|'viewed'|'approved'|'rejected'|'expired'; 
  created_at?: string; 
  shared_date?: string;
  expires_at?: string;
  viewed_at?: string | null;
  response_date?: string | null;
};

export default function SharedDeeds() {
  const [sharedDeeds, setSharedDeeds] = useState<SharedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Phase 6-1: Fetch and refresh shared deeds
  async function refresh() {
    const api = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'https://deedpro-main-api.onrender.com';
    const token = (typeof window !== 'undefined') ? localStorage.getItem('access_token') : null;
    try {
      setLoading(true);
      const res = await fetch(`${api}/shared-deeds`, { 
        headers: token ? { Authorization: `Bearer ${token}` } : {} 
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSharedDeeds(Array.isArray(data) ? data : data.shared_deeds || []);
    } catch (e: any) {
      console.error('Failed to load shared deeds:', e);
      setError(e.message || 'Failed to load shared deeds');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { 
    refresh(); 
  }, []);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareFormData, setShareFormData] = useState({
    deedId: '',
    emails: '',
    message: '',
    expiryDays: '30'
  });

  const [availableDeeds] = useState([
    { id: 1, property: '123 Main St, Los Angeles, CA 90210' },
    { id: 2, property: '456 Oak Ave, Beverly Hills, CA 90212' },
    { id: 3, property: '789 Pine Rd, Santa Monica, CA 90401' }
  ]);

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  const handleResend = (sharedDeedId: number) => {
    alert(`Resending reminder for shared deed ${sharedDeedId}`);
  };

  const handleRevoke = (sharedDeedId: number) => {
    if (window.confirm('Are you sure you want to revoke access to this shared deed?')) {
      setSharedDeeds(sharedDeeds.filter(deed => deed.id !== sharedDeedId));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setShareFormData({
      ...shareFormData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmitShare = () => {
    if (shareFormData.deedId && shareFormData.emails.trim()) {
      alert(`Sharing deed with: ${shareFormData.emails}`);
      setShareFormData({ deedId: '', emails: '', message: '', expiryDays: '30' });
      setIsShareModalOpen(false);
    }
  };

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <span className="badge badge-info">Sent</span>;
      case 'viewed':
        return <span className="badge badge-warning">Viewed</span>;
      case 'approved':
        return <span className="badge badge-success">Approved</span>;
      case 'rejected':
        return <span className="badge badge-danger">Rejected</span>;
      case 'expired':
        return <span className="badge badge-secondary">Expired</span>;
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };

  const getDaysRemaining = (expiryDate: string) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div className="main-content">
        <div className="contact-wrapper">
          
          {/* Page Header */}
          <div className="page-header">
            <h1 className="page-title">Shared Deeds</h1>
            <p className="page-description">
              Track deeds shared for approval and manage collaboration with title companies, lenders, and other parties.
            </p>
          </div>

          {/* Action Button */}
          <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: 'var(--gray-600)', fontSize: '1.125rem' }}>
              {sharedDeeds.length} shared deed{sharedDeeds.length !== 1 ? 's' : ''}
            </div>
            <button className="btn-primary" onClick={handleShare}>
              🤝 Share New Deed
            </button>
          </div>

          {/* Shared Deeds Table */}
          <div className="card">
            <div className="card-body">
              <div className="table-responsive">
                <table className="table w-100 table-striped">
                  <thead>
                    <tr>
                      <th>Property</th>
                      <th>Deed Type</th>
                      <th>Shared With</th>
                      <th>Status</th>
                      <th>Shared Date</th>
                      <th>Expires</th>
                      <th>Response</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Phase 6-1: Loading and error states */}
                    {loading && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-600)' }}>
                          Loading shared deeds...
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
                    {!loading && !error && sharedDeeds.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-600)' }}>
                          No shared deeds yet. Share a deed from <a href="/past-deeds" style={{color: 'var(--primary)', textDecoration: 'underline'}}>Past Deeds</a>
                        </td>
                      </tr>
                    )}
                    {/* Phase 6-1: Real shared deed data */}
                    {!loading && !error && sharedDeeds.map((sharedDeed) => {
                      const expired = sharedDeed.expires_at ? isExpired(sharedDeed.expires_at) : false;
                      const daysRemaining = sharedDeed.expires_at ? getDaysRemaining(sharedDeed.expires_at) : 0;
                      
                      return (
                        <tr key={sharedDeed.id}>
                          <td style={{ fontWeight: '500' }}>{sharedDeed.property}</td>
                          <td>{sharedDeed.deed_type}</td>
                          <td>{sharedDeed.shared_with}</td>
                          <td>
                            {expired && sharedDeed.status !== 'approved' && sharedDeed.status !== 'rejected' 
                              ? getStatusBadge('expired') 
                              : getStatusBadge(sharedDeed.status)
                            }
                          </td>
                          <td>{new Date(sharedDeed.shared_date).toLocaleDateString()}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <span>{new Date(sharedDeed.expires_at).toLocaleDateString()}</span>
                              {!expired && sharedDeed.status !== 'approved' && sharedDeed.status !== 'rejected' && (
                                <span style={{ 
                                  fontSize: '0.8rem', 
                                  color: daysRemaining <= 3 ? '#ef4444' : 'var(--gray-500)' 
                                }}>
                                  {daysRemaining > 0 ? `${daysRemaining} days left` : 'Expires today'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            {sharedDeed.response_date ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <span>{new Date(sharedDeed.response_date).toLocaleDateString()}</span>
                                {sharedDeed.viewed_at && (
                                  <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                                    Viewed: {new Date(sharedDeed.viewed_at).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            ) : sharedDeed.viewed_at ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <span style={{ color: 'var(--gray-500)' }}>Pending</span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                                  Viewed: {new Date(sharedDeed.viewed_at).toLocaleDateString()}
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--gray-500)' }}>Not viewed</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                              {/* Phase 6-1: Real API calls for Resend/Revoke */}
                              {!expired && sharedDeed.status !== 'approved' && sharedDeed.status !== 'rejected' && sharedDeed.status !== 'revoked' && (
                                <button
                                  className="btn-secondary"
                                  style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                                  onClick={async () => {
                                    const api = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'https://deedpro-main-api.onrender.com';
                                    const token = (typeof window !== 'undefined') ? localStorage.getItem('access_token') : null;
                                    try {
                                      await fetch(`${api}/shared-deeds/${sharedDeed.id}/resend`, { 
                                        method: 'POST', 
                                        headers: token ? { Authorization: `Bearer ${token}` } : {} 
                                      });
                                      refresh();
                                    } catch (e) {
                                      console.error('Failed to resend:', e);
                                    }
                                  }}
                                  title="Send reminder"
                                >
                                  Remind
                                </button>
                              )}
                              {sharedDeed.status !== 'revoked' && (
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
                                  onClick={async () => {
                                    const api = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'https://deedpro-main-api.onrender.com';
                                    const token = (typeof window !== 'undefined') ? localStorage.getItem('access_token') : null;
                                    try {
                                      await fetch(`${api}/shared-deeds/${sharedDeed.id}/revoke`, { 
                                        method: 'POST', 
                                        headers: token ? { Authorization: `Bearer ${token}` } : {} 
                                      });
                                      refresh();
                                    } catch (e) {
                                      console.error('Failed to revoke:', e);
                                    }
                                  }}
                                  title="Revoke access"
                                >
                                  Revoke
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Share Modal */}
          {isShareModalOpen && (
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
                maxWidth: '600px',
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
                    Share Deed for Review
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
                    onClick={() => setIsShareModalOpen(false)}
                  >
                    ×
                  </button>
                </div>
                
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Select Deed</label>
                    <select
                      name="deedId"
                      className="form-control"
                      value={shareFormData.deedId}
                      onChange={handleInputChange}
                    >
                      <option value="">Choose a deed to share</option>
                      {availableDeeds.map((deed) => (
                        <option key={deed.id} value={deed.id}>
                          {deed.property}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Recipients</label>
                    <textarea
                      name="emails"
                      className="form-control"
                      rows={3}
                      placeholder="Enter email addresses separated by commas..."
                      value={shareFormData.emails}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Expiry Period</label>
                    <select
                      name="expiryDays"
                      className="form-control"
                      value={shareFormData.expiryDays}
                      onChange={handleInputChange}
                    >
                      <option value="7">7 days</option>
                      <option value="14">14 days</option>
                      <option value="30">30 days</option>
                      <option value="60">60 days</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Message (Optional)</label>
                    <textarea
                      name="message"
                      className="form-control"
                      rows={4}
                      placeholder="Add a personal message for the recipients..."
                      value={shareFormData.message}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                  <button 
                    className="btn-secondary"
                    onClick={() => setIsShareModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn-primary"
                    onClick={handleSubmitShare}
                  >
                    Share Deed
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