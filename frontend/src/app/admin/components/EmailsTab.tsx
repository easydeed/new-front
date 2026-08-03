'use client';
/**
 * ADMIN3 — the transport ledger, readable.
 *
 * The 3 AM question is "the customer says they never got the approval
 * email — did we send it, and what did SendGrid say?" Before this,
 * the answer lived in a `print()` on a container that had since
 * restarted. Eleven templates, ten of their outcomes discarded; only
 * the API-access funnel persisted one, and only because that table is a
 * work queue somebody stares at.
 *
 * Two honesty rules govern this screen:
 *
 * 1. It shows attempts we MANAGED TO RECORD. The recorder is
 *    best-effort by design — a logging failure must never 500 a
 *    registration — so a dropped row is possible and the screen says so
 *    rather than presenting itself as complete.
 * 2. It states when recording STARTED. A table created yesterday looks
 *    exactly like a quiet month if you do not say that. "0 failures"
 *    over a window that predates the log is not a clean bill of health.
 */
import { useEffect, useState } from 'react';
import { AdminApi, EmailLogRow, EmailStats } from '@/lib/adminApi';
import StatCard from './StatCard';
import Badge from './Badge';
import Pager from './Pager';

const TEMPLATES = [
  'share_invite', 'share_reminder', 'share_approved', 'share_rejected',
  'deed_completed', 'password_reset', 'verify_email', 'password_changed',
  'welcome', 'admin_api_key_request', 'admin_new_user',
];

