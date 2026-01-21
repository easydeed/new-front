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
  pdfs_this_week?: number;
  scans_this_week?: number;
  new_users_this_week?: number;
}

export default function OverviewTab(){
  const [stats, setStats] = useState<ExtendedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try{
        // Get main dashboard stats
        const s = await AdminApi.getSummary();
        
        // Get verification stats for scan count
        let scans = 0;
        try {
          const verRes = await fetch(`${API_BASE}/admin/verification/stats`, {
            headers: { ...authHeaders() }
          });
          if (verRes.ok) {
            const verData = await verRes.json();
            scans = verData.total_scans_week || 0;
          }
        } catch {}
        
        if (mounted) {
          setStats({
            ...s,
            pdfs_this_week: s.deeds_this_month || 0, // Approximate
            scans_this_week: scans
          });
        }
      }catch(e:any){
        if (mounted) setErr(e.message || 'Failed to load');
      }finally{
        if (mounted) setLoading(false);
      }
    })();
    return ()=>{ mounted = false; };
  }, []);

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
          <StatCard title="QR Scans (Week)" value={stats?.scans_this_week ?? 0} />
        </>)}
      </div>

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

