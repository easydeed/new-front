'use client';

import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import '../../styles/dashboard.css';

export default function PastDeeds() {
  const [deeds, setDeeds] = useState([
    {
      id: 1,
      property: '123 Main St, Los Angeles, CA 90210',
      deedType: 'Grant Deed',
      status: 'completed',
      createdDate: '2024-01-15',
      lastUpdated: '2024-01-16',
      progress: 100
    },
    {
      id: 2,
      property: '456 Oak Ave, Beverly Hills, CA 90212',
      deedType: 'Quitclaim Deed',
      status: 'draft',
      createdDate: '2024-01-14',
      lastUpdated: '2024-01-14',
      progress: 75
    },
    {
      id: 3,
      property: '789 Pine Rd, Santa Monica, CA 90401',
      deedType: 'Warranty Deed',
      status: 'completed',
      createdDate: '2024-01-10',
      lastUpdated: '2024-01-12',
      progress: 100
    },
    {
      id: 4,
      property: '321 Elm St, Pasadena, CA 91101',
      deedType: 'Trust Transfer Deed',
      status: 'draft',
      createdDate: '2024-01-08',
      lastUpdated: '2024-01-09',
      progress: 40
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recipients, setRecipients] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedDeedId, setSelectedDeedId] = useState<number | null>(null);

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
                    {deeds.map((deed) => (
                      <tr key={deed.id}>
                        <td style={{ fontWeight: '500' }}>{deed.property}</td>
                        <td>{deed.deedType}</td>
                        <td>{getStatusBadge(deed.status)}</td>
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
                                width: `${deed.progress}%`,
                                height: '100%',
                                background: deed.progress === 100 ? 'var(--accent)' : 'var(--primary-dark)',
                                borderRadius: '4px',
                                transition: 'width 0.3s ease'
                              }} />
                            </div>
                            <span style={{ fontSize: '0.9rem', color: 'var(--gray-600)', minWidth: '35px' }}>
                              {deed.progress}%
                            </span>
                          </div>
                        </td>
                        <td>{new Date(deed.createdDate).toLocaleDateString()}</td>
                        <td>{new Date(deed.lastUpdated).toLocaleDateString()}</td>
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
                            {deed.status === 'completed' && (
                              <>
                                <button
                                  className="btn-primary"
                                  style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                                  onClick={() => handleDownload(deed.id)}
                                  title="Download deed document"
                                >
                                  Download
                                </button>
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