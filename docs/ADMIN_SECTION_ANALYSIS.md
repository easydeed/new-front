# 🔍 **ADMIN SECTION - BRUTALLY HONEST ANALYSIS**

**Date**: October 9, 2025  
**Reviewer**: Senior Systems Architect  
**Context**: Comprehensive audit after Phase 11 / AuthOverhaul completion

---

## 📊 **EXECUTIVE SUMMARY**

### **Overall Assessment**: ⚠️ **40% REAL, 60% FACADE**

**Translation**: The admin dashboard looks **absolutely gorgeous** with a polished Enterprise UI, but underneath it's mostly **hardcoded demo data and non-functional buttons**. It's like a movie set—beautiful from the front, but plywood and scaffolding from behind.

---

## 🎯 **THE GOOD (What Actually Works)**

### **✅ REAL & FUNCTIONAL** (These actually hit the backend)

#### **1. Dashboard Overview Stats** ✅
- **Status**: REAL
- **Endpoint**: `GET /admin/dashboard`
- **Data**: 
  - Total users: **REAL** (from database)
  - Active users: **REAL** (from database)
  - Total deeds: **REAL** (from database)
  - Deeds this month: **REAL** (from database)
  - Total revenue: **REAL** (from Stripe)
  - Monthly revenue: **REAL** (from Stripe)

**Code Evidence** (`frontend/src/app/admin/page.tsx:161-179`):
```typescript
const dashboardResponse = await fetch('https://deedpro-main-api.onrender.com/admin/dashboard', { headers });
if (dashboardResponse.ok) {
  const dashboardData = await dashboardResponse.json();
  setStats({
    total_users: dashboardData.total_users,  // REAL!
    active_users: dashboardData.active_users, // REAL!
    total_deeds: dashboardData.total_deeds,   // REAL!
    // ...
  });
}
```

---

#### **2. User Management** ✅
- **Status**: REAL (with limitations)
- **Endpoint**: `GET /admin/users?limit=10`
- **Data**: First 10 users fetched from database with:
  - Email, name, subscription plan, status, deed count
