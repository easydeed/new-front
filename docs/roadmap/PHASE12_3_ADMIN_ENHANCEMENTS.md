# Phase 12-3: Admin Panel Enhancements

## Overview
Systematic improvements to the admin panel based on user feedback:
1. **Investigate missing deed** (shows 6-9 but stats say 10)
2. **Add logout button** to admin header
3. **User detail/edit page** with full CRUD capabilities

---

## 1. Missing Deed Investigation

### Issue
- **Dashboard stats**: 10 total deeds
- **Deeds table**: Shows only IDs 6, 7, 8, 9 (4 deeds)
- **Missing**: 6 deeds (IDs 1-5 or ID 10?)

### Root Cause Analysis
**Possible causes:**
1. **Soft delete** - Some deeds marked as deleted but still counted in stats
2. **Status filter** - Deeds with `NULL` status not showing
3. **User scoping** - Deeds belong to different users
4. **Database inconsistency** - Rows exist but missing data

### Diagnostic Query
```sql
-- Check all deeds in database
SELECT id, deed_type, status, property_address, user_id, created_at
FROM deeds
ORDER BY id DESC;

-- Check for NULL status
SELECT COUNT(*) FROM deeds WHERE status IS NULL;

-- Check stats vs actual
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'draft' THEN 1 END) as drafts,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
FROM deeds;
```

### Fix
- Ensure `/admin/deeds/search` returns ALL deeds regardless of status
- Add "Deleted" filter option if soft delete is implemented
- Update stats to match search results

---

## 2. Logout Button

### Requirements
- Add to admin header (top-right corner)
- Match existing DashProposal styling
- Clear `localStorage` and redirect to `/login`
- Consistent with auth flow

### Implementation
**File:** `frontend/src/app/admin-honest-v2/page.tsx`

**Location:** Admin header next to title

**Code:**
```typescript
const handleLogout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('token');
  router.push('/login');
};

// In header JSX:
<div className="hstack" style={{justifyContent:'space-between', marginBottom:12}}>
  <div className="hstack">
    <div style={{fontWeight:700, fontSize:20, letterSpacing:.25}}>Admin — Honest (v2)</div>
  </div>
  <button className="button ghost" onClick={handleLogout}>Logout</button>
</div>
```

---

## 3. User Detail/Edit Page

### Requirements
- **View**: Full user details (profile, deeds, subscription)
- **Edit**: All user fields (name, email, role, plan)
- **Subscription**: View current plan, change plan, view usage
- **Actions**: Delete user, reset password, suspend account
- **Styling**: Consistent with DashProposal (tokens.css, admin-honest.css)

### Routes
**Detail View:** `/admin-honest-v2/users/[id]`
- Shows user info, deed list, subscription details
- "Edit" button opens edit mode

**Edit Mode:** Same route, toggle between view/edit
- Form with all editable fields
- "Save" / "Cancel" buttons

### Data Structure
```typescript
interface UserDetail {
  id: number;
  email: string;
  full_name?: string;
  role?: string;
  plan?: string;
  company_name?: string;
  company_type?: string;
  phone?: string;
  state?: string;
  is_active?: boolean;
  verified?: boolean;
  stripe_customer_id?: string;
  created_at?: string;
  last_login?: string | null;
  
  // Extended data
  deed_count?: number;
  deeds?: DeedRow[];
  subscription?: {
    plan: string;
    status: string;
    current_period_end?: string;
    usage: {
      deeds_created: number;
      deeds_limit: number;
    };
  };
}
```

### API Endpoints (Already Exist)
- ✅ `GET /admin/users/{id}/real` - Get user detail
- ✅ `GET /admin/deeds/search?user_id={id}` - Get user's deeds
- 🆕 `PUT /admin/users/{id}` - Update user (TO CREATE)
- 🆕 `DELETE /admin/users/{id}` - Delete user (TO CREATE)
- 🆕 `POST /admin/users/{id}/reset-password` - Send reset email (TO CREATE)

### Files to Create
1. **`frontend/src/app/admin-honest-v2/users/[id]/page.tsx`** - User detail page
2. **`backend/routers/admin_api_v2.py`** - Add PUT/DELETE/POST endpoints

### Component Structure
```tsx
<UserDetailPage>
  {isEditing ? (
    <EditForm>
      <UserInfoFields />
      <SubscriptionFields />
      <ActionButtons>
        <SaveButton />
        <CancelButton />
      </ActionButtons>
    </EditForm>
  ) : (
    <ViewMode>
      <UserInfoCard />
      <SubscriptionCard />
      <DeedsList />
      <ActionButtons>
        <EditButton />
        <DeleteButton />
        <ResetPasswordButton />
      </ActionButtons>
    </ViewMode>
  )}
</UserDetailPage>
```

---

## Implementation Order

### Step 1: Investigate Missing Deeds (5 min)
- Run diagnostic query in database
- Check Render logs for deed creation
- Update backend if needed

### Step 2: Add Logout Button (5 min)
- Update `admin-honest-v2/page.tsx`
- Test logout flow

### Step 3: Create User Detail Page (30 min)
- Create new Next.js dynamic route
- Add backend endpoints for update/delete
- Style with existing CSS
- Test CRUD operations

---

## Testing Checklist

### Missing Deeds
- [ ] Run diagnostic query
- [ ] Verify all deeds show in table
- [ ] Stats match table count

### Logout Button
- [ ] Button appears in admin header
- [ ] Clicking logs out and redirects to `/login`
- [ ] localStorage cleared
- [ ] Cannot access admin without re-login

### User Detail Page
- [ ] Navigate from Users table to detail page
- [ ] View mode shows all user info
- [ ] Edit mode allows field changes
- [ ] Save updates database
- [ ] Cancel discards changes
- [ ] Delete user works (with confirmation)
- [ ] Reset password sends email

---

## Success Criteria
1. ✅ All 10 deeds visible in admin table
2. ✅ Logout button functional and styled
3. ✅ User detail page fully operational with edit/delete
4. ✅ Consistent styling with DashProposal theme
5. ✅ Documented for easy debugging

---

## Deployment Log
- **Created**: October 10, 2025
- **Status**: Ready for implementation
- **Estimated Time**: 45 minutes total

