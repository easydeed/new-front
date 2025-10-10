'use client';
import { useEffect, useState } from 'react';
import { AdminApi, UserRow, UserDetail } from '@/lib/adminApi';

export default function UsersTab(){
  const [rows, setRows] = useState<UserRow[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<UserDetail | null>(null);

  async function load(){
    setLoading(true);
    try{
      const res = await AdminApi.searchUsers(page, limit, search);
      setRows(res.items); setTotal(res.total);
    }finally{
      setLoading(false);
    }
  }
  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, [page]);

  useEffect(()=>{
    const t = setTimeout(()=>{ setPage(1); load(); }, 300);
    return ()=> clearTimeout(t);
  }, [search]);

  return (
    <div className="vstack">
      <div className="hstack" style={{justifyContent:'space-between'}}>
        <input className="input" placeholder="Search users..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:320}} />
        <div className="hstack">
          <div style={{opacity:.7, fontSize:13}}>
            Page {page} / {Math.max(1, Math.ceil(total/limit))}
          </div>
          <button className="button ghost" onClick={()=> setPage(p=>Math.max(1,p-1))} disabled={page<=1}>Prev</button>
          <button className="button" onClick={()=> setPage(p=> p+1)} disabled={page*limit>=total}>Next</button>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Plan</th>
              <th>Role</th>
              <th>Deeds</th>
              <th>Last Login</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}>
                <div className="skeleton" style={{height:42}}/>
                <div className="skeleton" style={{height:42, marginTop:8}}/>
                <div className="skeleton" style={{height:42, marginTop:8}}/>
              </td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} style={{opacity:.75}}>No users</td></tr>
            ) : rows.map(u => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.email}</td>
                <td>{u.plan || '—'}</td>
                <td>{u.role || '—'}</td>
                <td>{u.deed_count ?? '—'}</td>
                <td>{u.last_login ? new Date(u.last_login).toLocaleString() : '—'}</td>
                <td style={{textAlign:'right'}}>
                  <button className="button ghost" onClick={async()=>{
                    const d = await AdminApi.getUser(u.id);
                    setModal(d);
                  }}>View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-backdrop" onClick={()=>setModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="hstack" style={{justifyContent:'space-between', marginBottom:16}}>
              <div style={{fontWeight:700, fontSize:16}}>User #{modal.id}</div>
              <button className="button ghost" onClick={()=>setModal(null)}>Close</button>
            </div>
            <div style={{display:'grid', gap:8, fontSize:13}}>
              <div><strong>Email:</strong> {modal.email}</div>
              <div><strong>Full Name:</strong> {modal.full_name || '—'}</div>
              <div><strong>Role:</strong> {modal.role || '—'}</div>
              <div><strong>Plan:</strong> {modal.plan || '—'}</div>
              <div><strong>Active:</strong> {modal.is_active ? 'Yes' : 'No'}</div>
              <div><strong>Created:</strong> {modal.created_at ? new Date(modal.created_at).toLocaleString() : '—'}</div>
              <div><strong>Last Login:</strong> {modal.last_login ? new Date(modal.last_login).toLocaleString() : 'Never'}</div>
              <div><strong>Stripe Customer:</strong> {modal.stripe_customer_id || '—'}</div>
              <div><strong>Deeds Created:</strong> {modal.deed_count ?? modal.deeds?.length ?? '—'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

