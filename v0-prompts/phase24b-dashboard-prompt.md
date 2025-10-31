# V0 Prompt – DeedPro User Dashboard (Phase 24-B)

## 🎯 Task
Redesign the **User Dashboard** for DeedPro while **preserving ALL existing logic** (authentication, API calls, Sidebar integration, draft resume banner).

## 🔒 **CRITICAL: Keep ALL Logic**

### **Authentication Flow:**
- ✅ Check `localStorage.getItem('access_token')`
- ✅ Verify token with `GET /users/profile`
- ✅ Redirect to `/login?redirect=/dashboard` if invalid
- ✅ Show loading spinner during auth check

### **API Endpoints:**
- ✅ `GET /users/profile` - Verify auth
- ✅ `GET /deeds/summary` - Dashboard stats
- ✅ `GET /deeds` - Recent deeds list

### **Data Display:**
- ✅ 4 stat cards (Total Deeds, In Progress, Completed, This Month)
- ✅ Recent Activity table (5 most recent deeds)
- ✅ Resume Draft Banner (conditional)

### **Sidebar Integration:**
- ✅ Use existing `<Sidebar />` component
- ✅ Responsive layout with `.main-content` class
- ✅ Sidebar collapse state handling

## 🎨 **Design Requirements**
- Modern, clean UI with purple (#7C4DFF) brand
- Card-based layout
- Stats with icons
- Data table for recent activity
- Mobile-first responsive
- Match Auth pages style

## 🎨 **Color Palette**
```css
Primary: #7C4DFF (purple)
Background: #F9F9F9
Surface: #FFFFFF
Text: #1F2B37
Success: #10B981
Warning: #F59E0B
Info: #3B82F6
```

## 📋 **Current Logic (MUST Keep):**

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recentDeeds, setRecentDeeds] = useState([]);
  const [summary, setSummary] = useState<{
    total: number; 
    completed: number; 
    in_progress: number; 
    month: number
  } | null>(null);
  const router = useRouter();

  // Authentication check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          router.push('/login?redirect=/dashboard');
          return;
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com'}/users/profile`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        
        if (response.ok) {
          setIsAuthenticated(true);
          await fetchRecentDeeds();
        } else {
          localStorage.removeItem('access_token');
          router.push('/login?redirect=/dashboard');
          return;
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login?redirect=/dashboard');
        return;
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Fetch dashboard summary stats
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const api = process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com';
    const token = localStorage.getItem('access_token');
    
    (async () => {
      try {
        const res = await fetch(`${api}/deeds/summary`, { 
          headers: token ? { Authorization: `Bearer ${token}` } : {} 
        });
        
        if (res.ok) {
          setSummary(await res.json());
        } else {
          // Fallback: calculate from deeds list
          const list = await fetch(`${api}/deeds`, { 
            headers: token ? { Authorization: `Bearer ${token}` } : {} 
          });
          if (list.ok) {
            const data = await list.json();
            const deeds = Array.isArray(data.deeds) ? data.deeds : [];
            const total = deeds.length;
            const completed = deeds.filter((d: any) => d.status === 'completed').length;
            const in_progress = deeds.filter((d: any) => d.status !== 'completed').length;
            setSummary({ total, completed, in_progress, month: completed });
          }
        }
      } catch (e) {
        console.error('Failed to load dashboard summary:', e);
      }
    })();
  }, [isAuthenticated]);

  const fetchRecentDeeds = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch('https://deedpro-main-api.onrender.com/deeds', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRecentDeeds(data.deeds || []);
      }
    } catch (error) {
      console.error('Error fetching recent deeds:', error);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7C4DFF] mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex bg-[#F9F9F9] min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#1F2B37] mb-2">Welcome to DeedPro</h1>
            <p className="text-gray-600">Your smooth path to professional deeds — guided, simple, effortless.</p>
          </div>

          {/* Resume Draft Banner */}
          <ResumeDraftBanner />

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard 
              label="Total Deeds" 
              value={summary?.total ?? '—'} 
              icon={<FileIcon />}
              color="blue"
            />
            <StatCard 
              label="In Progress" 
              value={summary?.in_progress ?? '—'} 
              icon={<ClockIcon />}
              color="yellow"
            />
            <StatCard 
              label="Completed" 
              value={summary?.completed ?? '—'} 
              icon={<CheckIcon />}
              color="green"
            />
            <StatCard 
              label="This Month" 
              value={summary?.month ?? '—'} 
              icon={<CalendarIcon />}
              color="purple"
            />
          </div>

          {/* Recent Activity Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-[#1F2B37] mb-4">Recent Activity</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Action</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Property</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDeeds.length > 0 ? (
                    recentDeeds.slice(0, 5).map((deed: any) => (
                      <tr key={deed.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">Deed Created</td>
                        <td className="py-3 px-4">{deed.property || deed.address || 'No address'}</td>
                        <td className="py-3 px-4">
                          {deed.created_at ? new Date(deed.created_at).toLocaleDateString() : 'No date'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            deed.status === 'completed' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {deed.status || 'Completed'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-gray-500">
                        No recent activity.{' '}
                        <a href="/create-deed" className="text-[#7C4DFF] hover:underline font-semibold">
                          Create your first deed
                        </a>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Resume Draft Banner Component
function ResumeDraftBanner() {
  const [hasDraft, setHasDraft] = useState(false);
  const [draftInfo, setDraftInfo] = useState<{
    formData?: {deedType?: string}, 
    currentStep?: number, 
    savedAt?: string
  } | null>(null);

  useEffect(() => {
    const checkForDraft = () => {
      if (typeof window === 'undefined') return;
      try {
        const raw = localStorage.getItem('deedWizardDraft');
        if (!raw) {
          setHasDraft(false);
          return;
        }
        const parsed = JSON.parse(raw);
        if (!parsed?.formData || !parsed?.formData?.deedType) {
          setHasDraft(false);
          return;
        }
        setHasDraft(true);
        setDraftInfo(parsed);
      } catch {
        setHasDraft(false);
      }
    };

    checkForDraft();

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'deedWizardDraft') {
        checkForDraft();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(checkForDraft, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  if (!hasDraft || !draftInfo) return null;

  const deedType = draftInfo.formData?.deedType || 'Deed';
  const currentStep = draftInfo.currentStep || 1;
  const savedAt = draftInfo.savedAt ? new Date(draftInfo.savedAt).toLocaleDateString() : 'recently';

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-8 flex items-center justify-between">
      <div>
        <h3 className="font-bold text-[#1F2B37] mb-1">Resume {deedType} Creation</h3>
        <p className="text-gray-600 text-sm">Step {currentStep} of 5 • Saved {savedAt}</p>
      </div>
      <a 
        href="/create-deed"
        className="bg-[#7C4DFF] hover:bg-[#6A3FE6] text-white px-6 py-3 rounded-lg font-semibold transition-colors"
      >
        Continue
      </a>
    </div>
  );
}
```

## 🎨 **UI Layout:**

```
┌─────────────────────────────────────────────────┐
│ Sidebar │  Welcome to DeedPro                   │
│         │  Your smooth path to...                │
│         │                                        │
│ [Nav]   │  [Resume Draft Banner if exists]      │
│         │                                        │
│ [Nav]   │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │
│         │  │Total │ │InProg│ │Compl │ │Month │ │
│ [Nav]   │  │  ##  │ │  ##  │ │  ##  │ │  ##  │ │
│         │  └──────┘ └──────┘ └──────┘ └──────┘ │
│ [Nav]   │                                        │
│         │  Recent Activity                       │
│ [Nav]   │  ┌────────────────────────────────┐   │
│         │  │ Action │ Property │ Date │ Status│ │
│ [Nav]   │  ├────────────────────────────────┤   │
│         │  │ Deed Created │ 123 Main │ ...   │  │
│         │  │ Deed Created │ 456 Oak  │ ...   │  │
│         │  └────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## ⚠️ **CRITICAL REQUIREMENTS:**

### **1. Sidebar Integration:**
```typescript
import Sidebar from '../../components/Sidebar';

// In return:
<div className="flex bg-[#F9F9F9] min-h-screen">
  <Sidebar />
  <main className="flex-1 p-8">
    {/* Dashboard content */}
  </main>
</div>
```

### **2. Authentication Guards:**
- Loading state MUST show spinner
- Unauthenticated MUST return null (redirect happens in useEffect)
- All API calls MUST use `access_token` from localStorage

### **3. Draft Banner Logic:**
- Check `localStorage.getItem('deedWizardDraft')`
- Parse JSON, extract `formData.deedType`, `currentStep`, `savedAt`
- Only show if draft exists with valid deedType
- Listen for storage changes (interval + event listener)
- Link to `/create-deed`

### **4. Stats Cards:**
- Display `summary?.total`, `summary?.in_progress`, `summary?.completed`, `summary?.month`
- Show '—' if data not loaded
- Each card has icon and color theme

### **5. Recent Activity Table:**
- Show first 5 deeds from `recentDeeds.slice(0, 5)`
- Display: Action (always "Deed Created"), Property (deed.property || deed.address), Date, Status
- If empty, show "No recent activity" with link to `/create-deed`
- Status badge: green for "completed", blue for others

## ⚠️ **DO NOT CHANGE:**
- Authentication flow
- API endpoints
- localStorage keys (`access_token`, `deedWizardDraft`)
- Sidebar component import
- Draft banner logic
- Data fetching logic

## 🎯 **Deliverable:**
Single `page.tsx` with:
- 'use client' directive
- Sidebar integration
- Modern purple-themed UI
- All original logic preserved
- Responsive layout

---

**Instructions for V0:** Create a modern user dashboard for DeedPro. MUST preserve all authentication, API calls, Sidebar integration, and draft resume banner logic. Improve visual design with purple (#7C4DFF) brand colors, card-based layout, and clean typography. Make it look professional and enterprise-grade.

