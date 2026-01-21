'use client';
import { useEffect, useState } from 'react';
import { AdminApi, RevenueSummary } from '@/lib/adminApi';
import EmptyState from './EmptyState';

/**
 * Phase 23-B: Complete Revenue & Reporting Dashboard
 * 
 * Displays:
 * - Total Revenue, Monthly Revenue, Net Revenue (after fees & refunds)
 * - MRR (Monthly Recurring Revenue) & ARR (Annual Recurring Revenue)
 * - Monthly breakdown (last 12 months)
 * - Stripe fees & refunds tracking
 */
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
  if (err || !data) return <EmptyState icon="💰" title="No revenue data" description="Check API connection or authentication." />;

  const { overview, monthly_breakdown, mrr_arr } = data;

  // Helper to format cents to dollars
  const toDollars = (cents: number) => (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="vstack" style={{ gap: '1.5rem' }}>
      {/* KPI Cards */}
      <div className="kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="card stat-card">
          <div className="stat-title">Total Revenue</div>
          <div className="stat-value">${toDollars(overview.total_revenue_cents)}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-title">Monthly Revenue</div>
          <div className="stat-value">${toDollars(overview.monthly_revenue_cents)}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginTop: '0.25rem' }}>
            Fees: ${toDollars(overview.stripe_fees_cents)} • Refunds: ${toDollars(overview.refunds_cents)}
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-title">Net Revenue</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>
            ${toDollars(overview.net_monthly_revenue_cents)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginTop: '0.25rem' }}>
            After fees & refunds
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-title">MRR</div>
          <div className="stat-value">${toDollars(mrr_arr.mrr_cents)}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginTop: '0.25rem' }}>
            ARR: ${toDollars(mrr_arr.arr_cents)}
          </div>
        </div>
      </div>

      {/* Monthly Breakdown */}
      {monthly_breakdown.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1.1rem' }}>
            Monthly Breakdown (Last 12 Months)
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Month</th>
                <th style={{ textAlign: 'right' }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {monthly_breakdown.map(row => (
                <tr key={row.month}>
                  <td>{row.month}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    ${row.revenue_dollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State for No Data Yet */}
      {monthly_breakdown.length === 0 && overview.total_revenue_cents === 0 && (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-600)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>No revenue data yet</div>
          <div style={{ fontSize: '0.875rem' }}>
            Revenue will appear here as payments are processed through Stripe.
          </div>
        </div>
      )}
    </div>
  );
}

