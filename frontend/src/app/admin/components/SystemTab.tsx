'use client';
import { useEffect, useState } from 'react';
import StatCard from './StatCard';
import Badge from './Badge';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

function authHeaders() {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('access_token') || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface SystemHealth {
  database: { status: string; latency_ms: number };
  pdf_engine: { status: string; primary: string };
  sitex: { status: string; last_call?: string };
  stripe: { status: string };
}

interface PDFStats {
  total_generated: number;
  pdfshift_count: number;
  weasyprint_count: number;
  avg_time_ms: number;
  by_type: Record<string, number>;
}

interface SystemData {
  health: SystemHealth;
  pdf_stats: PDFStats;
}

export default function SystemTab(){
  const [data, setData] = useState<SystemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(()=>{
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/admin/system/overview`, {
          headers: { ...authHeaders() }
        });
        if (res.ok) {
          setData(await res.json());
        } else {
          setError('Failed to load system data');
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="vstack">
        <div className="grid stats">
          {[1,2,3,4].map(i => <div key={i} className="card skeleton" style={{height: 92}} />)}
        </div>
        <div className="card skeleton" style={{height: 200}} />
      </div>
    );
  }

  // Provide defaults if no data
  const health = data?.health || {
    database: { status: 'unknown', latency_ms: 0 },
    pdf_engine: { status: 'unknown', primary: 'unknown' },
    sitex: { status: 'unknown' },
    stripe: { status: 'unknown' }
  };
  
  const pdfStats = data?.pdf_stats || {
    total_generated: 0,
    pdfshift_count: 0,
    weasyprint_count: 0,
    avg_time_ms: 0,
    by_type: {}
  };

  return (
    <div className="vstack">
      {error && (
        <div className="card" style={{ borderColor: 'var(--dp-danger)', color: 'var(--dp-danger)' }}>
          {error}
        </div>
      )}

      {/* PDF Generation Stats */}
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>PDF Generation</div>
      <div className="grid stats">
        <StatCard title="Total Generated" value={pdfStats.total_generated} />
        <StatCard 
          title="PDFShift" 
          value={`${pdfStats.pdfshift_count} (${pdfStats.total_generated ? Math.round(pdfStats.pdfshift_count / pdfStats.total_generated * 100) : 0}%)`} 
        />
        <StatCard 
          title="WeasyPrint" 
          value={`${pdfStats.weasyprint_count} (${pdfStats.total_generated ? Math.round(pdfStats.weasyprint_count / pdfStats.total_generated * 100) : 0}%)`} 
        />
        <StatCard title="Avg Time" value={`${pdfStats.avg_time_ms}ms`} />
      </div>

      {/* By Deed Type */}
      {Object.keys(pdfStats.by_type).length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 12 }}>By Deed Type</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {Object.entries(pdfStats.by_type).map(([type, count]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 140, fontSize: 13 }}>{formatDeedType(type)}</div>
                <div style={{ flex: 1, height: 8, background: 'var(--dp-border, #333)', borderRadius: 4, overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      width: `${Math.round((count as number) / pdfStats.total_generated * 100)}%`,
                      background: 'var(--dp-primary, #7C4DFF)',
                      borderRadius: 4
                    }} 
                  />
                </div>
                <div style={{ width: 80, fontSize: 13, textAlign: 'right' }}>
                  {count} ({Math.round((count as number) / pdfStats.total_generated * 100)}%)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Health */}
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, marginTop: 8 }}>System Health</div>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Status</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Database</td>
              <td>
                <Badge kind={health.database.status === 'up' ? 'success' : 'danger'}>
                  {health.database.status === 'up' ? 'Online' : 'Offline'}
                </Badge>
              </td>
              <td style={{ fontSize: 12, opacity: 0.7 }}>{health.database.latency_ms}ms latency</td>
            </tr>
            <tr>
              <td>PDF Engine</td>
              <td>
                <Badge kind={health.pdf_engine.status === 'up' ? 'success' : 'danger'}>
                  {health.pdf_engine.status === 'up' ? 'Online' : 'Offline'}
                </Badge>
              </td>
              <td style={{ fontSize: 12, opacity: 0.7 }}>Primary: {health.pdf_engine.primary}</td>
            </tr>
            <tr>
              <td>SiteX API</td>
              <td>
                <Badge kind={health.sitex.status === 'up' ? 'success' : health.sitex.status === 'unknown' ? 'neutral' : 'danger'}>
                  {health.sitex.status === 'up' ? 'Online' : health.sitex.status === 'unknown' ? 'Unknown' : 'Offline'}
                </Badge>
              </td>
              <td style={{ fontSize: 12, opacity: 0.7 }}>{health.sitex.last_call || '—'}</td>
            </tr>
            <tr>
              <td>Stripe</td>
              <td>
                <Badge kind={health.stripe.status === 'up' ? 'success' : 'danger'}>
                  {health.stripe.status === 'up' ? 'Online' : 'Offline'}
                </Badge>
              </td>
              <td style={{ fontSize: 12, opacity: 0.7 }}>Payments & Subscriptions</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDeedType(type: string): string {
  const mapping: Record<string, string> = {
    'grant_deed': 'Grant Deed',
    'grant_deed_ca': 'Grant Deed',
    'quitclaim_deed': 'Quitclaim Deed',
    'quitclaim_deed_ca': 'Quitclaim Deed',
    'interspousal_transfer': 'Interspousal',
    'interspousal_transfer_ca': 'Interspousal',
    'warranty_deed': 'Warranty Deed',
    'warranty_deed_ca': 'Warranty Deed',
    'tax_deed': 'Tax Deed',
    'tax_deed_ca': 'Tax Deed',
  };
  return mapping[type] || type.replace(/_/g, ' ');
}

