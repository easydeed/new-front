'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import '../../styles/dashboard.css';

interface UserProfile {
  plan: string;
  plan_limits?: {
    max_deeds_per_month: number;
    api_calls_per_month: number;
  };
}

export default function AccountSettings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '(555) 123-4567',
    company: 'Acme Real Estate',
    address: '123 Main St',
    city: 'Los Angeles',
    state: 'CA',
    zipCode: '90210'
  });

  // Plan management state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  const plans = [
    {
      name: 'Starter',
      price: 'Free',
      features: [
        '5 deeds per month',
        'Basic AI assistance',
        'Standard templates',
        'Email support'
      ],
      buttonText: 'Current Plan',
      disabled: true,
      planKey: 'free'
    },
    {
      name: 'Professional',
      price: '$29/month',
      features: [
        'Unlimited deeds',
        'Advanced AI assistance',
        'Premium templates',
        'SoftPro integration',
        'Priority support'
      ],
      buttonText: 'Upgrade to Pro',
      disabled: false,
      planKey: 'professional'
    },
    {
      name: 'Enterprise',
      price: '$99/month',
      features: [
        'Everything in Professional',
        'Qualia integration',
        'API access',
        'Team management',
        'White-label options',
        '24/7 dedicated support'
      ],
      buttonText: 'Upgrade to Enterprise',
      disabled: false,
      planKey: 'enterprise'
    }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // API functions
  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const profile = await response.json();
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const handleUpgrade = async (planKey: string) => {
    setUpgradeLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        alert('Please log in to upgrade your plan');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/users/upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan: planKey })
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.session_url;
      } else {
        const error = await response.json();
        alert(`Upgrade failed: ${error.detail}`);
      }
    } catch (error) {
      alert('Upgrade failed. Please try again.');
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        alert('Please log in to manage your subscription');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/payments/create-portal-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      } else {
        alert('Failed to open billing portal');
      }
    } catch (error) {
      alert('Failed to open billing portal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const handleSave = () => {
    alert('Settings saved successfully!');
  };

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div className="main-content">
        <div className="settings-container">
          
          {/* Header */}
          <div style={{ marginBottom: '3rem' }}>
            <h1 className="contact-title">Account Settings</h1>
            <p className="contact-paragraph">
              Manage your account preferences and billing information.
            </p>
          </div>

          {/* Tabs */}
          <div className="settings-tabs">
            <button
              className={`settings-tab ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              Profile
            </button>
            <button
              className={`settings-tab ${activeTab === 'billing' ? 'active' : ''}`}
              onClick={() => setActiveTab('billing')}
            >
              Billing
            </button>
            <button
              className={`settings-tab ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('notifications')}
            >
              Notifications
            </button>
            <button
              className={`settings-tab ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              Security
            </button>
          </div>

          {/* Profile Tab */}
          <div className={`settings-content ${activeTab === 'profile' ? 'active' : ''}`}>
            <div className="settings-section">
              <h3>Personal Information</h3>
              <div className="settings-form">
                <div className="settings-form-row">
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      className="form-control"
                      value={formData.firstName}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      className="form-control"
                      value={formData.lastName}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div className="settings-form-row">
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      name="email"
                      className="form-control"
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      className="form-control"
                      value={formData.phone}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Company</label>
                  <input
                    type="text"
                    name="company"
                    className="form-control"
                    value={formData.company}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            <div className="settings-section">
              <h3>Address Information</h3>
              <div className="settings-form">
                <div className="form-group">
                  <label className="form-label">Street Address</label>
                  <input
                    type="text"
                    name="address"
                    className="form-control"
                    value={formData.address}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="settings-form-row">
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      name="city"
                      className="form-control"
                      value={formData.city}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <select
                      name="state"
                      className="form-control"
                      value={formData.state}
                      onChange={handleInputChange}
                    >
                      <option value="CA">California</option>
                      <option value="NY">New York</option>
                      <option value="TX">Texas</option>
                      <option value="FL">Florida</option>
                    </select>
                  </div>
                </div>
                <div className="form-group" style={{ maxWidth: '300px' }}>
                  <label className="form-label">ZIP Code</label>
                  <input
                    type="text"
                    name="zipCode"
                    className="form-control"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Billing Tab */}
          <div className={`settings-content ${activeTab === 'billing' ? 'active' : ''}`}>
            {/* Current Plan Status */}
            <div className="settings-section">
              <h3>Current Plan</h3>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '1.5rem',
                background: 'var(--gray-50)',
                borderRadius: '12px',
                marginBottom: '2rem',
                border: '2px solid var(--secondary-light)'
              }}>
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text)', fontSize: '1.25rem' }}>
                    {userProfile?.plan?.charAt(0).toUpperCase() + userProfile?.plan?.slice(1) || 'Starter'} Plan
                  </h4>
                  <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '0.875rem' }}>
                    {userProfile?.plan === 'free' && '5 deeds per month • Basic AI assistance • Email support'}
                    {userProfile?.plan === 'professional' && 'Unlimited deeds • Advanced AI • SoftPro integration • Priority support'}
                    {userProfile?.plan === 'enterprise' && 'Everything in Pro • Qualia integration • API access • 24/7 support'}
                  </p>
                  {userProfile?.plan_limits && (
                    <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                      {userProfile.plan_limits.max_deeds_per_month > 0 
                        ? `${userProfile.plan_limits.max_deeds_per_month} deeds per month`
                        : 'Unlimited deeds'
                      } • {userProfile.plan_limits.api_calls_per_month} API calls per month
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--text)' }}>
                    {userProfile?.plan === 'free' ? 'Free' : 
                     userProfile?.plan === 'professional' ? '$29' : '$99'}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                    {userProfile?.plan === 'free' ? 'forever' : 'per month'}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              {userProfile?.plan !== 'free' && (
                <div style={{ marginBottom: '2rem' }}>
                  <button 
                    onClick={handleManageSubscription}
                    disabled={loading}
                    style={{
                      background: 'var(--primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.75rem 1.5rem',
                      fontWeight: '500',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      marginRight: '1rem',
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    {loading ? 'Loading...' : 'Manage Subscription'}
                  </button>
                  <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                    Update payment method, download invoices, or cancel subscription
                  </span>
                </div>
              )}
            </div>

            {/* Plan Comparison */}
            <div className="settings-section">
              <h3>Choose Your Plan</h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                gap: '1.5rem',
                marginBottom: '2rem'
              }}>
                {plans.map((plan, index) => (
                  <div 
                    key={plan.planKey}
                    style={{
                      border: userProfile?.plan === plan.planKey ? '2px solid var(--primary)' : '2px solid var(--secondary-light)',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      background: userProfile?.plan === plan.planKey ? 'rgba(59, 130, 246, 0.05)' : 'var(--background)',
                      position: 'relative',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {userProfile?.plan === plan.planKey && (
                      <div style={{
                        position: 'absolute',
                        top: '-1px',
                        right: '1rem',
                        background: 'var(--primary)',
                        color: 'white',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '0 0 8px 8px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        CURRENT
                      </div>
                    )}
                    
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', color: 'var(--text)' }}>
                        {plan.name}
                      </h4>
                      <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '0.5rem' }}>
                        {plan.price}
                      </div>
                    </div>

                    <ul style={{ 
                      listStyle: 'none', 
                      padding: 0, 
                      margin: '0 0 1.5rem 0',
                      fontSize: '0.875rem'
                    }}>
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          marginBottom: '0.5rem',
                          color: 'var(--gray-700)'
                        }}>
                          <svg style={{ width: '16px', height: '16px', color: 'var(--primary)', marginRight: '0.5rem' }} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <button 
                      onClick={() => handleUpgrade(plan.planKey)}
                      disabled={userProfile?.plan === plan.planKey || upgradeLoading}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: userProfile?.plan === plan.planKey ? 'var(--gray-300)' : 'var(--primary)',
                        color: userProfile?.plan === plan.planKey ? 'var(--gray-600)' : 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: userProfile?.plan === plan.planKey || upgradeLoading ? 'not-allowed' : 'pointer',
                        opacity: upgradeLoading ? 0.6 : 1
                      }}
                    >
                      {upgradeLoading ? 'Processing...' : 
                       userProfile?.plan === plan.planKey ? 'Current Plan' : plan.buttonText}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="settings-section">
              <h3>Payment Methods</h3>
              <div style={{ marginBottom: '2rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '1rem',
                  border: '1px solid var(--secondary-light)',
                  borderRadius: '8px',
                  marginBottom: '1rem'
                }}>
                  <div style={{
                    width: '40px',
                    height: '25px',
                    background: 'var(--primary-dark)',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    marginRight: '1rem'
                  }}>VISA</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', color: 'var(--text)' }}>•••• •••• •••• 4242</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>Expires 12/26</div>
                  </div>
                  <span style={{
                    background: 'rgba(163, 230, 53, 0.1)',
                    color: '#365314',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '500'
                  }}>Default</span>
                </div>
              </div>
              <button 
                style={{
                  background: 'var(--background)',
                  border: '2px solid var(--secondary-light)',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  color: 'var(--text)',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--gray-400)';
                  e.currentTarget.style.background = 'var(--gray-50)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--secondary-light)';
                  e.currentTarget.style.background = 'var(--background)';
                }}
              >
                + Add Payment Method
              </button>
            </div>

            <div className="settings-section">
              <h3>Billing History</h3>
              <div className="table-responsive">
                <table className="table w-100 table-striped">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Jan 15, 2024</td>
                      <td>Professional Plan - Monthly</td>
                      <td>$29.00</td>
                      <td><span className="badge badge-success">Paid</span></td>
                    </tr>
                    <tr>
                      <td>Dec 15, 2023</td>
                      <td>Professional Plan - Monthly</td>
                      <td>$29.00</td>
                      <td><span className="badge badge-success">Paid</span></td>
                    </tr>
                    <tr>
                      <td>Nov 15, 2023</td>
                      <td>Professional Plan - Monthly</td>
                      <td>$29.00</td>
                      <td><span className="badge badge-success">Paid</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Notifications Tab */}
          <div className={`settings-content ${activeTab === 'notifications' ? 'active' : ''}`}>
            <div className="settings-section">
              <h3>Email Notifications</h3>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {[
                  { id: 'deed-completed', label: 'Deed completion notifications', description: 'Get notified when your deeds are ready' },
                  { id: 'payment-receipts', label: 'Payment receipts', description: 'Receive receipts for all payments' },
                  { id: 'shared-deed-updates', label: 'Shared deed updates', description: 'Notifications when shared deeds are approved or rejected' },
                  { id: 'marketing', label: 'Marketing communications', description: 'Product updates and feature announcements' }
                ].map((item) => (
                  <label key={item.id} style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '1rem',
                    padding: '1rem',
                    border: '1px solid var(--secondary-light)',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}>
                    <input 
                      type="checkbox" 
                      defaultChecked={item.id !== 'marketing'} 
                      style={{ marginTop: '0.25rem' }}
                    />
                    <div>
                      <div style={{ fontWeight: '500', color: 'var(--text)' }}>{item.label}</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>{item.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Security Tab */}
          <div className={`settings-content ${activeTab === 'security' ? 'active' : ''}`}>
            <div className="settings-section">
              <h3>Change Password</h3>
              <div className="settings-form" style={{ maxWidth: '500px' }}>
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input type="password" className="form-control" />
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input type="password" className="form-control" />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input type="password" className="form-control" />
                </div>
                <button className="wizard-btn wizard-btn-primary">
                  Update Password
                </button>
              </div>
            </div>

            <div className="settings-section">
              <h3>Two-Factor Authentication</h3>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '1.5rem',
                background: 'var(--gray-50)',
                borderRadius: '8px'
              }}>
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text)' }}>SMS Authentication</h4>
                  <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '0.875rem' }}>
                    Add an extra layer of security to your account
                  </p>
                </div>
                <button className="wizard-btn wizard-btn-secondary">
                  Enable 2FA
                </button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          {activeTab === 'profile' && (
            <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--secondary-light)' }}>
              <button 
                className="wizard-btn wizard-btn-primary"
                onClick={handleSave}
              >
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 