- **Backend**: `backend/main.py:843-946`
- **Limitations**: 
  - Limited to 10 users (hardcoded)
  - No pagination implemented
  - Filters (role, search) are UI-only (don't actually filter backend)
  - "View" and "Edit" buttons: **NON-FUNCTIONAL** ❌

**Code Evidence** (`frontend/src/app/admin/page.tsx:182-189`):
```typescript
const usersResponse = await fetch('https://deedpro-main-api.onrender.com/admin/users?limit=10', { headers });
if (usersResponse.ok) {
  const usersData = await usersResponse.json();
  setUsers(usersData.users || []);  // REAL!
}
```

---

#### **3. Deeds Management** ✅
- **Status**: REAL (with limitations)
- **Endpoint**: `GET /admin/deeds?limit=10`
- **Data**: First 10 deeds fetched from database
- **Backend**: `backend/main.py:1053-1135`
- **Limitations**:
  - Limited to 10 deeds (hardcoded)
  - Status filter is UI-only (doesn't filter backend)
  - "View" button: **NON-FUNCTIONAL** ❌
  - "Delete" button: **NON-FUNCTIONAL** ❌
  - "Export Deeds" button: **NON-FUNCTIONAL** ❌

---

#### **4. Pricing Management** ✅
- **Status**: REAL & FULLY FUNCTIONAL! 🎉
- **Endpoints**: 
  - `GET /pricing` - Fetch plans
  - `POST /admin/create-plan` - Create new Stripe product + price
  - `POST /admin/sync-pricing` - Sync from Stripe
  - `POST /admin/update-price` - Update existing plan
- **Backend**: `backend/main.py:2094-2210`
- **Features**:
  - Create plans in Stripe ✅
  - Sync plans from Stripe ✅
  - Update plan prices ✅
  - Preview how plans appear on landing page ✅

**VERDICT**: This tab is the **gold standard**—fully functional, real integration, no fake data!

---

## 🚨 **THE BAD (What's Fake)**

### **❌ HARDCODED / NON-FUNCTIONAL** (These are just pretty UI)

#### **1. API & Integrations Tab** ❌
- **Status**: **100% FAKE**
- **Data**: All hardcoded in `frontend/src/app/admin/page.tsx:201-251`

**Hardcoded Data**:
```typescript
setApiUsage([
  {
    user_id: 1,
    user_email: "john@example.com",        // FAKE!
    endpoint: "/api/v1/softpro/webhook",   // FAKE!
    calls_today: 45,                       // FAKE!
    calls_month: 2847,                     // FAKE!
    last_call: "2024-01-15T10:30:00Z",    // FAKE!
    status: "active"
  },
  // ... more hardcoded data
]);

setIntegrations([
  {
    id: 1,
    name: "SoftPro 360",                   // FAKE!
    type: "softpro",
    status: "active",                      // FAKE!
    users_count: 89,                       // FAKE!
    calls_today: 1247,                     // FAKE!
    last_sync: "2024-01-15T10:30:00Z",   // FAKE!
    webhook_url: "https://api.deedpro.io/webhooks/softpro" // FAKE!
  },
  // ... more fake integrations
]);
```

**Reality Check**:
- No `/admin/api-usage` endpoint exists in backend
- No `/admin/integrations` endpoint exists
- SoftPro and Qualia integrations **don't actually exist**!
- All numbers are completely fictional

**BUT WAIT... LOOK AT THE BOTTOM**:
```typescript
// Set empty arrays for features not yet implemented with real endpoints
setApiUsage([]);         // ← CLEARED IMMEDIATELY! 😱
setIntegrations([]);     // ← CLEARED IMMEDIATELY! 😱
```

**VERDICT**: Tab shows **NOTHING** in production. All that hardcoded data gets overwritten with empty arrays. This tab is **literally empty** when you visit it!

---

#### **2. Audit Logs Tab** ❌
- **Status**: **100% FAKE**
- **Data**: All hardcoded in `frontend/src/app/admin/page.tsx:253-287`

**Hardcoded Data**:
```typescript
setAuditLogs([
  {
    id: 1,
    user_email: "admin@deedpro.com",              // FAKE!
    action: "USER_LOGIN",                         // FAKE!
    resource: "Admin Dashboard",                  // FAKE!
    timestamp: "2024-01-15T10:30:00Z",          // FAKE!
    ip_address: "192.168.1.100",                // FAKE!
    user_agent: "Mozilla/5.0 ...",              // FAKE!
    details: "Admin user logged into dashboard", // FAKE!
    success: true
  },
  // ... more fake audit logs
]);
```

**Reality Check**:
- No `/admin/audit-logs` endpoint exists
- No audit logging system implemented in backend
- All data is theatrical fiction

**BUT AGAIN**:
```typescript
// Set empty arrays for features not yet implemented with real endpoints
setAuditLogs([]);  // ← CLEARED! Tab is EMPTY!
```

**VERDICT**: Another **empty tab**. All features (search, filter, export) are non-functional.

---

#### **3. Notifications** ❌
- **Status**: **100% FAKE**
- **Data**: Hardcoded in `frontend/src/app/admin/page.tsx:289-316`

**Hardcoded Data**:
```typescript
setNotifications([
  {
    id: 1,
    type: "warning",
    title: "High API Usage",                                  // FAKE!
    message: "API calls are 20% above normal...",            // FAKE!
    timestamp: "2024-01-15T10:15:00Z",                      // FAKE!
    read: false,
    action_url: "/admin?tab=api"
  },
  // ... more fake notifications
]);
```

**Reality Check**:
- No `/admin/notifications` endpoint
- No notification system
- Sidebar shows "unread count" that's **always zero** in production

**AND ONCE MORE**:
```typescript
// Set empty arrays for features not yet implemented with real endpoints
setNotifications([]);  // ← CLEARED! No notifications ever!
```

**VERDICT**: The red notification badge in the sidebar? **Never shows up** because notifications array is empty!

---

#### **4. System Metrics / Health Tab** ❌
- **Status**: **PARTIALLY FAKE**
- **Data**: Hardcoded in `frontend/src/app/admin/page.tsx:318-324`

**Hardcoded Data**:
```typescript
setSystemMetrics([
  { 
    timestamp: "2024-01-15T06:00:00Z", 
    api_calls: 1200,         // FAKE!
    response_time: 45,       // FAKE!
    error_rate: 0.01,        // FAKE!
    active_users: 234        // FAKE!
  },
  // ... more fake metrics
]);
```

**Reality Check**:
- A `/admin/system-metrics` endpoint EXISTS! (`backend/main.py:1248`)
- But frontend **never calls it**!
- All the pretty charts use hardcoded data
- Then gets **cleared to empty array**

**VERDICT**: Backend has real metrics (from Phase 6-2), but **frontend doesn't use them**. Tab shows empty state.

---

#### **5. Revenue Analytics Tab** ⚠️
- **Status**: **PARTIALLY REAL**
- **Endpoints**: 
  - `GET /admin/revenue` - **EXISTS** (backend/main.py:1137)
- **BUT**: Frontend **never calls it**!

**What Shows Instead**:
- "Total Revenue" and "Monthly Revenue" from dashboard stats (REAL)
- Subscription breakdown: **HARDCODED** (268 Enterprise, 523 Professional, 456 Starter)
- Top revenue generators: **HARDCODED** (john@example.com $359.88, etc.)

**Code Evidence**:
```typescript
// Lines 1118-1135: Hardcoded subscription breakdown
<span style={{ fontWeight: 'bold' }}>268 users</span>  // FAKE!
<span style={{ fontWeight: 'bold' }}>523 users</span>  // FAKE!
<span style={{ fontWeight: 'bold' }}>456 users</span>  // FAKE!
```

**VERDICT**: **Half-real, half-fake**. Basic revenue numbers work, but detailed analytics are theatrical.

---

#### **6. Quick Actions** ❌
- **Status**: **ALL NON-FUNCTIONAL**

**Buttons That Do Nothing**:
```typescript
// Overview tab (lines 611-623):
<button>📧 Send Platform Announcement</button>        // FAKE!
<button>📊 Generate Revenue Report</button>          // FAKE!
<button>🔄 System Health Check</button>              // FAKE!
<button>🔑 Manage API Keys</button>                  // FAKE!

// Feedback & Support (lines 631-649):
<form>...Submit Feedback</form>                       // FAKE!
<button>📚 View Documentation</button>               // FAKE!
<button>💬 Contact Support Team</button>             // FAKE!
<button>🎓 Admin Training Resources</button>         // FAKE!

// User Management (lines 691-702):
<button>📊 Export Users (CSV)</button>               // FAKE!
<button>📄 User Report (PDF)</button>                // FAKE!

// System Health (lines 1333-1345):
<button>🔄 Restart Services</button>                 // FAKE!
<button>📊 View Logs</button>                        // FAKE!
<button>🔧 Maintenance Mode</button>                 // FAKE!
<button>🚨 Emergency Stop</button>                   // FAKE!

// Backup & Recovery (lines 1378-1386):
<button>💾 Create Manual Backup</button>             // FAKE!
<button>🔄 Restore from Backup</button>              // FAKE!
<button>📋 View Backup Schedule</button>             // FAKE!
```

**Reality Check**: **EVERY SINGLE ONE** of these buttons does nothing. They're just `<button>` elements with no `onClick` handlers.

**VERDICT**: It's like a car dashboard with beautiful gauges, but none of them are connected to the engine.

---

#### **7. Search & Filter Inputs** ❌
- **Status**: **UI-ONLY** (don't actually filter)

**Non-Functional Inputs**:
```typescript
// Users tab (line 681-696):
<input placeholder="Search users..." />              // Doesn't search!
<select>All Roles / Admin / Viewer / User</select>  // Doesn't filter!

// Deeds tab (line 881-891):
<select>All Statuses / Completed / Draft</select>   // Doesn't filter!

// Audit tab (line 991-1002):
<input placeholder="Search actions..." />            // Doesn't search!
<select>All Actions / USER_LOGIN / ...</select>     // Doesn't filter!
```

**Reality Check**: These inputs have no `onChange` handlers that actually send new API requests or filter local data.

**VERDICT**: Pure window dressing. They look interactive but are inert.

---

## 💔 **THE UGLY (Critical Gaps)**

### **Missing Core Functionality**

#### **1. No User Detail View**
- **Backend**: `/admin/users/{id}` endpoint **EXISTS** (Phase 6-2)!
- **Frontend**: "View" button does nothing
- **Impact**: Can't actually view/edit individual users

#### **2. No Deed Detail View**
- **Backend**: No `/admin/deeds/{id}` endpoint
- **Frontend**: "View" button does nothing
- **Impact**: Can't inspect deed details from admin panel

#### **3. No Real-Time Monitoring**
- **Backend**: `/admin/system-metrics` endpoint **EXISTS**!
- **Frontend**: Never calls it, shows hardcoded/empty data
- **Impact**: Can't actually monitor system health

#### **4. No Audit Trail**
- **Backend**: No audit logging system
- **Frontend**: Shows fake audit logs
- **Impact**: **SECURITY RISK** - no way to track admin actions

#### **5. No API Key Management**
- **Backend**: No endpoints for API key CRUD
- **Frontend**: "Manage API Keys" button does nothing
- **Impact**: Can't manage API access for users

#### **6. No Integration Management**
- **Backend**: No integration endpoints (SoftPro/Qualia don't exist!)
- **Frontend**: Shows fake integration data
- **Impact**: Can't monitor or configure integrations (because they don't exist!)

#### **7. No Export Functionality**
- **Buttons**: "Export Users", "Export Deeds", "Export Logs", "Export Metrics"
- **Backend**: No export endpoints
- **Impact**: Can't generate reports for stakeholders

#### **8. No Bulk Actions**
- **Missing**: Select multiple users/deeds, bulk update, bulk delete
- **Impact**: Inefficient admin workflows

#### **9. No Notification System**
- **Backend**: No notification delivery system (email/SMS/push)
- **Frontend**: Sidebar shows notification badge (always 0)
- **Impact**: Can't actually notify admins of issues

---

## 📈 **BREAKDOWN BY TAB**

| Tab | Real Data % | Functional Actions % | Overall Grade | Notes |
|-----|-------------|----------------------|---------------|-------|
| **Overview** | 70% | 20% | **C+** | Stats real, actions fake |
| **Users** | 100% | 10% | **B-** | Data real, limited pagination, buttons fake |
| **API & Integrations** | 0% | 0% | **F** | Completely empty tab |
| **Deeds** | 100% | 10% | **B-** | Data real, limited pagination, buttons fake |
| **Audit Logs** | 0% | 0% | **F** | Completely empty tab |
| **Revenue** | 40% | 0% | **D** | Basic stats real, analytics fake |
| **System Health** | 0% | 0% | **F** | Completely empty tab, backend exists but unused |
| **Pricing** | 100% | 100% | **A+** | Fully functional! |

**Average Grade**: **D+ (48%)**

---

## 🎨 **DESIGN vs. REALITY**

### **What It Looks Like** 🎭
```
✨ Enterprise Admin Console
📊 8 beautiful tabs with professional UI
🚀 Quick Actions everywhere
📈 Real-time charts and graphs
💼 Comprehensive platform management
🔔 Notification system with unread badges
📋 Detailed audit trails
🔗 Integration monitoring
```

### **What It Actually Is** 💀
```
⚠️ 40% functional admin panel
📊 8 tabs: 1 fully works, 3 half work, 4 are empty
🚫 Most buttons do nothing
📈 Charts show hardcoded/empty data
💼 Can view users/deeds (first 10 only)
🔔 Notification badge always shows 0
📋 No audit trail (security risk!)
🔗 No integrations (they don't exist!)
```

---

## 🔧 **WHAT WORKS (Backend Ready, Frontend Not Using It)**

These endpoints **exist in the backend** but the **frontend doesn't call them**:

1. ✅ `GET /admin/users/{id}` - User detail view (Phase 6-2)
2. ✅ `GET /admin/system-metrics` - Real-time metrics (Phase 6-2)
3. ✅ `GET /admin/revenue` - Detailed revenue analytics
4. ✅ `GET /admin/system-health` - System health check
5. ✅ `GET /admin/analytics` - Platform analytics

**Translation**: We have backend data **ready to go**, but the frontend just... doesn't ask for it. It's like having a fully stocked warehouse but the store keeps selling empty boxes.

---

## 🚦 **RECOMMENDATIONS (Priority Order)**

### **P0 - CRITICAL (Do This First)**

#### **1. Wire Up Existing Backend Endpoints** (4-6 hours)
**Problem**: Frontend has hardcoded data for features that have working backends.

**Solution**:
```typescript
// System Metrics Tab - Line 318-324
// BEFORE (hardcoded):
setSystemMetrics([{ timestamp: "...", api_calls: 1200, ... }]);

// AFTER (real):
const metricsResponse = await fetch('/admin/system-metrics', { headers });
const metricsData = await metricsResponse.json();
setSystemMetrics(metricsData.metrics);
```

**Impact**: Instant upgrade from fake to real for System Health tab.

---

#### **2. Make "View" Buttons Work** (2-3 hours)
**Problem**: Users/deeds list has "View" buttons that do nothing.

**Solution**:
- Create modal or detail page
- Call `GET /admin/users/{id}` (already exists!)
- Display user details with edit capability

**Impact**: Actual user management becomes possible.

---

#### **3. Remove Fake Buttons** (1 hour)
**Problem**: Dozens of buttons that do nothing create false expectations.

**Solution**:
```typescript
// Option A: Hide until implemented
{false && <button>Send Announcement</button>}

// Option B: Disable with tooltip
<button disabled title="Coming in Phase 13">Send Announcement</button>
```

**Impact**: Honest UX, no false promises.

---

### **P1 - HIGH (Do This Soon)**

#### **4. Implement Pagination** (3-4 hours)
**Problem**: Only shows first 10 users/deeds.

**Solution**:
- Add page state: `const [page, setPage] = useState(1)`
- Add pagination UI (1, 2, 3... Next)
- Pass `?page=${page}&limit=50` to API

**Backend**: Already supports it! `GET /admin/users?page=2&limit=50`

**Impact**: Can actually view all users, not just first 10.

---

#### **5. Make Filters Work** (2-3 hours)
**Problem**: Search/filter inputs don't actually filter.

**Solution**:
```typescript
// Users search
<input 
  value={search}
  onChange={(e) => {
    setSearch(e.target.value);
    // Debounce and re-fetch:
    debouncedFetch(`/admin/users?search=${e.target.value}`);
  }}
/>
```

**Backend**: Search param already supported in backend!

**Impact**: Usable search functionality.

---

#### **6. Connect Revenue Analytics** (2 hours)
**Problem**: Revenue tab shows hardcoded subscription breakdown.

**Solution**: Call `GET /admin/revenue` (already exists!), replace hardcoded data.

**Impact**: Real financial insights.

---

### **P2 - MEDIUM (Nice to Have)**

#### **7. Implement Export Functionality** (6-8 hours)
**Problem**: All export buttons do nothing.

**Solution**:
- Backend: Create `/admin/export/users` endpoint (generates CSV)
- Frontend: Trigger download when button clicked
- Use `Content-Disposition: attachment` header

**Impact**: Can generate reports for stakeholders.

---

#### **8. Build Audit Logging System** (1-2 weeks)
**Problem**: No audit trail = security risk.

**Solution**:
- Backend: Create `audit_logs` table
- Middleware: Log all admin actions automatically
- Frontend: Call `/admin/audit-logs` endpoint (to be created)

**Impact**: Compliance, security, accountability.

---

#### **9. Build Notification System** (1-2 weeks)
**Problem**: No way to alert admins of issues.

**Solution**:
- Backend: Create notifications table + delivery system (email/push)
- Frontend: Poll `/admin/notifications` every 30s
- Display in sidebar with red badge

**Impact**: Proactive issue management.

---

### **P3 - LOW (Future Enhancement)**

#### **10. Integration Monitoring** (2-3 weeks)
**Problem**: Shows fake SoftPro/Qualia integrations.

**Solution**: **Only if integrations actually get built**. Otherwise, remove this tab entirely.

**Impact**: Depends on whether integrations are actually needed.

---

## 🎯 **QUICK WINS (1-2 Days Max)**

If you want to make the admin panel "production-honest" quickly:

### **Day 1 Morning (4 hours)**:
1. Wire up System Metrics tab (real data) ✅
2. Connect Revenue Analytics tab (real data) ✅
3. Remove or disable all fake buttons ✅

### **Day 1 Afternoon (4 hours)**:
4. Make "View" buttons work for users ✅
5. Add pagination to users/deeds ✅

### **Day 2 Morning (4 hours)**:
6. Make search/filter inputs work ✅
7. Add loading states everywhere ✅

### **Day 2 Afternoon (4 hours)**:
8. Add error handling ✅
9. Add empty states with helpful messages ✅
10. Test everything ✅

**Result**: **70% real, 30% deferred** admin panel. Honest, functional, production-ready.

---

## 💡 **ALTERNATIVE: FEATURE FLAG APPROACH**

Instead of removing fake features, hide them behind a feature flag:

```typescript
const FEATURE_FLAGS = {
  AUDIT_LOGS: false,           // Not implemented
  API_MONITORING: false,       // Not implemented
  INTEGRATIONS: false,         // Not implemented
  NOTIFICATIONS: false,        // Not implemented
  EXPORT_REPORTS: false,       // Not implemented
  BULK_ACTIONS: false,         // Not implemented
  USER_EDITING: true,          // Can implement quickly
  SYSTEM_METRICS: true,        // Backend exists!
  REVENUE_DETAILS: true,       // Backend exists!
};

// In sidebar:
{FEATURE_FLAGS.AUDIT_LOGS && <MenuItem id="audit" label="Audit Logs" />}
```

**Benefits**:
- Turn features on as they're implemented
- Clean UI (no fake buttons)
- Can enable for internal testing

---

## 🔥 **THE BOTTOM LINE**

### **Current State**: Beautiful Shell, Limited Core

**It's like a luxury car**:
- ✅ Gorgeous leather interior (UI is stunning)
- ✅ Dashboard lights up beautifully (stats work)
- ✅ Radio works perfectly (pricing tab is gold)
- ❌ But half the buttons don't do anything
- ❌ GPS shows fake directions
- ❌ Rearview camera just shows a photo
- ❌ Half the gauges are painted on

### **What's Actually Needed**:

For **MVP admin functionality**, you need:
1. ✅ View all users (works!)
2. ✅ View all deeds (works!)
3. ✅ Basic stats (works!)
4. ❌ Edit users (backend exists, wire it up!)
5. ❌ Paginate through >10 records (backend ready, add UI!)
6. ❌ Search/filter (backend ready, wire it up!)

**Verdict**: You're **2-3 days of work** away from a fully functional MVP admin panel.

---

## 📋 **FINAL GRADES**

| Aspect | Grade | Notes |
|--------|-------|-------|
| **UI/UX Design** | **A+** | Absolutely gorgeous, professional, modern |
| **Code Quality** | **B** | Clean, organized, TypeScript, well-structured |
| **Functionality** | **D+** | 40% real, 60% facade |
| **Backend Integration** | **C** | Some endpoints connected, many ignored |
| **Honesty** | **F** | Fake data, non-functional buttons everywhere |
| **Production Readiness** | **C-** | Works for basic viewing, not for actual admin work |

**OVERALL**: **C (65%)** - Solid foundation, needs 2-3 days to be production-honest.

---

## 🚀 **PATH FORWARD**

### **Option A: Quick Honesty Pass** (2-3 days)
Remove fake data, wire up existing backends, add pagination. Result: Honest, functional MVP.

### **Option B: Feature Flag Approach** (1 day + incremental)
Hide unimplemented features, show only what works. Add features incrementally as implemented.

### **Option C: Full Build-Out** (2-3 weeks)
Implement audit logging, notifications, exports, integrations. Result: Enterprise-grade admin panel.

---

**Recommendation**: **Option A** (Quick Honesty Pass).

**Why**: You're 80% of the way there. The backend is solid (Phase 6-2 work is excellent!). Just need to:
1. Connect frontend to existing backends
2. Remove/disable fake buttons
3. Add pagination UI

**Timeline**: 2-3 days → production-honest admin panel that actually does what it says.

---

## 🎉 **THE SILVER LINING**

Despite the harsh assessment, **there's a lot to celebrate**:

1. ✅ **UI is world-class** - seriously, it's gorgeous
2. ✅ **Backend is solid** - Phase 6-2 work laid excellent foundation
3. ✅ **Pricing tab is perfect** - fully functional, real Stripe integration
4. ✅ **Architecture is clean** - easy to wire up remaining features
5. ✅ **TypeScript everywhere** - type-safe, maintainable
6. ✅ **Quick path to MVP** - 2-3 days to get fully functional

**Translation**: This is **absolutely fixable**, and the foundation is **excellent**. Just need to connect the dots.

---

**Status**: 🟡 **NEEDS ATTENTION** - But very fixable!  
**Effort to Fix**: 2-3 days  
**Priority**: Medium (not blocking current Phase 11 work)

---

**Next Steps**: Decide on Option A, B, or C above, and I'll create implementation plan.

