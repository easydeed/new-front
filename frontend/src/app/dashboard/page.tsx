'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import '../../styles/dashboard.css';

export default function Dashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // Default expanded

  useEffect(() => {
    // Listen for sidebar state changes
    const handleSidebarToggle = () => {
      const sidebar = document.querySelector('.sidebar');
      setSidebarCollapsed(sidebar?.classList.contains('collapsed') || false);
    };

    // Check initial state
    handleSidebarToggle();
    
    // Listen for changes
    const observer = new MutationObserver(handleSidebarToggle);
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ display: 'flex', background: 'var(--background)', color: 'var(--text)' }}>
      <Sidebar />
      <div className={`main-content ${sidebarCollapsed ? 'expanded' : ''}`}>
        <div className="contact-wrapper">
          <h1 className="contact-title">Welcome to DeedPro</h1>
          <p className="contact-paragraph">Your smooth path to professional deeds — guided, simple, effortless.</p>
          {/* Resume draft if exists */}
          <ResumeDraftBanner />

          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                </svg>
              </div>
              <div className="stat-number">12</div>
              <div className="stat-label">Total Deeds</div>
            </div>
            <div className="stat-card progress">
              <div className="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z"/>
                </svg>
              </div>
              <div className="stat-number">3</div>
              <div className="stat-label">In Progress</div>
            </div>
            <div className="stat-card completed">
              <div className="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/>
                </svg>
              </div>
              <div className="stat-number">8</div>
              <div className="stat-label">Completed</div>
            </div>
            <div className="stat-card pending">
              <div className="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z"/>
                </svg>
              </div>
              <div className="stat-number">1</div>
              <div className="stat-label">Pending Review</div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Recent Activity</h3>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table w-100 table-striped">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Property</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Deed Created</td>
                      <td>123 Main St, Los Angeles, CA</td>
                      <td>Jan 15, 2024</td>
                      <td><span className="badge badge-success">Completed</span></td>
                    </tr>
                    <tr>
                      <td>Document Shared</td>
                      <td>456 Oak Ave, Beverly Hills, CA</td>
                      <td>Jan 14, 2024</td>
                      <td><span className="badge badge-warning">Pending</span></td>
                    </tr>
                    <tr>
                      <td>Review Requested</td>
                      <td>789 Pine Rd, Santa Monica, CA</td>
                      <td>Jan 13, 2024</td>
                      <td><span className="badge badge-info">In Review</span></td>
                    </tr>
                    <tr>
                      <td>Transfer Completed</td>
                      <td>321 Elm St, Pasadena, CA</td>
                      <td>Jan 12, 2024</td>
                      <td><span className="badge badge-success">Completed</span></td>
                    </tr>
                    <tr>
                      <td>Notarization Required</td>
                      <td>555 Valley Blvd, Alhambra, CA</td>
                      <td>Jan 11, 2024</td>
                      <td><span className="badge badge-warning">Action Needed</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="quick-actions">
            <a className="action-card" href="/create-deed">
              <div className="action-icon">✨</div>
              <div className="action-title">Start AI Wizard</div>
              <div className="action-description">Answer a few simple questions — we’ll handle the legal formatting.</div>
            </a>
            <a className="action-card" href="/past-deeds">
              <div className="action-icon">📂</div>
              <div className="action-title">View Past Deeds</div>
              <div className="action-description">Quickly access and share previously generated documents.</div>
            </a>
            <a className="action-card" href="/account-settings">
              <div className="action-icon">⚙️</div>
              <div className="action-title">Account & Plan</div>
              <div className="action-description">Manage plan, billing, and integrations like SoftPro and Qualia.</div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 

function ResumeDraftBanner() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('deedWizardDraft');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.formData) return null;
  } catch {
    return null;
  }
  return (
    <div className="card" style={{ borderLeft: '4px solid var(--primary-dark)' }}>
      <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="card-title" style={{ marginBottom: 4 }}>Resume AI Wizard</div>
          <div style={{ color: 'var(--gray-600)' }}>Pick up where you left off. We’ve saved your progress.</div>
        </div>
        <a className="btn-primary" href="/create-deed">Continue</a>
      </div>
    </div>
  );
}