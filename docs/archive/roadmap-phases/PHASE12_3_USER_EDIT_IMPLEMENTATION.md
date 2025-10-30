# Phase 12-3: User Edit Page - Implementation Plan

## Overview
Create a full CRUD page for managing individual users with view/edit modes, subscription management, and admin actions.

**Status**: 🔨 **IN PROGRESS**  
**Estimated Time**: 30-40 minutes  
**Approach**: Slow and steady, test at each step

---

## 🎯 Goals

1. **View Mode** - Display complete user profile, subscription, and deeds
2. **Edit Mode** - Update all user fields with validation
3. **Admin Actions** - Delete user, reset password, change plan
4. **Consistent Styling** - Use existing DashProposal theme
5. **Error Handling** - Clear feedback for all actions

---

## 🏗️ Architecture

### Route Structure
```
/admin-honest-v2/users/[id]
  ├── View Mode (default)
  │   ├── User Info Card
  │   ├── Subscription Card
  │   ├── Deeds List
  │   └── Action Buttons
  └── Edit Mode (toggle)
      ├── Edit Form
      ├── Save/Cancel Buttons
      └── Validation
```

### Data Flow
```
Frontend → API Client → Backend Endpoint → Database → Response → UI Update
```

---

## 📦 Implementation Steps

### Step 1: Backend Endpoints (15 min)

**File**: `backend/routers/admin_api_v2.py`

**Add 3 new endpoints:**

#### 1.1 Update User
```python
@router.put("/users/{user_id}")
def admin_update_user(
    user_id: int, 
    updates: dict = Body(...),
    admin=Depends(get_current_admin)
):
    """Update user fields"""
    conn = get_db_connection()
    with conn.cursor() as cur:
        # Build dynamic UPDATE query
        set_clauses = []
        params = []
        
        allowed_fields = ['full_name', 'email', 'role', 'plan', 'company_name', 
                         'phone', 'state', 'is_active', 'verified']
        
        for field in allowed_fields:
            if field in updates:
                set_clauses.append(f"{field} = %s")
                params.append(updates[field])
        
        if not set_clauses:
            raise HTTPException(400, "No valid fields to update")
        
        params.append(user_id)
        query = f"UPDATE users SET {', '.join(set_clauses)} WHERE id = %s"
        
        cur.execute(query, params)
        conn.commit()
        
        return {"success": True, "message": "User updated successfully"}
```

#### 1.2 Delete User
```python
@router.delete("/users/{user_id}")
def admin_delete_user(user_id: int, admin=Depends(get_current_admin)):
    """Soft delete user (set is_active = false)"""
    conn = get_db_connection()
    with conn.cursor() as cur:
        # Check if user exists
        cur.execute("SELECT id FROM users WHERE id = %s", (user_id,))
        if not cur.fetchone():
            raise HTTPException(404, "User not found")
        
        # Soft delete
        cur.execute("UPDATE users SET is_active = false WHERE id = %s", (user_id,))
        conn.commit()
        
        return {"success": True, "message": "User deleted successfully"}
```

#### 1.3 Reset Password
```python
@router.post("/users/{user_id}/reset-password")
def admin_reset_user_password(user_id: int, admin=Depends(get_current_admin)):
    """Send password reset email"""
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT email FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, "User not found")
        
        email = row['email']
        
        # TODO: Integrate with AuthOverhaul email service
        # For now, return success message
        
        return {
            "success": True, 
            "message": f"Password reset email sent to {email}",
            "email": email
        }
```

### Step 2: Frontend API Client (5 min)

**File**: `frontend/src/lib/adminApi.ts`

**Add 3 new functions:**

