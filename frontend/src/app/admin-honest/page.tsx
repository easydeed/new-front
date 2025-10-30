'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminApi } from '@/lib/adminApi';
import type { AdminDashboardStats, AdminUserRow, AdminDeedRow, AdminUserDetail, AdminDeedDetail } from '@/types/admin';

const FLAGS = {
  AUDIT_LOGS: false,
  API_MONITORING: false,
  INTEGRATIONS: false,
  NOTIFICATIONS: false
};

type TabKey = 'overview' | 'users' | 'deeds' | 'revenue' | 'system';

export default function AdminHonestPage() {
  const [tab, setTab] = useState<TabKey>('overview');

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h1 className="title" style={{ margin: 0 }}>Admin (Honest)</h1>
        <a href="/admin/partners" style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '14px' }}>
          🤝 API Partners
        </a>
      </div>
      <nav className="tabs">
        <button onClick={()=>setTab('overview')} className={tab==='overview'?'active':''}>Overview</button>
        <button onClick={()=>setTab('users')} className={tab==='users'?'active':''}>Users</button>
        <button onClick={()=>setTab('deeds')} className={tab==='deeds'?'active':''}>Deeds</button>
        <button onClick={()=>setTab('revenue')} className={tab==='revenue'?'active':''}>Revenue</button>
        <button onClick={()=>setTab('system')} className={tab==='system'?'active':''}>System</button>
      </nav>

      <div className="panel">
        {tab==='overview' && <OverviewTab />}
        {tab==='users' && <UsersTab />}
        {tab==='deeds' && <DeedsTab />}
        {tab==='revenue' && <RevenueTab />}
        {tab==='system' && <SystemTab />}
      </div>

      <style jsx>{`
        .container { padding: 24px; }
        .title { font-weight: 700; font-size: 20px; margin-bottom: 12px; }
        .tabs { display:flex; gap:8px; margin-bottom: 16px; }
        .tabs button { padding:8px 12px; border-radius: 8px; border:1px solid #e5e7eb; background:#fff; }
        .tabs .active { background:#111827; color:#fff; }
        .panel { background:#fff; border:1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
        .grid { display:grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
        .card { border:1px solid #e5e7eb; border-radius: 10px; padding: 12px; background:#fafafa; }
        .table { width:100%; border-collapse: collapse; }
        .table th, .table td { border-bottom:1px solid #eee; padding:8px; text-align:left; }
        .toolbar { display:flex; gap:8px; align-items:center; justify-content: space-between; margin-bottom: 12px; }
        .pill { border: 1px solid #e5e7eb; border-radius: 999px; padding: 2px 8px; font-size: 12px; }
        .modal { position:fixed; inset:0; background: rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; }
        .modal-card { width: 720px; max-width: 95vw; background:white; border-radius:12px; padding:16px; border:1px solid #e5e7eb; }
      `}</style>
    </div>
  );
}

function OverviewTab() {
  const [stats, setStats] = useState<AdminDashboardStats|null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    AdminApi.dashboard().then(setStats).catch(e=>setError(e.message));
  }, []);

  return (
    <div>
      <div className="grid">
        {['total_users','active_users','total_deeds','deeds_this_month','total_revenue','monthly_revenue'].map((k) => (
          <div key={k} className="card">
            <div style={{color:'#6b7280', fontSize:12}}>{k.replaceAll('_',' ')}</div>
            <div style={{fontSize:20, fontWeight:700}}>{stats ? (stats as any)[k] ?? '—' : '…'}</div>
          </div>
        ))}
      </div>
      {error && <div style={{color:'#b91c1c', marginTop:12}}>Error: {error}</div>}
    </div>
  );
}

