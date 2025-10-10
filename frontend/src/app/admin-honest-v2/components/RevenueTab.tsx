'use client';
import { useEffect, useState } from 'react';
import { AdminApi, RevenueSummary } from '@/lib/adminApi';
import EmptyState from './EmptyState';

export default function RevenueTab(){
  const [data, setData] = useState<RevenueSummary | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    let mounted = true;
    (async() => {
      try{
        const r = await AdminApi.getRevenue();
        if (mounted) setData(r);
      }catch(e:any){
        setErr(e?.message || 'Failed to load revenue');
      }finally{
        setLoading(false);
      }
    })();
    return ()=>{ mounted = false; };
  }, []);

  if (loading) return <div className="card skeleton" style={{height:120}} />;
  if (err || !data) return <EmptyState icon="💰" title="No revenue data" description="Wire /admin/revenue or check auth." />;

  const plans = Object.entries(data.plan_counts || {}).sort((a,b)=> (b[1]-a[1]));
  return (
    <div className="vstack">
      <div className="kpis">
        <div className="card stat-card">
          <div className="stat-title">Total Revenue</div>
          <div className="stat-value">${(data.total_revenue || 0).toLocaleString()}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-title">Monthly Revenue</div>
          <div className="stat-value">${(data.monthly_revenue || 0).toLocaleString()}</div>
        </div>
      </div>
      <div className="card">
        <div style={{fontWeight:700, marginBottom:8}}>Plan Breakdown</div>
        {plans.length === 0 ? <div style={{opacity:.75}}>No plan data</div> : (
          <table className="table">
            <thead><tr><th>Plan</th><th>Users</th></tr></thead>
            <tbody>{plans.map(([name,count])=> <tr key={name}><td>{name}</td><td>{count as any}</td></tr>)}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}

