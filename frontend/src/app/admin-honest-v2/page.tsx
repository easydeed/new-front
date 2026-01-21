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
    // Clear auth tokens
    localStorage.removeItem('access_token');
    localStorage.removeItem('token');
    // Redirect to login
    router.push('/login');
  };
  
  return (
    <div className="admin-shell">
      <div className="hstack" style={{justifyContent:'space-between', marginBottom:12}}>
        <div className="hstack" style={{ gap: '12px' }}>
          <div style={{fontWeight:700, fontSize:20, letterSpacing:.25}}>DeedPro Admin</div>
          {FEATURE_FLAGS.PARTNERS_TAB && (
            <a 
              href="/admin/partners" 
              style={{ 
                padding: '6px 14px', 
                background: '#3b82f6', 
                color: 'white', 
                borderRadius: '6px', 
                textDecoration: 'none', 
                fontSize: '13px',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              🤝 API Partners
            </a>
          )}
        </div>
        <button className="button ghost" onClick={handleLogout}>Logout</button>
      </div>
      <div role="tablist" className="tabs">
        {TABS.map(t => (
          <button key={t.id} role="tab" className="tab" aria-selected={t.id===tab} onClick={()=>setTab(t.id)}>{t.label}</button>
        ))}
      </div>
      <Active/>
    </div>
  );
}

