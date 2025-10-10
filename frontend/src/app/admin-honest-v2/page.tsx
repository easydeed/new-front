'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import OverviewTab from './components/Overview';
import UsersTab from './components/UsersTab';
import DeedsTab from './components/DeedsTab';
import RevenueTab from './components/RevenueTab';
import SystemTab from './components/SystemTab';
import { FEATURE_FLAGS } from '@/config/featureFlags';
import './styles/tokens.css';
import './styles/admin-honest.css';

const TABS = [
  { id:'overview', label:'Overview', render: ()=> <OverviewTab/> },
  { id:'users',    label:'Users',    render: ()=> <UsersTab/> },
  { id:'deeds',    label:'Deeds',    render: ()=> <DeedsTab/> },
  ...(FEATURE_FLAGS.REVENUE_TAB ? [{ id:'revenue', label:'Revenue', render: ()=> <RevenueTab/> }] : []),
  ...(FEATURE_FLAGS.SYSTEM_TAB  ? [{ id:'system',  label:'System',  render: ()=> <SystemTab/>  }] : [])
] as const;

export default function AdminHonestV2Page(){
  const [tab, setTab] = useState(TABS[0].id);
  const router = useRouter();
  const Active = TABS.find(t=> t.id===tab)!.render;
  
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
        <div className="hstack">
          <div style={{fontWeight:700, fontSize:20, letterSpacing:.25}}>Admin — Honest (v2)</div>
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

