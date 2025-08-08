'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import '../../styles/dashboard.css';

interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'away' | 'offline';
  deeds_completed: number;
  avg_completion_time: string;
  last_active: string;
  avatar_color: string;
}

interface TeamStats {
  total_deeds_this_month: number;
  avg_team_efficiency: number;
  properties_cached: number;
  ai_suggestions_accepted: number;
  team_time_saved: string;
}

interface RecentActivity {
  id: number;
  user_name: string;
  action: string;
  deed_type: string;
  property_address: string;
  timestamp: string;
  ai_assisted: boolean;
}

export default function TeamDashboard() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const router = useRouter();

  useEffect(() => {
    // Mock data for demonstration - in production, fetch from API
    const mockTeamMembers: TeamMember[] = [
      {
        id: 1,
        name: 'Sarah Johnson',
        email: 'sarah@abcescrow.com',
        role: 'Senior Escrow Officer',
        status: 'active',
        deeds_completed: 47,
        avg_completion_time: '12 min',
        last_active: '2 minutes ago',
        avatar_color: '#4F46E5'
      },
      {
        id: 2,
        name: 'Michael Chen',
        email: 'michael@abcescrow.com',
        role: 'Escrow Officer',
        status: 'active',
        deeds_completed: 33,
        avg_completion_time: '18 min',
        last_active: '5 minutes ago',
        avatar_color: '#059669'
      },
      {
        id: 3,
        name: 'Lisa Rodriguez',
        email: 'lisa@abcescrow.com',
        role: 'Title Officer',
        status: 'away',
        deeds_completed: 28,
        avg_completion_time: '15 min',
        last_active: '1 hour ago',
        avatar_color: '#DC2626'
      },
      {
        id: 4,
        name: 'David Park',
        email: 'david@abcescrow.com',
        role: 'Junior Escrow Officer',
        status: 'active',
        deeds_completed: 19,
        avg_completion_time: '25 min',
        last_active: 'Just now',
        avatar_color: '#7C2D12'
      }
    ];

    const mockTeamStats: TeamStats = {
      total_deeds_this_month: 127,
      avg_team_efficiency: 68,
      properties_cached: 234,
      ai_suggestions_accepted: 892,
      team_time_saved: '47.3 hours'
    };

    const mockRecentActivity: RecentActivity[] = [
      {
        id: 1,
        user_name: 'Sarah Johnson',
        action: 'Created',
        deed_type: 'Grant Deed',
        property_address: '123 Oak Avenue, Los Angeles, CA',
        timestamp: '3 minutes ago',
        ai_assisted: true
      },
      {
        id: 2,
        user_name: 'Michael Chen',
        action: 'Completed',
        deed_type: 'Quitclaim Deed',
        property_address: '456 Pine Street, Beverly Hills, CA',
        timestamp: '12 minutes ago',
        ai_assisted: true
      },
      {
        id: 3,
        user_name: 'David Park',
        action: 'Started',
        deed_type: 'Trust Transfer',
        property_address: '789 Maple Drive, Santa Monica, CA',
        timestamp: '18 minutes ago',
        ai_assisted: false
      },
      {
        id: 4,
        user_name: 'Lisa Rodriguez',
        action: 'Reviewed',
        deed_type: 'Warranty Deed',
        property_address: '321 Elm Street, Pasadena, CA',
        timestamp: '1 hour ago',
        ai_assisted: true
      }
    ];

    setTeamMembers(mockTeamMembers);
    setTeamStats(mockTeamStats);
    setRecentActivity(mockRecentActivity);
    setLoading(false);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'away': return '#F59E0B';
      case 'offline': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'away': return 'Away';
      case 'offline': return 'Offline';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <div className="main-content">
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '400px',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #f3f4f6',
              borderTop: '4px solid var(--primary-dark)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ color: 'var(--gray-600)', fontSize: '1.125rem' }}>Loading team dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

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
              Team Dashboard
            </h1>
            <p style={{
              fontSize: '1rem',
              color: 'var(--gray-600)',
              margin: '0.5rem 0 0 0'
            }}>
              Collaborative AI-powered deed creation workspace
            </p>
          </div>
          <button
            onClick={() => router.push('/team/invite')}
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
            <span>+</span> Invite Team Member
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--gray-200)',
          marginBottom: '2rem',
          padding: '0 1rem'
        }}>
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'members', label: 'Team Members', icon: '👥' },
            { id: 'activity', label: 'Recent Activity', icon: '⚡' },
            { id: 'analytics', label: 'Analytics', icon: '📈' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'none',
                border: 'none',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                borderBottom: activeTab === tab.id ? '2px solid var(--primary-dark)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--primary-dark)' : 'var(--gray-600)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div style={{ padding: '0 1rem' }}>
            {/* Team Stats Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
              {teamStats && [
                {
                  title: 'Deeds This Month',
                  value: teamStats.total_deeds_this_month.toString(),
                  subtitle: '+23% vs last month',
                  icon: '📄',
                  color: '#10B981'
                },
                {
                  title: 'Team Efficiency',
                  value: `${teamStats.avg_team_efficiency}%`,
                  subtitle: 'Average time saved with AI',
                  icon: '⚡',
                  color: '#F59E0B'
                },
                {
                  title: 'Properties Cached',
                  value: teamStats.properties_cached.toString(),
                  subtitle: 'Shared intelligence database',
                  icon: '🏠',
                  color: '#8B5CF6'
                },
                {
                  title: 'Time Saved',
                  value: teamStats.team_time_saved,
                  subtitle: 'Total team savings this month',
                  icon: '⏰',
                  color: '#06B6D4'
                }
              ].map((stat, index) => (
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
                      backgroundColor: `${stat.color}20`,
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px'
                    }}>
                      {stat.icon}
                    </div>
                    <div>
                      <h3 style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: 'var(--gray-600)',
                        margin: 0
                      }}>
                        {stat.title}
                      </h3>
                    </div>
                  </div>
                  <div style={{
                    fontSize: '2rem',
                    fontWeight: '700',
                    color: 'var(--gray-900)',
                    marginBottom: '0.5rem'
                  }}>
                    {stat.value}
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: 'var(--gray-500)'
                  }}>
                    {stat.subtitle}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div style={{
              background: 'white',
              border: '1px solid var(--gray-200)',
              borderRadius: '16px',
              padding: '1.5rem',
              marginBottom: '2rem'
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: 'var(--gray-900)',
                marginBottom: '1rem'
              }}>
                🚀 Quick Actions
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem'
              }}>
                {[
                  {
                    title: 'Start Team Deed',
                    description: 'Create deed with AI collaboration',
                    icon: '✨',
                    action: () => router.push('/create-deed?team=true')
                  },
                  {
                    title: 'View Shared Cache',
                    description: 'Browse team property database',
                    icon: '🏠',
                    action: () => setActiveTab('analytics')
                  },
                  {
                    title: 'Team Templates',
                    description: 'Manage company standards',
                    icon: '📋',
                    action: () => router.push('/team/templates')
                  },
                  {
                    title: 'Performance Report',
                    description: 'Export team analytics',
                    icon: '📊',
                    action: () => setActiveTab('analytics')
                  }
                ].map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    style={{
                      background: 'var(--gray-50)',
                      border: '1px solid var(--gray-200)',
                      borderRadius: '12px',
                      padding: '1rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--primary-dark)';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--gray-50)';
                      e.currentTarget.style.color = 'initial';
                    }}
                  >
                    <div style={{
                      fontSize: '1.5rem',
                      marginBottom: '0.5rem'
                    }}>
                      {action.icon}
                    </div>
                    <div style={{
                      fontWeight: '600',
                      marginBottom: '0.25rem'
                    }}>
                      {action.title}
                    </div>
                    <div style={{
                      fontSize: '0.875rem',
                      opacity: 0.8
                    }}>
                      {action.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Team Members Tab */}
        {activeTab === 'members' && (
          <div style={{ padding: '0 1rem' }}>
            <div style={{
              display: 'grid',
              gap: '1rem'
            }}>
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  style={{
                    background: 'white',
                    border: '1px solid var(--gray-200)',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '50px',
                      height: '50px',
                      backgroundColor: member.avatar_color,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: '600',
                      fontSize: '1.25rem',
                      position: 'relative'
                    }}>
                      {member.name.split(' ').map(n => n[0]).join('')}
                      <div style={{
                        position: 'absolute',
                        bottom: '2px',
                        right: '2px',
                        width: '12px',
                        height: '12px',
                        backgroundColor: getStatusColor(member.status),
                        borderRadius: '50%',
                        border: '2px solid white'
                      }} />
                    </div>
                    <div>
                      <h4 style={{
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        color: 'var(--gray-900)',
                        margin: 0
                      }}>
                        {member.name}
                      </h4>
                      <p style={{
                        fontSize: '0.875rem',
                        color: 'var(--gray-600)',
                        margin: '0.25rem 0'
                      }}>
                        {member.role}
                      </p>
                      <p style={{
                        fontSize: '0.75rem',
                        color: 'var(--gray-500)',
                        margin: 0
                      }}>
                        {getStatusText(member.status)} • Last active {member.last_active}
                      </p>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: '2rem',
                    alignItems: 'center'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        color: 'var(--gray-900)'
                      }}>
                        {member.deeds_completed}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--gray-500)'
                      }}>
                        Deeds Completed
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        color: 'var(--gray-900)'
                      }}>
                        {member.avg_completion_time}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--gray-500)'
                      }}>
                        Avg Time
                      </div>
                    </div>
                    <button
                      style={{
                        backgroundColor: 'var(--primary-dark)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        fontSize: '0.875rem',
                        cursor: 'pointer'
                      }}
                    >
                      View Profile
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity Tab */}
        {activeTab === 'activity' && (
          <div style={{ padding: '0 1rem' }}>
            <div style={{
              background: 'white',
              border: '1px solid var(--gray-200)',
              borderRadius: '16px',
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
                  margin: 0
                }}>
                  ⚡ Real-time Team Activity
                </h3>
              </div>
              <div>
                {recentActivity.map((activity, index) => (
                  <div
                    key={activity.id}
                    style={{
                      padding: '1rem 1.5rem',
                      borderBottom: index < recentActivity.length - 1 ? '1px solid var(--gray-100)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: activity.ai_assisted ? 'var(--accent)' : 'var(--gray-400)',
                        borderRadius: '50%'
                      }} />
                      <div>
                        <div style={{
                          fontSize: '0.875rem',
                          color: 'var(--gray-900)',
                          marginBottom: '0.25rem'
                        }}>
                          <strong>{activity.user_name}</strong> {activity.action.toLowerCase()} a{' '}
                          <span style={{ color: 'var(--primary-dark)' }}>{activity.deed_type}</span>
                          {activity.ai_assisted && (
                            <span style={{
                              marginLeft: '8px',
                              fontSize: '0.75rem',
                              backgroundColor: 'var(--accent-soft)',
                              color: 'var(--accent)',
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}>
                              ✨ AI Assisted
                            </span>
                          )}
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: 'var(--gray-500)'
                        }}>
                          {activity.property_address}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--gray-500)'
                    }}>
                      {activity.timestamp}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div style={{ padding: '0 1rem' }}>
            <div style={{
              background: 'white',
              border: '1px solid var(--gray-200)',
              borderRadius: '16px',
              padding: '2rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📊</div>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: 'var(--gray-900)',
                marginBottom: '1rem'
              }}>
                Advanced Analytics Coming Soon
              </h3>
              <p style={{
                fontSize: '1rem',
                color: 'var(--gray-600)',
                marginBottom: '2rem'
              }}>
                Get detailed insights into team performance, AI usage patterns, and efficiency metrics.
              </p>
              <button
                style={{
                  backgroundColor: 'var(--primary-dark)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Request Early Access
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
