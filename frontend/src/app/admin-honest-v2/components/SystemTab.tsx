'use client';
import { useEffect, useState } from 'react';
import { AdminApi, SystemMetric } from '@/lib/adminApi';
import EmptyState from './EmptyState';

export default function SystemTab(){
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    let mounted = true;
    (async()=>{
      try{
        const res = await AdminApi.getSystemMetrics();
        if (mounted) setMetrics(res.metrics || []);
      }catch(e:any){
        setErr(e?.message || 'Failed to load system metrics');
      }finally{
        setLoading(false);
      }
    })();
    return ()=>{ mounted = false; };
  }, []);

  if (loading) return <div className="card skeleton" style={{height:120}} />;
  if (err || metrics.length === 0) return <EmptyState icon="⚙️" title="No system metrics" description="Wire /admin/system-metrics or check auth." />;

  return (
    <div className="card">
      <table className="table">
        <thead>
          <tr>
            <th>Time</th>
            <th>API Calls</th>
            <th>Avg Response (ms)</th>
            <th>Error Rate</th>
            <th>Active Users</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m,i)=> (
            <tr key={i}>
              <td>{new Date(m.timestamp).toLocaleString()}</td>
              <td>{m.api_calls}</td>
              <td>{m.response_time_ms}</td>
              <td>{(m.error_rate*100).toFixed(2)}%</td>
              <td>{m.active_users ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

