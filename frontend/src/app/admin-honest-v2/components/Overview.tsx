'use client';
import { useEffect, useState } from 'react';
import { AdminApi, StatSummary } from '@/lib/adminApi';
import StatCard from './StatCard';
import Badge from './Badge';
import { FEATURE_FLAGS } from '@/config/featureFlags';

export default function OverviewTab(){
  const [stats, setStats] = useState<StatSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try{
        const s = await AdminApi.getSummary();
        if (mounted) setStats(s);
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
          <StatCard title="Active Users" value={stats?.active_users ?? '—'} />
          <StatCard title="Total Deeds" value={stats?.total_deeds ?? '—'} />
          <StatCard title="Deeds This Month" value={stats?.deeds_this_month ?? '—'} />
        </>)}
      </div>

      <div className="card">
        <div className="hstack" style={{justifyContent:'space-between'}}>
          <div className="hstack">
            <div style={{fontWeight:700, fontSize:16}}>Quick Actions</div>
            <Badge kind="neutral">Honest</Badge>
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
        <div style={{marginTop:12, opacity:.75, fontSize:13}}>
          Only actions backed by real endpoints are enabled. Everything else is hidden until implemented.
        </div>
      </div>

      {err && <div className="card" style={{borderColor:'var(--dp-danger)', color:'var(--dp-danger)'}}>{err}</div>}
    </div>
  );
}

