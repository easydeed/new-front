# Admin Features Audit
> **DeedPro Admin Panel Analysis** — Last Updated: January 2026

---

## 📍 Current Admin Panel Location

```
Frontend: /admin-honest-v2
Backend:  /admin/* endpoints
```

---

## ✅ Existing Features

### 1. Dashboard Overview (`/admin/dashboard`)
| Feature | Status | Notes |
|---------|--------|-------|
| Total Users Count | ✅ Working | From database |
| Active Users (30 days) | ✅ Working | `last_login > NOW() - 30 days` |
| Total Deeds | ✅ Working | From database |
| Deeds This Month | ✅ Working | From database |
| Subscription Breakdown | ✅ Working | free/professional/enterprise |
| Recent Activity Feed | ✅ Working | Last 7 days signups + deed creations |
| Revenue Estimates | ⚠️ Basic | Calculated from plan counts × price |

### 2. User Management (`/admin/users/*`)
| Feature | Status | Endpoint |
|---------|--------|----------|
| Search Users | ✅ Working | `GET /admin/users/search?page=&limit=&search=` |
| View User List | ✅ Working | Paginated table with email, plan, role, deed count |
| View User Detail | ✅ Working | `GET /admin/users/{id}/real` |
| Edit User Profile | ✅ Working | `PUT /admin/users/{id}` |
| Suspend/Unsuspend User | ✅ Working | Updates `is_active` flag |
| Delete User (soft) | ✅ Working | `DELETE /admin/users/{id}` → sets `is_active=false` |
| Reset Password | ⚠️ Partial | Endpoint exists but email send is TODO |
| Export Users CSV | ✅ Working | `GET /admin/export/users.csv` |

**Editable User Fields:**
- email, full_name, role, plan
- company_name, phone, state
- is_active, verified

### 3. Deeds Management (`/admin/deeds/*`)
| Feature | Status | Endpoint |
|---------|--------|----------|
| Search Deeds | ✅ Working | `GET /admin/deeds/search?page=&limit=&search=&status=` |
| Filter by Status | ✅ Working | `completed`, `draft` |
| View Deed List | ✅ Working | Paginated table |
| View Deed Detail | ✅ Working | `GET /admin/deeds/{id}` |
| Export Deeds CSV | ✅ Working | `GET /admin/export/deeds.csv` |
| Edit Deed | ❌ Missing | No endpoint |
| Delete Deed | ❌ Missing | No endpoint |
| Regenerate PDF | ❌ Missing | No endpoint |

### 4. API Partners Management (`/admin/partners`)
| Feature | Status | Location |
|---------|--------|----------|
| List All Partners | ✅ Working | `GET /admin/partners` |
| Create Partner | ✅ Working | Modal with company name, scopes, rate limit |
| View Partner Detail | ✅ Working | `GET /admin/partners/{prefix}` |
| Revoke API Key | ✅ Working | `DELETE /api/partners/admin/revoke/{prefix}` |
| View Usage Stats | ⚠️ Basic | `/api/partners/admin/usage` |
| Edit Partner | ❌ Missing | Cannot modify scopes/limits after creation |

### 5. Revenue Tab (Feature Flagged)
| Feature | Status | Notes |
|---------|--------|-------|
| Overview Stats | ⚠️ Mock Data | Hardcoded in `/admin/revenue` |
| Monthly Breakdown | ⚠️ Mock Data | Not connected to Stripe |
| MRR/ARR Calculation | ❌ Missing | Would need Stripe subscription data |
| Top Paying Users | ⚠️ Mock Data | Not real data |
| Refunds Tracking | ⚠️ Mock Data | Not connected to Stripe |

### 6. System Tab (Feature Flagged)
| Feature | Status | Endpoint |
|---------|--------|----------|
| API Metrics | ⚠️ Basic | `/admin/system-metrics` returns sample data |
| System Health | ✅ Working | `/admin/system-health` |
| Error Rate | ⚠️ Mock | Not real tracking |
| Active Connections | ⚠️ Mock | Not real tracking |

---

## ❌ Missing Features (Gaps)

### High Priority

| Feature | Impact | Complexity |
|---------|--------|------------|
| **Real Stripe Revenue** | Cannot track actual revenue | Medium |
| **Deed Edit/Delete** | Cannot fix user errors | Low |
| **Password Reset Email** | Cannot help locked-out users | Low |
| **Notification System** | Users don't know about issues | Medium |
| **Audit Logs** | No record of admin actions | Medium |

### Medium Priority

| Feature | Impact | Complexity |
|---------|--------|------------|
| **Bulk User Actions** | Tedious to suspend/delete many | Low |
| **User Impersonation** | Cannot debug user issues | High |
| **Deed Status Change** | Cannot mark deeds complete/draft | Low |
| **Document Preview** | Cannot view generated PDFs | Medium |
| **Analytics Dashboard** | Using mock data | High |

### Low Priority

