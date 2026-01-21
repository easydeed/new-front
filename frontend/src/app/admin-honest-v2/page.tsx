'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import OverviewTab from './components/Overview';
import UsersTab from './components/UsersTab';
import DeedsTab from './components/DeedsTab';
import VerificationTab from './components/VerificationTab';
import RevenueTab from './components/RevenueTab';
import SystemTab from './components/SystemTab';
import { FEATURE_FLAGS } from '@/config/featureFlags';
import './styles/tokens.css';
import './styles/admin-honest.css';

// Build tabs array based on feature flags
const TABS = [
  { id:'overview', label:'Overview', render: ()=> <OverviewTab/> },
  { id:'users',    label:'Users',    render: ()=> <UsersTab/> },
  { id:'deeds',    label:'Deeds',    render: ()=> <DeedsTab/> },
  ...(FEATURE_FLAGS.VERIFICATION_TAB ? [{ id:'verification', label:'Verification', render: ()=> <VerificationTab/> }] : []),
  ...(FEATURE_FLAGS.REVENUE_TAB ? [{ id:'revenue', label:'Revenue', render: ()=> <RevenueTab/> }] : []),
  ...(FEATURE_FLAGS.SYSTEM_TAB  ? [{ id:'system',  label:'System',  render: ()=> <SystemTab/>  }] : [])
];

export default function AdminHonestV2Page(){
  const [tab, setTab] = useState(TABS[0].id);
  const router = useRouter();
  const Active = TABS.find(t=> t.id===tab)?.render || (() => null);
  
  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('token');
    router.push('/login');
  };
  
  return (
    <div className="admin-shell">
      {/* Header */}
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 8,
        paddingBottom: 20,
        borderBottom: '1px solid var(--dp-border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ 
            width: 40, 
            height: 40, 
            background: 'linear-gradient(135deg, #F57C00 0%, #FF9800 100%)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 700,
            fontSize: 18
          }}>
            D
          </div>
          <div>
            <h1 style={{ 
              fontSize: 22, 
              fontWeight: 700, 
              color: 'var(--dp-text)',
              margin: 0,
              letterSpacing: '-0.02em'
            }}>
              DeedPro Admin
            </h1>
            <p style={{ 
              fontSize: 13, 
              color: 'var(--dp-text-dim)',
              margin: 0
            }}>
              Manage users, deeds, and analytics
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {FEATURE_FLAGS.PARTNERS_TAB && (
            <a 
              href="/admin/partners" 
              style={{ 
                padding: '8px 16px', 
                background: 'var(--dp-bg-subtle)', 
                color: 'var(--dp-text)',
                borderRadius: 'var(--dp-radius-sm)', 
                textDecoration: 'none', 
                fontSize: '14px',
                fontWeight: 500,
                border: '1px solid var(--dp-border)',
                transition: 'all 0.2s'
              }}
            >
              API Partners
            </a>
          )}
          <button 
            className="button ghost" 
            onClick={handleLogout}
            style={{ padding: '8px 16px' }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div role="tablist" className="tabs">
        {TABS.map(t => (
          <button 
            key={t.id} 
            role="tab" 
            className="tab" 
            aria-selected={t.id===tab} 
            onClick={()=>setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <Active/>
    </div>
  );
}

