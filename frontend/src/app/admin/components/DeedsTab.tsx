'use client';
import { useEffect, useState } from 'react';
import { AdminApi, DeedRow } from '@/lib/adminApi';

export default function DeedsTab(){
  const [rows, setRows] = useState<DeedRow[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<DeedRow | null>(null);

  async function load(){
    setLoading(true);
    try{
      const res = await AdminApi.searchDeeds(page, limit, search, status);
      setRows(res.items); setTotal(res.total);
    }finally{
      setLoading(false);
    }
  }
  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, [page, status]);

  useEffect(()=>{
    const t = setTimeout(()=>{ setPage(1); load(); }, 300);
    return ()=> clearTimeout(t);
  }, [search]);

  return (
    <div className="vstack">
      <div className="hstack" style={{justifyContent:'space-between'}}>
        <div className="hstack">
          <input className="input" placeholder="Search deeds..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:320}} />
          <select className="select" value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="completed">Completed</option>
            <option value="draft">Draft</option>
          </select>
        </div>
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
              <th>Type</th>
              <th>Status</th>
              <th>Property</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}>
                <div className="skeleton" style={{height:42}}/>
                <div className="skeleton" style={{height:42, marginTop:8}}/>
                <div className="skeleton" style={{height:42, marginTop:8}}/>
              </td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} style={{opacity:.75}}>No deeds</td></tr>
            ) : rows.map(d => (
              <tr key={d.id}>
                <td>{d.id}</td>
                <td>{d.deed_type}</td>
                <td>{d.status}</td>
                <td>{d.property_address || '—'}</td>
                <td>{d.created_at ? new Date(d.created_at).toLocaleString() : '—'}</td>
                <td style={{textAlign:'right'}}>
                  <button className="button ghost" onClick={async()=>{
                    const full = await AdminApi.getDeed(d.id);
                    setModal(full);
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
              <div style={{fontWeight:700, fontSize:16}}>Deed #{modal.id}</div>
              <button className="button ghost" onClick={()=>setModal(null)}>Close</button>
            </div>
            <div style={{display:'grid', gap:8, fontSize:13}}>
              <div><strong>Type:</strong> {modal.deed_type}</div>
              <div><strong>Status:</strong> {modal.status}</div>
              <div><strong>Property:</strong> {modal.property_address || '—'}</div>
              <div><strong>Created:</strong> {modal.created_at ? new Date(modal.created_at).toLocaleString() : '—'}</div>
              <div><strong>Updated:</strong> {modal.updated_at ? new Date(modal.updated_at).toLocaleString() : '—'}</div>
              <div><strong>User ID:</strong> {modal.user_id || '—'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

