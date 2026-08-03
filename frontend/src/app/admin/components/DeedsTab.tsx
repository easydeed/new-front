'use client';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminApi, DeedRow, DEED_SORT_OPTIONS } from '@/lib/adminApi';
import Pager from './Pager';

export default function DeedsTab(){
  // Per-user view: /admin?tab=deeds&user=<id> (linked from the user detail page)
  const searchParams = useSearchParams();
  const userParam = searchParams.get('user');
  const userId = userParam ? Number(userParam) : undefined;
  const [rows, setRows] = useState<DeedRow[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [modal, setModal] = useState<DeedRow | null>(null);
  const [appliedSearch, setAppliedSearch] = useState('');
  const firstRun = useRef(true);

  async function load(nextPage = page){
    setLoading(true);
    setLoadError('');
    try{
      const res = await AdminApi.searchDeeds(nextPage, limit, search, status, userId, sort);
      setRows(res.items); setTotal(res.total); setAppliedSearch(search);
    }catch(e){
      setRows([]); setTotal(0);
      setLoadError(e instanceof Error ? e.message : 'Failed to load deeds');
    }finally{
      setLoading(false);
    }
  }
  // A status or sort change resets to page 1 at the control (below), so
  // this effect never re-queries page 3 of a result set that now has one
  // page — the "Page 3 / 1 over an empty table" the audit hit.
  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, [page, status, sort]);

  useEffect(()=>{
    if (firstRun.current){ firstRun.current = false; return; }
    const t = setTimeout(()=>{ setPage(1); load(1); }, 300);
    return ()=> clearTimeout(t);
    /* eslint-disable-next-line */
  }, [search]);

  const pageCount = Math.ceil(total / limit);
  const searching = loading && search !== appliedSearch;
  const filtered = appliedSearch !== '' || status !== '' || userId != null;
  const noMatches = !loading && !loadError && rows.length === 0 && filtered;

  function clearFilters(){
    setStatus('');
    setSearch('');
    setPage(1);
  }

  return (
    <div className="vstack">
      <div className="hstack" style={{justifyContent:'space-between'}}>
        <div className="hstack">
          <input className="input" placeholder="Search deeds..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:320}} />
          <select className="select" value={status} onChange={e=>{ setPage(1); setStatus(e.target.value); }}>
            <option value="">All</option>
            <option value="completed">Completed</option>
            <option value="draft">Draft (pending)</option>
            <option value="deleted">Deleted</option>
          </select>
          <label className="hstack" style={{gap:6, fontSize:13, opacity:.8}}>
            Sort
            <select className="select" value={sort} onChange={e=>{ setPage(1); setSort(e.target.value); }}>
              {DEED_SORT_OPTIONS.map(o => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </label>
          {userId != null && (
            <span style={{fontSize:13, opacity:.7}}>Filtered to user #{userId}</span>
          )}
        </div>
        <Pager page={page} pageCount={pageCount} total={total} noun="deed"
               loading={loading} onPage={setPage} />
      </div>

      {searching && (
        <div style={{fontSize:13, opacity:.7}}>Searching for “{search}”…</div>
      )}
      {!searching && appliedSearch && !loadError && (
        <div style={{fontSize:13, opacity:.7}}>
          {total} result{total === 1 ? '' : 's'} for “{appliedSearch}”
        </div>
      )}

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
            ) : loadError ? (
              <tr><td colSpan={6} style={{color:'var(--dp-danger)'}}>
                Could not load deeds — {loadError}. This is a failed request,
                not an empty table.
              </td></tr>
            ) : noMatches ? (
              <tr><td colSpan={6} style={{opacity:.8}}>
                No deeds match the current filters
                {appliedSearch && <> (“{appliedSearch}”)</>}
                {status && <> · status {status}</>}
                {userId != null && <> · user #{userId}</>}.{' '}
                {userId == null && (
                  <button className="button ghost" onClick={clearFilters}>
                    Clear filters
                  </button>
                )}
              </td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} style={{opacity:.75}}>
                No deeds have been created yet.
              </td></tr>
            ) : rows[0] && rows[0].id === undefined ? (
              // Hardening (see UsersTab): a broken row shape announces
              // itself instead of rendering a table of blanks whose
              // drill-down then requests /admin/deeds/undefined.
              <tr><td colSpan={6} style={{color:'var(--dp-danger)'}}>
                Deed rows arrived without an <code>id</code> field — the API
                response shape does not match what this table reads. Not
                rendering rows, because they would be blank.
              </td></tr>
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

