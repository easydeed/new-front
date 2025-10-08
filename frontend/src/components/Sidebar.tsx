'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import { AuthManager } from '../utils/auth';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false); // Default expanded

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const iconStyle = () => ({
    width: '24px',
    height: '24px',
    marginRight: isCollapsed ? '0' : '1rem',
    flexShrink: 0,
    transition: 'all 0.3s ease'
  });

  return (
    <>
      <nav className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <button 
          className="sidebar-toggle" 
          onClick={toggleSidebar}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? '›' : '‹'}
        </button>

        <div className="logo">
          <div style={{
            width: '40px',
            height: '40px',
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontSize: '18px',
            fontWeight: '700',
            flexShrink: 0,
            letterSpacing: '-0.02em'
          }}>DP</div>
          <h4 style={{color:'#FFFFFF'}}>DeedPro <span style={{display:'inline-block',width:8,height:8,background:'var(--accent)',borderRadius:999,marginLeft:8,verticalAlign:'middle'}}/></h4>
        </div>
        
        <ul>
          <li>
            <Link href="/dashboard" data-tooltip="Dashboard">
              <svg style={iconStyle()} viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
              </svg>
              <span>Dashboard</span>
            </Link>
          </li>
          <li>
            <Link href="/create-deed" data-tooltip="Create Deed">
              <svg style={iconStyle()} viewBox="0 0 24 24" fill="currentColor">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                <path d="M11,15H13V17H11V15M11,7H13V13H11V7Z"/>
              </svg>
              <span>Create Deed</span>
            </Link>
          </li>
          <li>
            <Link href="/past-deeds" data-tooltip="Past Deeds">
              <svg style={iconStyle()} viewBox="0 0 24 24" fill="currentColor">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
              </svg>
              <span>Past Deeds</span>
            </Link>
          </li>
          <li>
            <Link href="/shared-deeds" data-tooltip="Shared Deeds">
              <svg style={iconStyle()} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,5.5A3.5,3.5 0 0,1 15.5,9A3.5,3.5 0 0,1 12,12.5A3.5,3.5 0 0,1 8.5,9A3.5,3.5 0 0,1 12,5.5M5,8C5.56,8 6.08,8.15 6.53,8.42C6.38,9.85 6.8,11.27 7.66,12.38C7.16,13.34 6.16,14 5,14A3,3 0 0,1 2,11A3,3 0 0,1 5,8M19,8A3,3 0 0,1 22,11A3,3 0 0,1 19,14C17.84,14 16.84,13.34 16.34,12.38C17.2,11.27 17.62,9.85 17.47,8.42C17.92,8.15 18.44,8 19,8M5.5,18.25C5.5,16.18 8.41,14.5 12,14.5C15.59,14.5 18.5,16.18 18.5,18.25V20H5.5V18.25M0,20V18.5C0,17.11 1.89,15.94 4.45,15.6C3.86,16.28 3.5,17.22 3.5,18.25V20H0M24,20H20.5V18.25C20.5,17.22 20.14,16.28 19.55,15.6C22.11,15.94 24,17.11 24,18.5V20Z"/>
              </svg>
              <span>Shared Deeds</span>
            </Link>
          </li>
          <li>
            <Link href="/account-settings" data-tooltip="Settings">
              <svg style={iconStyle()} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
              </svg>
              <span>Settings</span>
            </Link>
          </li>
          {/* Phase 6-1: Feature flags for incomplete sections */}
          {process.env.NEXT_PUBLIC_ENABLE_TEAM === 'true' && (
            <li>
              <Link href="/team" data-tooltip="Team Dashboard">
                <svg style={iconStyle()} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16,4C18.21,4 20,5.79 20,8C20,10.21 18.21,12 16,12C13.79,12 12,10.21 12,8C12,5.79 13.79,4 16,4M16,5.5A2.5,2.5 0 0,0 13.5,8A2.5,2.5 0 0,0 16,10.5A2.5,2.5 0 0,0 18.5,8A2.5,2.5 0 0,0 16,5.5M16,13C18.67,13 22,14.33 22,17V20H10V17C10,14.33 13.33,13 16,13M8,4C10.21,4 12,5.79 12,8C12,10.21 10.21,12 8,12C5.79,12 4,10.21 4,8C4,5.79 5.79,4 8,4M8,13C10.67,13 14,14.33 14,17V20H2V17C2,14.33 5.33,13 8,13Z"/>
                </svg>
                <span>Team</span>
              </Link>
            </li>
          )}
          {process.env.NEXT_PUBLIC_ENABLE_VOICE === 'true' && (
            <li>
              <Link href="/voice" data-tooltip="Voice Commands">
                <svg style={iconStyle()} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/>
                </svg>
                <span>Voice</span>
              </Link>
            </li>
          )}
          {process.env.NEXT_PUBLIC_ENABLE_SECURITY === 'true' && (
            <li>
              <Link href="/security" data-tooltip="Security Center">
                <svg style={iconStyle()} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/>
                </svg>
                <span>Security</span>
              </Link>
            </li>
          )}
          <li>
            <Link href="/mobile" data-tooltip="Mobile App">
              <svg style={iconStyle()} viewBox="0 0 24 24" fill="currentColor">
                <path d="M17,19H7V5H17M17,1H7C5.89,1 5,1.89 5,3V21A2,2 0 0,0 7,23H17A2,2 0 0,0 19,21V3C19,1.89 18.1,1 17,1Z"/>
              </svg>
              <span>Mobile</span>
            </Link>
          </li>
          <li>
            <Link href="/admin" data-tooltip="Admin">
              <svg style={iconStyle()} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10V11H16V18H8V11H9.2V10C9.2,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.4,8.7 10.4,10V11H13.6V10C13.6,8.7 12.8,8.2 12,8.2Z"/>
              </svg>
              <span>Admin</span>
            </Link>
          </li>
          
          {/* Logout Button */}
          <li style={{ marginTop: 'auto', paddingTop: '1rem' }}>
            <button 
              onClick={() => AuthManager.logout()} 
              data-tooltip="Logout"
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.8)',
                cursor: 'pointer',
                textDecoration: 'none',
                borderRadius: '8px',
                transition: 'all 0.3s ease',
                fontSize: '0.95rem',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
              }}
            >
              <svg style={iconStyle()} viewBox="0 0 24 24" fill="currentColor">
                <path d="M16,17V14H9V10H16V7L21,12L16,17M14,2A2,2 0 0,1 16,4V6H14V4H5V20H14V18H16V20A2,2 0 0,1 14,22H5A2,2 0 0,1 3,20V4A2,2 0 0,1 5,2H14Z"/>
              </svg>
              <span>Logout</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
} 
