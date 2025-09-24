'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';

interface SecurityEvent {
  id: number;
  type: 'login' | 'deed_created' | 'profile_updated' | 'team_invited' | 'failed_login' | 'suspicious_activity';
  description: string;
  timestamp: string;
  ip_address: string;
  location: string;
  risk_level: 'low' | 'medium' | 'high';
  user_agent: string;
}

interface SecurityMetrics {
  total_logins_24h: number;
  failed_attempts_24h: number;
  unique_ips_24h: number;
  deeds_created_24h: number;
  compliance_score: number;
  last_security_scan: string;
}

export default function SecurityDashboard() {
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics | null>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(30);
  const [ipWhitelist, setIpWhitelist] = useState<string[]>([]);
  const [auditLogEnabled, setAuditLogEnabled] = useState(true);
  // const [activeTab, setActiveTab] = useState('overview');
  // const router = useRouter();

  useEffect(() => {
    // Mock security data
    const mockSecurityEvents: SecurityEvent[] = [
      {
        id: 1,
        type: 'login',
        description: 'Successful login from new device',
        timestamp: '2025-01-08 14:32:15',
        ip_address: '192.168.1.100',
        location: 'Los Angeles, CA',
        risk_level: 'low',
        user_agent: 'Chrome 120.0.0.0 on Windows'
      },
      {
        id: 2,
        type: 'deed_created',
        description: 'Grant deed created with AI assistance',
        timestamp: '2025-01-08 14:28:42',
        ip_address: '192.168.1.100',
        location: 'Los Angeles, CA',
        risk_level: 'low',
        user_agent: 'Chrome 120.0.0.0 on Windows'
      },
      {
        id: 3,
        type: 'failed_login',
        description: 'Failed login attempt - incorrect password',
        timestamp: '2025-01-08 13:45:23',
        ip_address: '10.0.0.50',
        location: 'Unknown',
        risk_level: 'medium',
        user_agent: 'Unknown'
      },
      {
        id: 4,
        type: 'profile_updated',
        description: 'User profile updated - company information',
        timestamp: '2025-01-08 12:15:33',
        ip_address: '192.168.1.100',
        location: 'Los Angeles, CA',
        risk_level: 'low',
        user_agent: 'Chrome 120.0.0.0 on Windows'
      },
      {
        id: 5,
        type: 'suspicious_activity',
        description: 'Multiple rapid login attempts detected',
        timestamp: '2025-01-08 11:22:10',
        ip_address: '203.0.113.45',
        location: 'Unknown',
        risk_level: 'high',
        user_agent: 'Automated Bot'
      }
    ];

    const mockSecurityMetrics: SecurityMetrics = {
      total_logins_24h: 23,
      failed_attempts_24h: 3,
      unique_ips_24h: 5,
      deeds_created_24h: 12,
      compliance_score: 94,
      last_security_scan: '2025-01-08 10:00:00'
    };

    setSecurityEvents(mockSecurityEvents);
    setSecurityMetrics(mockSecurityMetrics);
    setIpWhitelist(['192.168.1.0/24', '10.0.0.0/8']);
  }, []);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return '#10B981';
      case 'medium': return '#F59E0B';
      case 'high': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'login': return '🔐';
      case 'deed_created': return '📄';
      case 'profile_updated': return '👤';
      case 'team_invited': return '👥';
      case 'failed_login': return '❌';
      case 'suspicious_activity': return '⚠️';
      default: return '📊';
    }
  };

  const enableTwoFactor = () => {
    // In production: integrate with authenticator app
    alert('🔐 Two-Factor Authentication Setup\n\n1. Install Google Authenticator or similar app\n2. Scan QR code (would be displayed here)\n3. Enter verification code\n\nThis adds an extra layer of security to your account.');
    setTwoFactorEnabled(true);
  };

  const exportAuditLog = () => {
    // In production: generate CSV/PDF report
    alert('📋 Audit Log Export\n\nGenerating comprehensive security report...\n\n✅ All login events\n✅ Deed creation history\n✅ Profile changes\n✅ Failed attempts\n✅ IP addresses and locations\n\nReport will be emailed to your registered address.');
  };

  const runSecurityScan = () => {
    alert('🔍 Security Scan Initiated\n\nScanning for:\n\n✅ Weak passwords\n✅ Suspicious login patterns\n✅ Unusual IP addresses\n✅ Account permissions\n✅ Data access patterns\n\nScan will complete in 2-3 minutes...');
  };

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div className="main-content">
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          padding: '0 1rem'
        }}>
          <div>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: 'var(--gray-900)',
              margin: 0
            }}>
              🔒 Security Center
            </h1>
            <p style={{
              fontSize: '1rem',
              color: 'var(--gray-600)',
              margin: '0.5rem 0 0 0'
            }}>
              Enterprise-grade security monitoring and compliance
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={runSecurityScan}
              style={{
                backgroundColor: 'var(--primary-dark)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              🔍 Run Security Scan
            </button>
            <button
              onClick={exportAuditLog}
              style={{
                backgroundColor: 'white',
                color: 'var(--primary-dark)',
                border: '1px solid var(--primary-dark)',
                borderRadius: '12px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              📋 Export Audit Log
            </button>
          </div>
        </div>

        {/* Security Metrics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
          padding: '0 1rem'
        }}>
          {securityMetrics && [
            {
              title: 'Compliance Score',
              value: `${securityMetrics.compliance_score}%`,
              subtitle: 'SOC2 • GDPR • CCPA',
              icon: '🛡️',
              color: '#10B981'
            },
            {
              title: 'Logins (24h)',
              value: securityMetrics.total_logins_24h.toString(),
              subtitle: `${securityMetrics.failed_attempts_24h} failed attempts`,
              icon: '🔐',
              color: securityMetrics.failed_attempts_24h > 5 ? '#EF4444' : '#06B6D4'
            },
            {
              title: 'Unique IPs',
              value: securityMetrics.unique_ips_24h.toString(),
              subtitle: 'Access locations monitored',
              icon: '🌍',
              color: '#8B5CF6'
            },
            {
              title: 'Documents Created',
              value: securityMetrics.deeds_created_24h.toString(),
              subtitle: 'Deeds with audit trail',
              icon: '📄',
              color: '#F59E0B'
            }
          ].map((metric, index) => (
            <div
              key={index}
              style={{
                background: 'white',
                border: '1px solid var(--gray-200)',
                borderRadius: '16px',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '1rem'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: `${metric.color}20`,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px'
                }}>
                  {metric.icon}
                </div>
                <h3 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: 'var(--gray-600)',
                  margin: 0
                }}>
                  {metric.title}
                </h3>
              </div>
              <div style={{
                fontSize: '2rem',
                fontWeight: '700',
                color: 'var(--gray-900)',
                marginBottom: '0.5rem'
              }}>
                {metric.value}
              </div>
              <div style={{
                fontSize: '0.875rem',
                color: 'var(--gray-500)'
              }}>
                {metric.subtitle}
              </div>
            </div>
          ))}
        </div>

        {/* Security Settings */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '2rem',
          padding: '0 1rem',
          marginBottom: '2rem'
        }}>
          {/* Authentication Settings */}
          <div style={{
            background: 'white',
            border: '1px solid var(--gray-200)',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: 'var(--gray-900)',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🔐 Authentication
            </h3>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem'
              }}>
                <span style={{ fontWeight: '600' }}>Two-Factor Authentication</span>
                <div style={{
                  width: '50px',
                  height: '26px',
                  backgroundColor: twoFactorEnabled ? '#10B981' : '#E5E7EB',
                  borderRadius: '13px',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={twoFactorEnabled ? () => setTwoFactorEnabled(false) : enableTwoFactor}
                >
                  <div style={{
                    width: '22px',
                    height: '22px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '2px',
                    left: twoFactorEnabled ? '26px' : '2px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }} />
                </div>
              </div>
              <p style={{
                fontSize: '0.875rem',
                color: 'var(--gray-600)',
                margin: 0
              }}>
                {twoFactorEnabled ? '✅ Enabled with authenticator app' : 'Add an extra layer of security'}
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}>
                Session Timeout (minutes)
              </label>
              <select
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--gray-300)',
                  borderRadius: '8px',
                  backgroundColor: 'white'
                }}
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
                <option value={480}>8 hours</option>
              </select>
            </div>

            <button
              style={{
                backgroundColor: 'var(--primary-dark)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Update Security Settings
            </button>
          </div>

          {/* Access Control */}
          <div style={{
            background: 'white',
            border: '1px solid var(--gray-200)',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: 'var(--gray-900)',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🌍 Access Control
            </h3>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontWeight: '600',
                marginBottom: '0.5rem'
              }}>
                IP Whitelist
              </label>
              {ipWhitelist.map((ip, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '0.5rem'
                }}>
                  <code style={{
                    backgroundColor: '#F3F4F6',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    flex: 1
                  }}>
                    {ip}
                  </code>
                  <button style={{
                    color: '#EF4444',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer'
                  }}>
                    ❌
                  </button>
                </div>
              ))}
              <button style={{
                backgroundColor: 'var(--gray-100)',
                color: 'var(--gray-700)',
                border: '1px dashed var(--gray-300)',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '14px',
                cursor: 'pointer',
                width: '100%',
                marginTop: '0.5rem'
              }}>
                + Add IP Range
              </button>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontWeight: '600' }}>Audit Logging</span>
              <div style={{
                width: '50px',
                height: '26px',
                backgroundColor: auditLogEnabled ? '#10B981' : '#E5E7EB',
                borderRadius: '13px',
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={() => setAuditLogEnabled(!auditLogEnabled)}
              >
                <div style={{
                  width: '22px',
                  height: '22px',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: '2px',
                  left: auditLogEnabled ? '26px' : '2px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                }} />
              </div>
            </div>
          </div>
        </div>

        {/* Security Events */}
        <div style={{
          background: 'white',
          border: '1px solid var(--gray-200)',
          borderRadius: '16px',
          margin: '0 1rem',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '1.5rem',
            borderBottom: '1px solid var(--gray-200)',
            backgroundColor: 'var(--gray-50)'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: 'var(--gray-900)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📊 Recent Security Events
            </h3>
          </div>
          <div>
            {securityEvents.map((event, index) => (
              <div
                key={event.id}
                style={{
                  padding: '1rem 1.5rem',
                  borderBottom: index < securityEvents.length - 1 ? '1px solid var(--gray-100)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '10px',
                    height: '10px',
                    backgroundColor: getRiskColor(event.risk_level),
                    borderRadius: '50%'
                  }} />
                  <div style={{ fontSize: '1.5rem' }}>
                    {getEventIcon(event.type)}
                  </div>
                  <div>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: 'var(--gray-900)',
                      marginBottom: '0.25rem'
                    }}>
                      {event.description}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--gray-500)',
                      display: 'flex',
                      gap: '1rem'
                    }}>
                      <span>📍 {event.location}</span>
                      <span>🌐 {event.ip_address}</span>
                      <span>⏰ {event.timestamp}</span>
                    </div>
                  </div>
                </div>
                <div style={{
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  backgroundColor: `${getRiskColor(event.risk_level)}20`,
                  color: getRiskColor(event.risk_level)
                }}>
                  {event.risk_level}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
