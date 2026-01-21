'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import OverviewTab from './components/Overview';
import UsersTab from './components/UsersTab';
import DeedsTab from './components/DeedsTab';
import VerificationTab from './components/VerificationTab';
import RevenueTab from './components/RevenueTab';
import SystemTab from './components/SystemTab';
import { FEATURE_FLAGS } from '@/config/featureFlags';
import './styles/tokens.css';
import './styles/admin-honest.css';

// Tab configuration
const TABS: Record<string, { title: string; description: string; component: () => JSX.Element }> = {
  overview: { 
    title: 'Overview', 
    description: 'Key metrics and quick actions',
    component: () => <OverviewTab/> 
  },
  users: { 
    title: 'Users', 
    description: 'Manage user accounts',
    component: () => <UsersTab/> 
  },
  deeds: { 
    title: 'Deeds', 
    description: 'View and manage deeds',
    component: () => <DeedsTab/> 
  },
  verification: { 
    title: 'Verification', 
    description: 'Document authenticity tracking',
    component: () => <VerificationTab/> 
  },
  revenue: { 
    title: 'Revenue', 
    description: 'Stripe revenue analytics',
    component: () => <RevenueTab/> 
  },
  system: { 
    title: 'System', 
    description: 'Health and PDF statistics',
    component: () => <SystemTab/> 
  },
};

function AdminContent() {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'overview';
  
  // Get current tab config (fallback to overview)
  const tab = TABS[currentTab] || TABS.overview;
  const TabComponent = tab.component;
  
  return (
    <div className="admin-content">
      {/* Page Header */}
      <header className="admin-page-header">
        <div>
          <h1 className="admin-page-title">{tab.title}</h1>
          <p className="admin-page-description">{tab.description}</p>
        </div>
      </header>

      {/* Tab Content */}
      <div className="admin-page-content">
        <TabComponent />
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="admin-content">
        <div className="skeleton" style={{ height: 60, marginBottom: 24 }} />
        <div className="skeleton" style={{ height: 400 }} />
      </div>
    }>
      <AdminContent />
    </Suspense>
  );
}
