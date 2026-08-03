'use client';
/**
 * System health — the screen an operator opens during an incident.
 *
 * ADMIN1 truth pass. Two problems lived here:
 *
 * 1. On a failed load it rendered the whole dashboard from zero/unknown
 *    defaults, so a dead backend showed "Total Generated 0 · Avg Time
 *    0ms" — numerals that read as measurements. It now renders the
 *    failure and nothing else. A health screen that invents health is
 *    worse than no health screen.
 * 2. Values it displayed were fabricated upstream: the PDF engine was a
 *    hardcoded "up", avg render time was a constant 0, and the
 *    WeasyPrint count was asserted equal to a count of completed deeds.
 *    Those are fixed in the backend; this file renders what the probe
 *    actually reports, including "not measured" as an em-dash rather
 *    than as a zero.
 */
import { useEffect, useState } from 'react';
import StatCard from './StatCard';
import Badge from './Badge';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

function authHeaders() {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('access_token') || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface ServiceHealth {
  status: string;
  /** null when the probe did not complete — a service that never
   *  answered has no latency, and "0ms" under an Offline badge was the
   *  most confident wrong number on this screen. */
  latency_ms?: number | null;
  primary?: string;
  error?: string | null;
  note?: string;
}

/**
 * ADMIN1.5 relapse sweep. The backend measured latency as
 * `int(seconds * 1000)`, so every healthy same-region probe truncated to
 * 0 and the console said "0ms latency" — a zero manufactured by
 * rounding, which is the exact failure ADMIN1 removed elsewhere. The
 * probe keeps sub-millisecond resolution now; this renders it without
 * inventing precision it does not have.
 */
function formatLatency(ms: number | null | undefined): string {
  if (ms == null) return 'not measured';
  if (ms < 1) return '<1ms';
  if (ms < 10) return `${ms.toFixed(1)}ms`;
  return `${Math.round(ms)}ms`;
}

interface SystemHealth {
  database: ServiceHealth;
  pdf_engine: ServiceHealth;
  sitex: ServiceHealth;
  stripe: ServiceHealth;
}

interface PDFStats {
  stored_pdfs: number;
  completed_deeds: number;
  completed_without_pdf: number;
  /** null when nothing measures it — rendered as "—", never as 0. */
  avg_time_ms: number | null;
  engine: string;
  by_type: Record<string, number>;
  error?: string;
}

interface SystemData {
  health: SystemHealth;
  pdf_stats: PDFStats;
}

/** Below this many observations, a percentage chart is arithmetic on a
 *  handful of rows. Named rather than inlined so the threshold is a
 *  stated editorial choice and can be pinned by test. */
const SMALL_SAMPLE_THRESHOLD = 20;

function StatusBadge({ service }: { service: ServiceHealth }) {
  if (service.status === 'up') return <Badge kind="success">Online</Badge>;
  if (service.status === 'not_monitored') return <Badge kind="neutral">Not monitored</Badge>;
  if (service.status === 'unknown') return <Badge kind="neutral">Unknown</Badge>;
  return <Badge kind="danger">Offline</Badge>;
}

export default function SystemTab() {
  const [data, setData] = useState<SystemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/admin/system/overview`, {
          headers: { ...authHeaders() },
        });
        if (res.ok) {
          setData(await res.json());
        } else {
          setError(`Failed to load system data — HTTP ${res.status}`);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load system data');
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
          {[1, 2, 3, 4].map((i) => <div key={i} className="card skeleton" style={{ height: 92 }} />)}
        </div>
        <div className="card skeleton" style={{ height: 200 }} />
      </div>
    );
  }

  // Fail loudly. No defaults, no zeros — if we could not read the
  // system's health, the only honest thing to show is that fact.
  if (error || !data) {
    return (
      <div className="card" style={{ borderColor: 'var(--dp-danger)' }}>
        <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--dp-danger)' }}>
          System health unavailable
        </div>
        <div style={{ fontSize: 14, marginBottom: 10 }}>
          {error || 'The backend returned no data.'}
        </div>
        <div style={{ fontSize: 13, opacity: 0.75 }}>
          Nothing below is being shown as zero, because a zero here would be
          indistinguishable from a real measurement. Check the API service
          and reload.
        </div>
      </div>
    );
  }

  const { health, pdf_stats: pdfStats } = data;
  const stuck = pdfStats.completed_without_pdf || 0;

  return (
    <div className="vstack">
      {/* PDF pipeline */}
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>PDF pipeline</div>
      {pdfStats.error ? (
        <div className="card" style={{ borderColor: 'var(--dp-danger)', color: 'var(--dp-danger)' }}>
          PDF statistics unavailable — {pdfStats.error}
        </div>
      ) : (
        <>
          <div className="grid stats">
            {/* Counted from deed_pdfs — rows whose bytes we actually
                stored — not from deed status, which is a different fact. */}
            <StatCard title="Stored PDFs" value={pdfStats.stored_pdfs} />
            <StatCard title="Completed deeds" value={pdfStats.completed_deeds} />
            <StatCard title="Completed without PDF" value={stuck} />
            <StatCard
              title="Avg render time"
              value={pdfStats.avg_time_ms == null ? '—' : `${pdfStats.avg_time_ms}ms`}
            />
          </div>
          {pdfStats.avg_time_ms == null && (
            <div style={{ fontSize: 12, opacity: 0.65, marginTop: -4 }}>
              Render time is not measured anywhere in the pipeline yet, so it is
              shown as unavailable rather than as zero.
            </div>
          )}
          {stuck > 0 && (
            // The H1 silent-store class, visible from the console at last.
            <div className="card" style={{ borderColor: 'var(--dp-warn, #b26a00)' }}>
              <strong>{stuck}</strong> completed deed{stuck === 1 ? ' has' : 's have'} no
              stored PDF. These are recoverable — the artifact regenerates on next
              download — but a persistent count here means the store is failing.
            </div>
          )}
        </>
      )}

      {/* By deed type — with its denominator stated.
          ADMIN1.5: this drew percentage bars off `stored_pdfs` without
          ever naming that base. At the sample sizes this platform
          currently has, one deed moves a bar twenty points, and a
          confident-looking distribution chart is the most persuasive way
          to show a reader something that is not there. The base is now
          named in the heading, the count leads and the share follows,
          and below a threshold the chart says outright that the shares
          are arithmetic rather than signal. */}
      {Object.keys(pdfStats.by_type || {}).length > 0 && (() => {
        const base = pdfStats.stored_pdfs || 0;
        const share = (count: number) => (base ? Math.round((count / base) * 100) : 0);
        const smallSample = base > 0 && base < SMALL_SAMPLE_THRESHOLD;
        return (
          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              Stored PDFs by deed type
            </div>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 12 }}>
              Shares of {base} stored PDF{base === 1 ? '' : 's'} — the denominator
              is the count above, not all deeds.
            </div>
            {smallSample && (
              <div style={{ fontSize: 12, color: 'var(--dp-warning)', marginBottom: 12 }}>
                n = {base}. At this size each document is worth
                ~{Math.round(100 / base)} percentage points, so treat the bars as
                a tally with a scale, not as a distribution.
              </div>
            )}
            <div style={{ display: 'grid', gap: 8 }}>
              {Object.entries(pdfStats.by_type).map(([type, count]) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 180, fontSize: 13 }}>{formatDeedType(type)}</div>
                  <div style={{ flex: 1, height: 8, background: 'var(--dp-border, #333)', borderRadius: 4, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${share(count as number)}%`,
                        background: 'var(--dp-primary, #7C4DFF)',
                        borderRadius: 4,
                      }}
                    />
                  </div>
                  <div style={{ width: 120, fontSize: 13, textAlign: 'right' }}>
                    {count} of {base}{' '}
                    <span style={{ opacity: 0.6 }}>({share(count as number)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Health */}
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, marginTop: 8 }}>System health</div>
      <div className="card">
        <table className="table">
          <thead>
            <tr><th>Service</th><th>Status</th><th>Details</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Database</td>
              <td><StatusBadge service={health.database} /></td>
              <td style={{ fontSize: 12, opacity: 0.7 }}>
                {health.database.status === 'up'
                  ? `${formatLatency(health.database.latency_ms)} — single SELECT 1 round trip`
                  : 'no latency to report — the probe did not complete'}
              </td>
            </tr>
            <tr>
              <td>PDF engine</td>
              <td><StatusBadge service={health.pdf_engine} /></td>
              <td style={{ fontSize: 12, opacity: 0.7 }}>
                {health.pdf_engine.error
                  ? health.pdf_engine.error
                  : `${health.pdf_engine.primary} — render probe passed`}
              </td>
            </tr>
            <tr>
              <td>SiteX API</td>
              <td><StatusBadge service={health.sitex} /></td>
              <td style={{ fontSize: 12, opacity: 0.7 }}>{health.sitex.note || '—'}</td>
            </tr>
            <tr>
              <td>Stripe</td>
              <td><StatusBadge service={health.stripe} /></td>
              <td style={{ fontSize: 12, opacity: 0.7 }}>Payments &amp; subscriptions</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDeedType(type: string): string {
  return type.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
