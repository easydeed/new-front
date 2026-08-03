'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminApi, UserRow, UserDetail, USER_SORT_OPTIONS } from '@/lib/adminApi';
import Pager from './Pager';

export default function UsersTab(){
  const router = useRouter();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [modal, setModal] = useState<UserDetail | null>(null);
  /** The query the rows on screen actually answer. `search` is what the
   *  operator is typing; conflating the two is why "no matches" and
   *  "still typing" looked the same. */
  const [appliedSearch, setAppliedSearch] = useState('');
  const firstRun = useRef(true);

  async function load(nextPage = page){
    setLoading(true);
    setLoadError('');
    try{
      const res = await AdminApi.searchUsers(nextPage, limit, search, sort);
      setRows(res.items); setTotal(res.total); setAppliedSearch(search);
    }catch(e){
      // Doctrine §4: a failed search is not an empty result set.
      setRows([]); setTotal(0);
      setLoadError(e instanceof Error ? e.message : 'Failed to load users');
    }finally{
      setLoading(false);
    }
  }
  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, [page, sort]);

  useEffect(()=>{
    // Skip the mount pass: this effect used to fire alongside the one
    // above, so opening the tab issued two identical requests and the
    // table flickered through two loads.
    if (firstRun.current){ firstRun.current = false; return; }
    const t = setTimeout(()=>{
      // Reset to page 1 AND load page 1. Setting page here and letting
      // the other effect re-fetch meant a search from page 3 briefly
      // queried page 3 of the new result set — the "Page 3 of 1" the
      // audit hit, with an empty table under it.
      setPage(1);
      load(1);
    }, 300);
    return ()=> clearTimeout(t);
    /* eslint-disable-next-line */
  }, [search]);

  const pageCount = Math.ceil(total / limit);
  const searching = loading && search !== appliedSearch;
  const noMatches = !loading && !loadError && rows.length === 0 && appliedSearch !== '';

  return (
    <div className="vstack">
      <div className="hstack" style={{justifyContent:'space-between'}}>
        <div className="hstack">
          <input className="input" placeholder="Search users..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:320}} />
          {search && (
            <button className="button ghost" onClick={()=> setSearch('')}>Clear</button>
          )}
          <label className="hstack" style={{gap:6, fontSize:13, opacity:.8}}>
            Sort
            <select className="select" value={sort} onChange={e=>{ setPage(1); setSort(e.target.value); }}>
              {USER_SORT_OPTIONS.map(o => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>
        <Pager page={page} pageCount={pageCount} total={total} noun="user"
               loading={loading} onPage={setPage} />
      </div>

      {/* Search feedback: three distinct states, none of which used to
          be distinguishable from "the table is empty". */}
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
            ) : loadError ? (
              <tr><td colSpan={7} style={{color:'var(--dp-danger)'}}>
                Could not load users — {loadError}. This is a failed request,
                not an empty table.
              </td></tr>
            ) : noMatches ? (
              // "No users" was shown for both an empty platform and a
              // search that matched nothing, so the operator could not
              // tell a typo from a fact.
              <tr><td colSpan={7} style={{opacity:.8}}>
                No users match “{appliedSearch}”.{' '}
                <button className="button ghost" onClick={()=> setSearch('')}>
                  Clear the search
                </button>
              </td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} style={{opacity:.75}}>
                No users have registered yet.
              </td></tr>
            ) : rows[0] && rows[0].id === undefined ? (
              // HARDENING, not the cure (that is the serializer fix in
              // ADMIN1.5). A malformed row shape used to render as a
              // table of blanks and em-dashes — data that looks merely
              // sparse — and only announced itself when a drill-down
              // requested /admin/users/undefined. If the contract breaks
              // again, say so here rather than draw an empty table.
              <tr><td colSpan={7} style={{color:'var(--dp-danger)'}}>
                User rows arrived without an <code>id</code> field — the API
                response shape does not match what this table reads. Not
                rendering rows, because they would be blank.
              </td></tr>
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
            <div style={{display:'grid', gap:8, fontSize:13, marginBottom:16}}>
              <div><strong>Email:</strong> {modal.email}</div>
              <div><strong>Full Name:</strong> {modal.full_name || '—'}</div>
              <div><strong>Role:</strong> {modal.role || '—'}</div>
              <div><strong>Plan:</strong> {modal.plan || '—'}</div>
              <div><strong>Active:</strong> {modal.is_active ? 'Yes' : 'No'}</div>
              <div><strong>Created:</strong> {modal.created_at ? new Date(modal.created_at).toLocaleString() : '—'}</div>
              <div><strong>Last Login:</strong> {modal.last_login ? new Date(modal.last_login).toLocaleString() : 'Never'}</div>
              <div><strong>Stripe Customer:</strong> {modal.stripe_customer_id || '—'}</div>
              <div><strong>Deeds Created:</strong> {modal.deed_count ?? modal.deed_stats?.total ?? '—'}</div>
            </div>
            <div className="hstack" style={{justifyContent:'flex-end', gap:8, paddingTop:12, borderTop:'1px solid var(--dp-border)'}}>
              <button 
                className="button" 
                onClick={()=>{
                  setModal(null);
                  router.push(`/admin/users/${modal.id}`);
                }}
              >
                Edit User →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