function UsersTab() {
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<string>('');
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewId, setViewId] = useState<number|null>(null);
  const [detail, setDetail] = useState<AdminUserDetail|null>(null);

  useEffect(() => {
    setLoading(true); setError('');
    AdminApi.usersSearch({ page, limit, search: search || undefined, role: role || undefined })
      .then((res:any) => { setRows(res.users || res.data || []); setTotal(res.total || 0); })
      .catch((e)=> setError(e.message))
      .finally(()=> setLoading(false));
  }, [page, limit, search, role]);

  useEffect(() => {
    if (viewId) {
      AdminApi.userDetail(viewId).then((res:any) => setDetail(res.user || res)).catch(e=>setError(e.message));
    } else {
      setDetail(null);
    }
  }, [viewId]);

  return (
    <div>
      <div className="toolbar">
        <div style={{display:'flex', gap:8}}>
          <input placeholder="Search users…" value={search} onChange={e=>{ setPage(1); setSearch(e.target.value); }} />
          <select value={role} onChange={e=>{ setPage(1); setRole(e.target.value); }}>
            <option value="">All roles</option>
            <option value="admin">admin</option>
            <option value="escrow officer">escrow officer</option>
            <option value="title agent">title agent</option>
            <option value="real estate agent">real estate agent</option>
          </select>
        </div>
        <div style={{display:'flex', gap:8}}>
          <button onClick={async ()=>{
            const blob = await AdminApi.exportUsersCsv();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href=url; a.download='users.csv'; a.click();
            URL.revokeObjectURL(url);
          }}>Export CSV</button>
        </div>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Email</th><th>Name</th><th>Role</th><th>Plan</th><th>Deeds</th><th>Last login</th><th></th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={7}>Loading…</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={7}>No users found</td></tr>
          ) : rows.map(u => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>{u.full_name}</td>
              <td><span className="pill">{u.role || '—'}</span></td>
              <td>{u.plan}</td>
              <td>{u.deed_count}</td>
              <td>{u.last_login || '—'}</td>
              <td><button onClick={()=>setViewId(u.id)}>View</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{display:'flex', gap:8, marginTop:12}}>
        <button disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Prev</button>
        <div>Page {page} / {Math.max(1, Math.ceil((total||0)/limit))}</div>
        <button disabled={(page*limit)>=total} onClick={()=>setPage(p=>p+1)}>Next</button>
      </div>

      {error && <div style={{color:'#b91c1c', marginTop:12}}>Error: {error}</div>}

      {viewId && detail && (
        <div className="modal" onClick={()=>setViewId(null)}>
          <div className="modal-card" onClick={(e)=>e.stopPropagation()}>
            <h3 style={{marginBottom:8}}>{detail.full_name} ({detail.email})</h3>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
              <div><b>Role:</b> {detail.role || '—'}</div>
              <div><b>Plan:</b> {detail.plan || '—'}</div>
              <div><b>Company:</b> {detail.company_name || '—'}</div>
              <div><b>State:</b> {detail.state || '—'}</div>
              <div><b>Verified:</b> {String(detail.verified ?? false)}</div>
              <div><b>Stripe:</b> {detail.stripe_customer_id || '—'}</div>
            </div>
            <div style={{marginTop:12}}>
              <div><b>Deeds:</b> total {detail.deed_stats?.total ?? 0} · completed {detail.deed_stats?.completed ?? 0} · drafts {detail.deed_stats?.drafts ?? 0}</div>
            </div>
            <div style={{marginTop:12, textAlign:'right'}}>
              <button onClick={()=>setViewId(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DeedsTab() {
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState<AdminDeedRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewId, setViewId] = useState<number|null>(null);
  const [detail, setDetail] = useState<AdminDeedDetail|null>(null);

  useEffect(() => {
    setLoading(true); setError('');
    AdminApi.deedsSearch({ page, limit, search: search || undefined, status: status || undefined })
      .then((res:any) => { setRows(res.deeds || res.data || []); setTotal(res.total || 0); })
      .catch((e)=> setError(e.message))
      .finally(()=> setLoading(false));
  }, [page, limit, search, status]);

  useEffect(() => {
    if (viewId) {
      AdminApi.deedDetail(viewId).then((res:any)=> setDetail(res.deed || res)).catch(e=>setError(e.message));
    } else { setDetail(null); }
  }, [viewId]);

  return (
    <div>
      <div className="toolbar">
        <div style={{display:'flex', gap:8}}>
          <input placeholder="Search deeds…" value={search} onChange={e=>{ setPage(1); setSearch(e.target.value); }} />
          <select value={status} onChange={e=>{ setPage(1); setStatus(e.target.value); }}>
            <option value="">All statuses</option>
            <option value="completed">completed</option>
            <option value="draft">draft</option>
          </select>
        </div>
        <div style={{display:'flex', gap:8}}>
          <button onClick={async ()=>{
            const blob = await AdminApi.exportDeedsCsv();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href=url; a.download='deeds.csv'; a.click();
            URL.revokeObjectURL(url);
          }}>Export CSV</button>
        </div>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Type</th><th>Status</th><th>Address</th><th>APN</th><th>County</th><th>User</th><th>Created</th><th></th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={8}>Loading…</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={8}>No deeds found</td></tr>
          ) : rows.map(d => (
            <tr key={d.id}>
              <td>{d.deed_type}</td>
              <td><span className="pill">{d.status}</span></td>
              <td>{d.property_address || '—'}</td>
              <td>{d.apn || '—'}</td>
              <td>{d.county || '—'}</td>
              <td>{d.user_email || '—'}</td>
              <td>{d.created_at}</td>
              <td><button onClick={()=>setViewId(d.id)}>View</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{display:'flex', gap:8, marginTop:12}}>
        <button disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Prev</button>
        <div>Page {page} / {Math.max(1, Math.ceil((total||0)/limit))}</div>
        <button disabled={(page*limit)>=total} onClick={()=>setPage(p=>p+1)}>Next</button>
      </div>

      {error && <div style={{color:'#b91c1c', marginTop:12}}>Error: {error}</div>}

      {viewId && detail && (
        <div className="modal" onClick={()=>setViewId(null)}>
          <div className="modal-card" onClick={(e)=>e.stopPropagation()}>
            <h3 style={{marginBottom:8}}>Deed #{detail.id}</h3>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
              <div><b>Type:</b> {detail.deed_type}</div>
              <div><b>Status:</b> {detail.status}</div>
              <div><b>Address:</b> {detail.property_address || '—'}</div>
              <div><b>APN:</b> {detail.apn || '—'}</div>
              <div><b>County:</b> {detail.county || '—'}</div>
              <div><b>User email:</b> {detail.user_email || '—'}</div>
            </div>
            <div style={{marginTop:12, textAlign:'right'}}>
              <button onClick={()=>setViewId(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RevenueTab() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    AdminApi.revenue().then(setData).catch(e=>setError(e.message));
  }, []);

  return (
    <div>
      {!data && !error && <div>Loading…</div>}
      {error && <div style={{color:'#b91c1c'}}>Error: {error}</div>}
      {data && (
        <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(data, null, 2)}</pre>
      )}
    </div>
  );
}

function SystemTab() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    AdminApi.systemMetrics().then(setData).catch(e=>setError(e.message));
  }, []);

  return (
    <div>
      {!data && !error && <div>Loading…</div>}
      {error && <div style={{color:'#b91c1c'}}>Error: {error}</div>}
      {data && Array.isArray(data.metrics) && data.metrics.length === 0 && (
        <div>No metrics wired. Add /admin/system-metrics on backend to enable.</div>
      )}
      {data && data.metrics && data.metrics.length > 0 && (
        <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(data, null, 2)}</pre>
      )}
    </div>
  );
}
