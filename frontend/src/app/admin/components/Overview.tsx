'use client';
import { useEffect, useState } from 'react';
import { AdminApi, StatSummary } from '@/lib/adminApi';
import StatCard from './StatCard';
import Badge from './Badge';
import { FEATURE_FLAGS } from '@/config/featureFlags';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

function authHeaders() {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('access_token') || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface ExtendedStats extends StatSummary {
  /** null = the verification service did not answer. Distinct from 0. */
  scans_this_week?: number | null;
}

export default function OverviewTab(){
  const [stats, setStats] = useState<ExtendedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [scanErr, setScanErr] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try{
        // Get main dashboard stats
        const s = await AdminApi.getSummary();

        // ADMIN1: this fetch used to swallow every failure into scans = 0,
        // so a dead verification service rendered "QR Scans (Week): 0" —
        // indistinguishable from a real zero. A failure now yields null,
        // renders as "—", and says why underneath.
        let scans: number | null = null;
        let scanFailure = '';
        try {
          const verRes = await fetch(`${API_BASE}/admin/verification/stats`, {
            headers: { ...authHeaders() }
          });
          if (verRes.ok) {
            const verData = await verRes.json();
            scans = verData.total_scans_week ?? 0;
          } else {
            scanFailure = `verification stats unavailable (HTTP ${verRes.status})`;
          }
        } catch (e) {
          scanFailure = e instanceof Error
            ? `verification stats unavailable — ${e.message}`
            : 'verification stats unavailable';
        }

        if (mounted) {
          // The old `pdfs_this_week: deeds_this_month // Approximate`
          // field is gone: nothing rendered it, and a month labelled as
          // a week is a wrong number waiting for a consumer.
          setStats({ ...s, scans_this_week: scans });
          setScanErr(scanFailure);
        }
      }catch(e:any){
        if (mounted) setErr(e.message || 'Failed to load');
      }finally{
        if (mounted) setLoading(false);
      }
    })();
    return ()=>{ mounted = false; };
  }, []);

  function relativeTime(ts: string | null): string {
    if (!ts) return '';
    const then = new Date(ts).getTime();
    if (isNaN(then)) return '';
    const mins = Math.floor((Date.now() - then) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  const skeleton = <div className="grid stats">
    {Array.from({length:4}).map((_,i)=> <div key={i} className="card skeleton" style={{height:92}} />)}
  </div>;

  return (
    <div className="vstack">
      <div className="grid stats">
        {loading ? skeleton : (<>
          <StatCard title="Total Users" value={stats?.total_users ?? '—'} />
          <StatCard title="Total Deeds" value={stats?.total_deeds ?? '—'} />
          <StatCard title="Deeds This Month" value={stats?.deeds_this_month ?? '—'} />
          <StatCard title="QR Scans (Week)" value={stats?.scans_this_week ?? '—'} />
        </>)}
      </div>

      {scanErr && (
        <div style={{ fontSize: 12, color: 'var(--dp-warn, #b26a00)', marginTop: -4 }}>
          QR scan count shown as unavailable — {scanErr}
        </div>
      )}

      {/* Recent activity — computed by /admin/dashboard since Phase 5 and
          rendered by nobody until ADMIN1. Seven days of signups and deed
          creations: the answer to "what has been happening?" */}
      {!loading && (
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
            Recent activity <span style={{ fontWeight: 400, fontSize: 13, opacity: 0.6 }}>· last 7 days</span>
          </div>
          {(stats?.recent_activity?.length ?? 0) === 0 ? (
            <div style={{ opacity: 0.7, fontSize: 14 }}>
              No signups or deeds in the last 7 days.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {stats!.recent_activity!.map((ev, i) => (
                <div key={i} className="hstack" style={{ gap: 10, alignItems: 'center' }}>
                  <Badge kind={ev.type === 'user_signup' ? 'success' : 'neutral'}>
                    {ev.type === 'user_signup' ? 'signup' : 'deed'}
                  </Badge>
                  <span style={{ fontSize: 14 }}>{ev.user}</span>
                  {ev.deed_id != null && (
                    <a href={`/admin?tab=deeds`} style={{ fontSize: 13, opacity: 0.8 }}>
                      #{ev.deed_id}
                    </a>
                  )}
                  <span style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.6 }}>
                    {relativeTime(ev.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div className="hstack" style={{justifyContent:'space-between'}}>
          <div className="hstack">
            <div style={{fontWeight:700, fontSize:16}}>Quick Actions</div>
          </div>
          <div className="hstack" style={{gap:8}}>
            <button className="button" onClick={async()=>{
              if (!FEATURE_FLAGS.EXPORTS){
                alert('Exports are disabled');
                return;
              }
              try{
                const blob = await AdminApi.exportUsersCsv();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'users.csv'; a.click();
                URL.revokeObjectURL(url);
              }catch(e:any){
                alert('Export failed: ' + (e?.message || 'unknown'));
              }
            }}>Export Users CSV</button>
            <button className="button ghost" onClick={async()=>{
              if (!FEATURE_FLAGS.EXPORTS){
                alert('Exports are disabled');
                return;
              }
              try{
                const blob = await AdminApi.exportDeedsCsv();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'deeds.csv'; a.click();
                URL.revokeObjectURL(url);
              }catch(e:any){
                alert('Export failed: ' + (e?.message || 'unknown'));
              }
            }}>Export Deeds CSV</button>
          </div>
        </div>
      </div>

      {err && <div className="card" style={{borderColor:'var(--dp-danger)', color:'var(--dp-danger)'}}>{err}</div>}
    </div>
  );
}