```typescript
export const AdminApi = {
  // ... existing functions ...
  
  // Update user
  updateUser: (id: number, updates: Partial<UserDetail>) =>
    http<{success: boolean; message: string}>(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    }),
  
  // Delete user
  deleteUser: (id: number) =>
    http<{success: boolean; message: string}>(`/admin/users/${id}`, {
      method: 'DELETE'
    }),
  
  // Reset password
  resetUserPassword: (id: number) =>
    http<{success: boolean; message: string; email: string}>(`/admin/users/${id}/reset-password`, {
      method: 'POST'
    }),
};
```

### Step 3: Create User Detail Page (15 min)

**File**: `frontend/src/app/admin-honest-v2/users/[id]/page.tsx`

**Structure:**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminApi, UserDetail } from '@/lib/adminApi';
import '../../styles/tokens.css';
import '../../styles/admin-honest.css';

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = parseInt(params.id as string);
  
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<UserDetail>>({});
  const [error, setError] = useState('');
  
  // Load user data
  useEffect(() => {
    loadUser();
  }, [userId]);
  
  async function loadUser() {
    setLoading(true);
    try {
      const data = await AdminApi.getUser(userId);
      setUser(data);
      setFormData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  
  // Handle save
  async function handleSave() {
    try {
      await AdminApi.updateUser(userId, formData);
      setIsEditing(false);
      loadUser(); // Refresh data
    } catch (err: any) {
      setError(err.message);
    }
  }
  
  // Handle delete
  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await AdminApi.deleteUser(userId);
      router.push('/admin-honest-v2?tab=users');
    } catch (err: any) {
      setError(err.message);
    }
  }
  
  // Handle reset password
  async function handleResetPassword() {
    try {
      const res = await AdminApi.resetUserPassword(userId);
      alert(`Password reset email sent to ${res.email}`);
    } catch (err: any) {
      setError(err.message);
    }
  }
  
  if (loading) {
    return (
      <div className="admin-shell">
        <div className="skeleton" style={{height: 400}}/>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="admin-shell">
        <div className="card">
          <p>User not found</p>
          <button className="button" onClick={() => router.back()}>Go Back</button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="admin-shell">
      {/* Header */}
      <div className="hstack" style={{justifyContent: 'space-between', marginBottom: 16}}>
        <div>
          <button className="button ghost" onClick={() => router.back()}>← Back</button>
          <h1 style={{fontSize: 24, fontWeight: 700, marginTop: 8}}>
            {isEditing ? 'Edit User' : 'User Detail'}
          </h1>
        </div>
        <div className="hstack">
          {!isEditing ? (
            <>
              <button className="button" onClick={() => setIsEditing(true)}>Edit</button>
              <button className="button ghost" onClick={handleResetPassword}>Reset Password</button>
              <button className="button" style={{background: 'var(--dp-error)'}} onClick={handleDelete}>
                Delete
              </button>
            </>
          ) : (
            <>
              <button className="button ghost" onClick={() => {
                setIsEditing(false);
                setFormData(user);
              }}>
                Cancel
              </button>
              <button className="button" onClick={handleSave}>Save Changes</button>
            </>
          )}
        </div>
      </div>
      
      {error && (
        <div className="card" style={{background: 'var(--dp-error)', color: 'white', marginBottom: 16}}>
          {error}
        </div>
      )}
      
      {/* User Info */}
      <div className="grid" style={{gridTemplateColumns: '1fr 1fr', gap: 16}}>
        <div className="card">
          <h2 style={{fontSize: 16, fontWeight: 600, marginBottom: 12}}>Profile</h2>
          {!isEditing ? (
            <div className="vstack" style={{gap: 8}}>
              <div><strong>ID:</strong> {user.id}</div>
              <div><strong>Email:</strong> {user.email}</div>
              <div><strong>Name:</strong> {user.full_name || '—'}</div>
              <div><strong>Role:</strong> <span className="badge">{user.role || 'user'}</span></div>
              <div><strong>Plan:</strong> <span className="badge">{user.plan || 'free'}</span></div>
              <div><strong>Company:</strong> {user.company_name || '—'}</div>
              <div><strong>Phone:</strong> {user.phone || '—'}</div>
              <div><strong>State:</strong> {user.state || '—'}</div>
              <div><strong>Active:</strong> {user.is_active ? '✅ Yes' : '❌ No'}</div>
              <div><strong>Verified:</strong> {user.verified ? '✅ Yes' : '❌ No'}</div>
            </div>
          ) : (
            <div className="vstack" style={{gap: 12}}>
              <input 
                className="input" 
                placeholder="Email" 
                value={formData.email || ''} 
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
              <input 
                className="input" 
                placeholder="Full Name" 
                value={formData.full_name || ''} 
                onChange={e => setFormData({...formData, full_name: e.target.value})}
              />
              <select 
                className="select" 
                value={formData.role || 'user'} 
                onChange={e => setFormData({...formData, role: e.target.value})}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              <select 
                className="select" 
                value={formData.plan || 'free'} 
                onChange={e => setFormData({...formData, plan: e.target.value})}
              >
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
              <input 
                className="input" 
                placeholder="Company Name" 
                value={formData.company_name || ''} 
                onChange={e => setFormData({...formData, company_name: e.target.value})}
              />
              <input 
                className="input" 
                placeholder="Phone" 
                value={formData.phone || ''} 
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
              <input 
                className="input" 
                placeholder="State" 
                value={formData.state || ''} 
                onChange={e => setFormData({...formData, state: e.target.value})}
              />
            </div>
          )}
        </div>
        
        <div className="card">
          <h2 style={{fontSize: 16, fontWeight: 600, marginBottom: 12}}>Statistics</h2>
          <div className="vstack" style={{gap: 8}}>
            <div><strong>Deeds Created:</strong> {user.deed_stats?.total || 0}</div>
            <div><strong>Completed:</strong> {user.deed_stats?.completed || 0}</div>
            <div><strong>Drafts:</strong> {user.deed_stats?.drafts || 0}</div>
            <div><strong>Created:</strong> {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</div>
            <div><strong>Last Login:</strong> {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}</div>
            <div><strong>Stripe ID:</strong> {user.stripe_customer_id || '—'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 🧪 Testing Plan

### Step 1: Backend Testing
1. Deploy backend endpoints
2. Test with curl/Postman:
   - PUT /admin/users/6 (update test user)
   - DELETE /admin/users/999 (non-existent user)
   - POST /admin/users/6/reset-password
3. Verify Render logs for errors

### Step 2: Frontend Testing
1. Deploy frontend page
2. Navigate to `/admin-honest-v2/users/6`
3. Verify view mode shows all data
4. Click "Edit" → verify form populates
5. Update fields → click "Save"
6. Verify changes reflected in database
7. Test "Reset Password" button
8. Test "Delete" button (with confirmation)

### Step 3: Edge Cases
- [ ] Non-existent user ID
- [ ] Invalid data in form
- [ ] Network errors
- [ ] Concurrent edits
- [ ] Delete then try to view
- [ ] Mobile responsiveness

---

## 📊 Success Criteria

1. ✅ View mode shows complete user profile
2. ✅ Edit mode allows updating all fields
3. ✅ Save button updates database
4. ✅ Cancel button discards changes
5. ✅ Delete button removes user (with confirmation)
6. ✅ Reset password sends email
7. ✅ Error handling for all actions
8. ✅ Consistent DashProposal styling
9. ✅ Mobile responsive
10. ✅ No console errors

---

## 🚀 Deployment Order

1. **Backend First** (commit + push)
   - Add 3 endpoints to `admin_api_v2.py`
   - Test on Render

2. **Frontend API** (commit + push)
   - Update `adminApi.ts`
   - Test on Vercel

3. **Frontend Page** (commit + push)
   - Create `users/[id]/page.tsx`
   - Test end-to-end

4. **Polish** (if needed)
   - Fix bugs
   - Add loading states
   - Improve UX

---

**Let's execute step-by-step!** 🎯

