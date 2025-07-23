'use client';

import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import '../../styles/dashboard.css';

export default function SharedDeeds() {
  const [sharedDeeds, setSharedDeeds] = useState([
    {
      id: 1,
      property: '123 Main St, Los Angeles, CA 90210',
      deed_type: 'Grant Deed',
      shared_with: 'john@titlecompany.com',
      status: 'sent',
      shared_date: '2024-01-15',
      expires_at: '2024-02-15',
      viewed_at: null,
      response_date: null
    },
    {
      id: 2,
      property: '456 Oak Ave, Beverly Hills, CA 90212',
      deed_type: 'Quitclaim Deed',
      shared_with: 'sarah@lenderbank.com',
      status: 'viewed',
      shared_date: '2024-01-12',
      expires_at: '2024-02-12',
      viewed_at: '2024-01-13',
      response_date: null
    },
    {
      id: 3,
      property: '789 Pine Rd, Santa Monica, CA 90401',
      deed_type: 'Warranty Deed',
      shared_with: 'mike@escrowpro.com',
      status: 'approved',
      shared_date: '2024-01-10',
      expires_at: '2024-02-10',
      viewed_at: '2024-01-11',
      response_date: '2024-01-11'
    },
    {
      id: 4,
      property: '321 Elm St, Pasadena, CA 91101',
      deed_type: 'Trust Transfer Deed',
      shared_with: 'lisa@notaryservices.com',
      status: 'rejected',
      shared_date: '2024-01-08',
      expires_at: '2024-02-08',
      viewed_at: '2024-01-09',
      response_date: '2024-01-09'
    },
    {
      id: 5,
      property: '555 Valley Blvd, Alhambra, CA 91801',
      deed_type: 'Grant Deed',
      shared_with: 'tom@realtycorp.com',
      status: 'expired',
      shared_date: '2023-12-15',
      expires_at: '2024-01-15',
      viewed_at: null,
      response_date: null
    }
  ]);

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
                    {sharedDeeds.map((sharedDeed) => {
                      const expired = isExpired(sharedDeed.expires_at);
                      const daysRemaining = getDaysRemaining(sharedDeed.expires_at);
                      
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
                              {!expired && sharedDeed.status !== 'approved' && sharedDeed.status !== 'rejected' && (
                                <button
                                  className="btn-secondary"
                                  style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                                  onClick={() => handleResend(sharedDeed.id)}
                                  title="Send reminder"
                                >
                                  Remind
                                </button>
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
                                onClick={() => handleRevoke(sharedDeed.id)}
                                title="Revoke access"
                              >
                                Revoke
                              </button>
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