| Feature | Impact | Complexity |
|---------|--------|------------|
| **Role Management** | Only 'user' and 'admin' exist | Low |
| **Email Templates** | No admin email customization | Medium |
| **Feature Flags UI** | Must change code to toggle | Low |
| **API Rate Limit Config** | Hardcoded limits | Low |
| **Backup/Restore** | No admin-initiated backups | High |

---

## 🏗️ Backend Endpoints Summary

```
/admin/dashboard              GET    Dashboard overview stats
/admin/users                  GET    List all users (basic)
/admin/users/search           GET    Search users (paginated)
/admin/users/{id}             GET    User detail
/admin/users/{id}/real        GET    User detail with deed stats
/admin/users/{id}             PUT    Update user
/admin/users/{id}             DELETE Soft delete user
/admin/users/{id}/reset-password POST  Trigger password reset

/admin/deeds                  GET    List deeds (paginated)
/admin/deeds/search           GET    Search deeds (paginated)
/admin/deeds/{id}             GET    Deed detail

/admin/export/users.csv       GET    Download users CSV
/admin/export/deeds.csv       GET    Download deeds CSV

/admin/revenue                GET    Revenue analytics (mock)
/admin/analytics              GET    Platform analytics (mock)
/admin/system-health          GET    System health check
/admin/system-metrics         GET    System metrics (mock)

/admin/partners               GET    List all partners
/admin/partners/{id}          GET    Partner detail
/admin/partners/{id}/toggle-active PUT Toggle partner status

/admin/create-plan            POST   Create Stripe plan
/admin/sync-pricing           POST   Sync pricing from Stripe
/admin/update-price           POST   Update Stripe price
/admin/toggle-addon           POST   Toggle addon status
```

---

## 🎨 Frontend Pages

| Route | Component | Purpose |
|-------|-----------|---------|
| `/admin-honest-v2` | `AdminHonestV2Page` | Main admin panel |
| `/admin-honest-v2/users/[id]` | `UserDetailPage` | Edit user detail |
| `/admin/partners` | `PartnersPage` | API partners list |
| `/admin/partners/[prefix]` | Partner detail page | View partner |

### Tabs in Main Admin Panel
1. **Overview** — Stats cards + quick actions
2. **Users** — Searchable user table
3. **Deeds** — Searchable deeds table
4. **Revenue** — Revenue analytics (feature flag)
5. **System** — System metrics (feature flag)

---

## 🔧 Recommendations

### Immediate Actions (This Week)

1. **Connect Revenue to Stripe**
   - Replace mock data with Stripe API calls
   - Add `/admin/revenue/stripe` endpoint that fetches from Stripe
   - Display real MRR, charges, refunds

2. **Add Deed Management**
   ```python
   @app.delete("/admin/deeds/{deed_id}")
   def admin_delete_deed(deed_id: int, admin=Depends(get_current_admin)):
       ...
   
   @app.put("/admin/deeds/{deed_id}/status")
   def admin_update_deed_status(deed_id: int, status: str, admin=Depends(get_current_admin)):
       ...
   ```

3. **Fix Password Reset**
   - Wire up SendGrid/email service to `/admin/users/{id}/reset-password`
   - Use existing email templates

### Short-Term (This Month)

4. **Audit Logging**
   ```sql
   CREATE TABLE admin_audit_log (
       id SERIAL PRIMARY KEY,
       admin_id INTEGER REFERENCES users(id),
       action VARCHAR(50),  -- 'user_update', 'user_delete', 'deed_delete', etc.
       target_type VARCHAR(50),  -- 'user', 'deed', 'partner'
       target_id INTEGER,
       old_value JSONB,
       new_value JSONB,
       created_at TIMESTAMP DEFAULT NOW()
   );
   ```

5. **Bulk Actions**
   - Multi-select checkboxes on user/deed tables
   - Bulk suspend, bulk export selected

6. **Real Analytics**
   - Track page views, API calls, errors
   - Use existing metrics middleware data

### Long-Term (Future)

7. **User Impersonation**
   - "Login as user" button for debugging
   - Requires secure token generation

8. **Document Preview**
   - "View PDF" button in deed detail
   - Regenerate option for corrupted PDFs

9. **Feature Flags UI**
   - Admin page to toggle feature flags
   - No code deploy required

---

## 📊 Feature Flags (`frontend/src/config/featureFlags.ts`)

```typescript
export const FEATURE_FLAGS = {
  REVENUE_TAB: boolean,   // Show revenue tab in admin
  SYSTEM_TAB: boolean,    // Show system tab in admin
  EXPORTS: boolean,       // Enable CSV exports
  // ...
};
```

---

## 📝 Notes

- Admin authentication uses `verify_admin()` which checks `role = 'admin'`
- All admin endpoints require JWT token
- RealDictCursor used throughout for dict responses
- Soft delete pattern used (sets `is_active = false`)
- No hard deletes implemented

---

*Document created to identify gaps in admin functionality and prioritize improvements.*
