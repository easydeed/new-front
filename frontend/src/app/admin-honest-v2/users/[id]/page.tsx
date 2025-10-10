'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminApi } from '@/lib/adminApi';
import type { UserDetail } from '@/lib/adminApi';
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
  const [saving, setSaving] = useState(false);
  
  // Load user data
  useEffect(() => {
    loadUser();
  }, [userId]);
  
  async function loadUser() {
    setLoading(true);
    setError('');
    try {
      const data = await AdminApi.getUser(userId);
      setUser(data);
      setFormData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load user');
    } finally {
      setLoading(false);
    }
  }
  
  // Handle save
  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await AdminApi.updateUser(userId, formData);
      setIsEditing(false);
      await loadUser(); // Refresh data
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  }
  
  // Handle delete
  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    
    setError('');
    try {
      await AdminApi.deleteUser(userId);
      router.push('/admin-honest-v2?tab=users');
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    }
  }
  
  // Handle reset password
  async function handleResetPassword() {
    setError('');
    try {
      const res = await AdminApi.resetUserPassword(userId);
      alert(`✅ Password reset email sent to ${res.email}`);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    }
  }
  
  // Handle suspend/unsuspend
  async function handleSuspend() {
    if (!user) return;
    
    const action = user.is_active ? 'suspend' : 'unsuspend';
    const confirmMsg = user.is_active 
      ? 'Are you sure you want to suspend this user? They will not be able to login.'
      : 'Are you sure you want to unsuspend this user? They will be able to login again.';
    
    if (!confirm(confirmMsg)) return;
    
    setError('');
    try {
      await AdminApi.updateUser(userId, { is_active: !user.is_active });
      await loadUser(); // Refresh data
      alert(`✅ User ${action}ed successfully`);
    } catch (err: any) {
      setError(err.message || `Failed to ${action} user`);
    }
  }
  
  if (loading) {
    return (
      <div className="admin-shell">
        <div className="skeleton" style={{height: 60, marginBottom: 16}}/>
        <div className="grid" style={{gridTemplateColumns: '1fr 1fr', gap: 16}}>
          <div className="skeleton" style={{height: 400}}/>
          <div className="skeleton" style={{height: 400}}/>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="admin-shell">
        <div className="card" style={{textAlign: 'center', padding: 40}}>
          <h2 style={{fontSize: 20, marginBottom: 16}}>User Not Found</h2>
          <p style={{opacity: 0.7, marginBottom: 24}}>The user with ID {userId} does not exist.</p>
          <button className="button" onClick={() => router.push('/admin-honest-v2?tab=users')}>
            Go Back
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="admin-shell">
      {/* Header */}
      <div className="hstack" style={{justifyContent: 'space-between', marginBottom: 16, alignItems: 'flex-start'}}>
        <div>
          <button className="button ghost" onClick={() => router.push('/admin-honest-v2?tab=users')}>
            ← Back to Users
          </button>
          <h1 style={{fontSize: 24, fontWeight: 700, marginTop: 12}}>
            {isEditing ? 'Edit User' : 'User Detail'}
          </h1>
          <p style={{opacity: 0.7, marginTop: 4}}>ID: {user.id}</p>
        </div>
        <div className="hstack" style={{gap: 8}}>
          {!isEditing ? (
            <>
              <button className="button" onClick={() => setIsEditing(true)}>Edit</button>
              <button className="button ghost" onClick={handleResetPassword}>Reset Password</button>
              <button 
                className="button" 
                style={{
                  background: user.is_active ? 'var(--dp-warning, #f59e0b)' : 'var(--dp-success, #10b981)', 
                  color: 'white'
                }} 
                onClick={handleSuspend}
              >
                {user.is_active ? '⏸ Suspend' : '▶ Unsuspend'}
              </button>
              <button 
                className="button" 
                style={{background: 'var(--dp-error, #ef4444)', color: 'white'}} 
                onClick={handleDelete}
              >
                Delete
              </button>
            </>
          ) : (
            <>
              <button 
                className="button ghost" 
                onClick={() => {
                  setIsEditing(false);
                  setFormData(user);
                  setError('');
                }}
                disabled={saving}
              >
                Cancel
              </button>
              <button className="button" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
        </div>
      </div>
      
      {error && (
        <div className="card" style={{background: 'var(--dp-error, #ef4444)', color: 'white', marginBottom: 16, padding: 16}}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {/* User Info Grid */}
      <div className="grid" style={{gridTemplateColumns: '1fr 1fr', gap: 16}}>
        {/* Profile Card */}
        <div className="card">
          <h2 style={{fontSize: 16, fontWeight: 600, marginBottom: 16}}>Profile Information</h2>
          {!isEditing ? (
            <div className="vstack" style={{gap: 12}}>
              <div>
                <div style={{opacity: 0.6, fontSize: 12, marginBottom: 4}}>Email</div>
                <div style={{fontWeight: 500}}>{user.email}</div>
              </div>
              <div>
                <div style={{opacity: 0.6, fontSize: 12, marginBottom: 4}}>Full Name</div>
                <div style={{fontWeight: 500}}>{user.full_name || '—'}</div>
              </div>
              <div>
                <div style={{opacity: 0.6, fontSize: 12, marginBottom: 4}}>Role</div>
                <div><span className="badge">{user.role || 'user'}</span></div>
              </div>
              <div>
                <div style={{opacity: 0.6, fontSize: 12, marginBottom: 4}}>Plan</div>
                <div><span className="badge">{user.plan || 'free'}</span></div>
              </div>
              <div>
                <div style={{opacity: 0.6, fontSize: 12, marginBottom: 4}}>Company Name</div>
                <div style={{fontWeight: 500}}>{user.company_name || '—'}</div>
              </div>
              <div>
                <div style={{opacity: 0.6, fontSize: 12, marginBottom: 4}}>Phone</div>
                <div style={{fontWeight: 500}}>{user.phone || '—'}</div>
              </div>
              <div>
                <div style={{opacity: 0.6, fontSize: 12, marginBottom: 4}}>State</div>
                <div style={{fontWeight: 500}}>{user.state || '—'}</div>
              </div>
              <div className="vstack" style={{gap: 12}}>
                <div>
                  <div style={{opacity: 0.6, fontSize: 12, marginBottom: 4}}>
                    Account Status
                    <span style={{opacity: 0.5, marginLeft: 4}}>(can login?)</span>
                  </div>
                  <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                    {user.is_active ? (
                      <><span style={{color: 'var(--dp-success, #10b981)'}}>✅ Active</span> <span style={{opacity: 0.6, fontSize: 12}}>- Can login</span></>
                    ) : (
                      <><span style={{color: 'var(--dp-error, #ef4444)'}}>❌ Suspended</span> <span style={{opacity: 0.6, fontSize: 12}}>- Cannot login</span></>
                    )}
                  </div>
                </div>
                <div>
                  <div style={{opacity: 0.6, fontSize: 12, marginBottom: 4}}>
                    Email Verification
                    <span style={{opacity: 0.5, marginLeft: 4}}>(verified email?)</span>
                  </div>
                  <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                    {user.verified ? (
                      <><span style={{color: 'var(--dp-success, #10b981)'}}>✅ Verified</span></>
                    ) : (
                      <><span style={{color: 'var(--dp-warning, #f59e0b)'}}>⚠️ Not Verified</span></>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="vstack" style={{gap: 12}}>
              <div>
                <label style={{display: 'block', fontSize: 12, marginBottom: 4, opacity: 0.7}}>Email</label>
                <input 
                  className="input" 
                  type="email"
                  placeholder="Email" 
                  value={formData.email || ''} 
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
                <label style={{display: 'block', fontSize: 12, marginBottom: 4, opacity: 0.7}}>Full Name</label>
                <input 
                  className="input" 
                  placeholder="Full Name" 
                  value={formData.full_name || ''} 
                  onChange={e => setFormData({...formData, full_name: e.target.value})}
                />
              </div>
              <div>
                <label style={{display: 'block', fontSize: 12, marginBottom: 4, opacity: 0.7}}>Role</label>
                <select 
                  className="select" 
                  value={formData.role || 'user'} 
                  onChange={e => setFormData({...formData, role: e.target.value})}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label style={{display: 'block', fontSize: 12, marginBottom: 4, opacity: 0.7}}>Plan</label>
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
              </div>
              <div>
                <label style={{display: 'block', fontSize: 12, marginBottom: 4, opacity: 0.7}}>Company Name</label>
                <input 
                  className="input" 
                  placeholder="Company Name" 
                  value={formData.company_name || ''} 
                  onChange={e => setFormData({...formData, company_name: e.target.value})}
                />
              </div>
              <div>
                <label style={{display: 'block', fontSize: 12, marginBottom: 4, opacity: 0.7}}>Phone</label>
                <input 
                  className="input" 
                  type="tel"
                  placeholder="Phone" 
                  value={formData.phone || ''} 
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div>
                <label style={{display: 'block', fontSize: 12, marginBottom: 4, opacity: 0.7}}>State</label>
                <input 
                  className="input" 
                  placeholder="State (e.g. CA)" 
                  value={formData.state || ''} 
                  onChange={e => setFormData({...formData, state: e.target.value})}
                  maxLength={2}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Statistics Card */}
        <div className="card">
          <h2 style={{fontSize: 16, fontWeight: 600, marginBottom: 16}}>Statistics & Metadata</h2>
          <div className="vstack" style={{gap: 12}}>
            <div>
              <div style={{opacity: 0.6, fontSize: 12, marginBottom: 4}}>Total Deeds Created</div>
              <div style={{fontSize: 24, fontWeight: 700}}>{user.deed_count ?? user.deed_stats?.total ?? 0}</div>
            </div>
            <div className="hstack" style={{gap: 24}}>
              <div>
                <div style={{opacity: 0.6, fontSize: 12, marginBottom: 4}}>Completed</div>
                <div style={{fontWeight: 600}}>{user.deed_stats?.completed ?? 0}</div>
              </div>
              <div>
                <div style={{opacity: 0.6, fontSize: 12, marginBottom: 4}}>Drafts</div>
                <div style={{fontWeight: 600}}>{user.deed_stats?.drafts ?? 0}</div>
              </div>
            </div>
            <hr style={{border: 'none', borderTop: '1px solid var(--dp-border, #333)', margin: '8px 0'}} />
            <div>
              <div style={{opacity: 0.6, fontSize: 12, marginBottom: 4}}>Account Created</div>
              <div style={{fontWeight: 500}}>
                {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : '—'}
              </div>
            </div>
            <div>
              <div style={{opacity: 0.6, fontSize: 12, marginBottom: 4}}>Last Login</div>
              <div style={{fontWeight: 500}}>
                {user.last_login ? new Date(user.last_login).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'Never'}
              </div>
            </div>
            <div>
              <div style={{opacity: 0.6, fontSize: 12, marginBottom: 4}}>Stripe Customer ID</div>
              <div style={{fontFamily: 'monospace', fontSize: 12}}>{user.stripe_customer_id || '—'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