function prettyTemplate(t: string): string {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function EmailsTab(){
  const [rows, setRows] = useState<EmailLogRow[]>([]);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [template, setTemplate] = useState('');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [statsError, setStatsError] = useState('');
  const [detail, setDetail] = useState<EmailLogRow | null>(null);

  async function load(nextPage = page){
    setLoading(true);
    setLoadError('');
    try{
      const res = await AdminApi.searchEmails(nextPage, limit, status, template, search);
      setRows(res.items); setTotal(res.total); setAppliedSearch(search);
    }catch(e){
      setRows([]); setTotal(0);
      setLoadError(e instanceof Error ? e.message : 'Failed to load the email log');
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, [page, status, template]);

  useEffect(()=>{
    (async () => {
      try{
        setStats(await AdminApi.getEmailStats(7));
      }catch(e){
        setStats(null);
        setStatsError(e instanceof Error ? e.message : 'stats unavailable');
      }
    })();
  }, []);

  const pageCount = Math.ceil(total / limit);
  const filtered = appliedSearch !== '' || status !== '' || template !== '';
  const noMatches = !loading && !loadError && rows.length === 0 && filtered;

  function clearFilters(){ setStatus(''); setTemplate(''); setSearch(''); setPage(1); load(1); }

  return (
    <div className="vstack">
      {/* Provenance before numbers — the ADMIN1.5 habit. */}
      <div className="card">
        <div style={{fontWeight:600, marginBottom:4}}>What this records</div>
        <div style={{fontSize:13, opacity:.75}}>
          One row per send attempt, written at the single point every one of the
          eleven templates passes through. Recording is best-effort so that a
          logging failure can never break a registration or a share — which
          means this is every attempt we managed to record, not a proof of
          completeness.
          {stats?.recording_since
            ? <> Recording began {new Date(stats.recording_since).toLocaleDateString()};
                anything before that date was printed to the container log and is gone.</>
            : <> Nothing has been recorded yet.</>}
        </div>
      </div>

      <div className="grid stats">
        <StatCard title="Sent · last 7 days" value={stats?.sent ?? '—'} />
        <StatCard title="Failed · last 7 days" value={stats?.failed ?? '—'} />
        <StatCard title="Attempts · last 7 days" value={stats?.total ?? '—'} />
        <StatCard
          title="Delivery rate"
          value={stats && stats.total > 0
            ? `${Math.round((stats.sent / stats.total) * 100)}%`
            : '—'}
          sub={stats && stats.total > 0 ? `of ${stats.total} attempts` : 'no attempts recorded'}
        />
      </div>

      {statsError && (
        <div className="card" style={{borderColor:'var(--dp-danger)', color:'var(--dp-danger)'}}>
          Email statistics unavailable — {statsError}. Not shown as zero.
        </div>
      )}

      {/* The actionable half: a failure count says something is broken,
          the reason says which thing and how to fix it. */}
      {stats && stats.failures_by_reason.length > 0 && (
        <div className="card" style={{borderColor:'var(--dp-warning-strong)'}}>
          <div style={{fontWeight:600, marginBottom:8}}>Why sends failed · last 7 days</div>
          <div style={{display:'grid', gap:6}}>
            {stats.failures_by_reason.map((f, i) => (
              <div key={i} className="hstack" style={{justifyContent:'space-between', gap:12}}>
                <code style={{fontSize:12}}>{f.reason}</code>
                <span style={{fontSize:13, opacity:.7, whiteSpace:'nowrap'}}>{f.count}×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="hstack" style={{justifyContent:'space-between'}}>
        <div className="hstack">
          <input className="input" placeholder="Search recipient..." style={{width:280}}
                 value={search} onChange={e=>setSearch(e.target.value)}
                 onKeyDown={e=>{ if(e.key==='Enter'){ setPage(1); load(1); } }} />
          <button className="button ghost" onClick={()=>{ setPage(1); load(1); }}>Search</button>
          <select className="select" value={status} onChange={e=>{ setPage(1); setStatus(e.target.value); }}>
            <option value="">All outcomes</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
          <select className="select" value={template} onChange={e=>{ setPage(1); setTemplate(e.target.value); }}>
            <option value="">All templates</option>
            {TEMPLATES.map(t => <option key={t} value={t}>{prettyTemplate(t)}</option>)}
          </select>
        </div>
        <Pager page={page} pageCount={pageCount} total={total} noun="attempt"
               loading={loading} onPage={setPage} />
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>When</th>
              <th>Template</th>
              <th>Recipient</th>
              <th>Outcome</th>
              <th>Reason</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}>
                <div className="skeleton" style={{height:42}}/>
                <div className="skeleton" style={{height:42, marginTop:8}}/>
              </td></tr>
            ) : loadError ? (
              <tr><td colSpan={6} style={{color:'var(--dp-danger)'}}>
                Could not load the email log — {loadError}. This is a failed
                request, not an empty log.
              </td></tr>
            ) : noMatches ? (
              <tr><td colSpan={6} style={{opacity:.8}}>
                No attempts match the current filters.{' '}
                <button className="button ghost" onClick={clearFilters}>Clear filters</button>
              </td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} style={{opacity:.75}}>
                No send attempts recorded yet.
              </td></tr>
            ) : rows.map(r => (
              <tr key={r.id}>
                <td style={{whiteSpace:'nowrap'}}>
                  {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
                </td>
                <td>{prettyTemplate(r.template)}</td>
                <td>{r.recipient}</td>
                <td>
                  <Badge kind={r.status === 'sent' ? 'success' : 'danger'}>{r.status}</Badge>
                </td>
                <td style={{maxWidth:320, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                  {r.reason || (r.status === 'sent' ? '—' : 'no reason recorded')}
                </td>
                <td style={{textAlign:'right'}}>
                  <button className="button ghost" onClick={()=>setDetail(r)}>View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="modal-backdrop" onClick={()=>setDetail(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:600}}>
            <div className="hstack" style={{justifyContent:'space-between', marginBottom:16}}>
              <div style={{fontWeight:700, fontSize:16}}>Send attempt #{detail.id}</div>
              <button className="button ghost" onClick={()=>setDetail(null)}>Close</button>
            </div>
            <div style={{display:'grid', gap:10, fontSize:13}}>
              <div><strong>Template:</strong> {prettyTemplate(detail.template)}</div>
              <div><strong>Recipient:</strong> {detail.recipient}</div>
              <div><strong>Subject:</strong> {detail.subject || '—'}</div>
              <div><strong>Outcome:</strong>{' '}
                <Badge kind={detail.status === 'sent' ? 'success' : 'danger'}>{detail.status}</Badge>
              </div>
              {detail.status === 'failed' && (
                <div>
                  <strong>Reason:</strong>
                  <div style={{marginTop:4, padding:'8px 10px', background:'var(--dp-surface-2)',
                               borderRadius:'var(--dp-radius-xs)', fontFamily:'monospace', fontSize:12}}>
                    {detail.reason || 'no reason recorded'}
                  </div>
                </div>
              )}
              {detail.context && (
                <div>
                  <strong>Context:</strong>
                  <div style={{marginTop:4, padding:'8px 10px', background:'var(--dp-surface-2)',
                               borderRadius:'var(--dp-radius-xs)', fontFamily:'monospace', fontSize:12}}>
                    {JSON.stringify(detail.context)}
                  </div>
                </div>
              )}
              <div><strong>Recorded:</strong>{' '}
                {detail.created_at ? new Date(detail.created_at).toLocaleString() : '—'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
