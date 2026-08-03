'use client';
/**
 * A3 — partner API administration.
 *
 * The backend key CRUD has existed since the public-API work and no
 * frontend had ever called it. The only key UI in the app talked to a
 * separate dormant service through a shared setup secret, dropping the
 * admin's own JWT, and it was unreachable from the admin nav anyway.
 * This tab uses the same authenticated client as every other admin
 * screen.
 *
 * Key issuance is manual by ruling — every partner is a conversation at
 * this stage — so the inquiry queue sits beside the keys, and the mint
 * button lives here rather than at the end of a self-serve funnel.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  AdminApi,
  type ApiKeyRequestRow,
  type ApiKeyRow,
  type CreatedApiKey,
} from '@/lib/adminApi';
import Badge from './Badge';
import StatCard from './StatCard';

function fmtDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

export default function ApiTab() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [requests, setRequests] = useState<ApiKeyRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showMint, setShowMint] = useState(false);
  const [mintName, setMintName] = useState('');
  const [mintTest, setMintTest] = useState(false);
  const [minting, setMinting] = useState(false);
  const [minted, setMinted] = useState<CreatedApiKey['api_key'] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [keyRes, reqRes] = await Promise.all([
        AdminApi.listApiKeys(),
        AdminApi.listApiKeyRequests().catch(() => ({ items: [], total: 0 })),
      ]);
      setKeys(keyRes.api_keys || []);
      setRequests(reqRes.items || []);
    } catch (e) {
      // Loud, not an empty state pretending to be "no keys yet".
      setError(e instanceof Error ? e.message : 'Failed to load API data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleMint() {
    if (!mintName.trim()) return;
    setMinting(true);
    setError('');
    try {
      const res = await AdminApi.createApiKey({
        name: mintName.trim(),
        is_test: mintTest,
      });
      setMinted(res.api_key);
      setMintName('');
      setMintTest(false);
      setShowMint(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create key');
    } finally {
      setMinting(false);
    }
  }

  async function handleDeactivate(key: ApiKeyRow) {
    if (!confirm(`Deactivate "${key.name}" (${key.key_prefix})? Calls using it will stop working immediately.`)) return;
    try {
      await AdminApi.deactivateApiKey(key.id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to deactivate key');
    }
  }

  async function handleRequestStatus(row: ApiKeyRequestRow, status: ApiKeyRequestRow['status']) {
    try {
      await AdminApi.updateApiKeyRequest(row.id, status);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update request');
    }
  }

  if (loading) {
    return (
      <div className="vstack">
        <div className="grid stats">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card skeleton" style={{ height: 92 }} />
          ))}
        </div>
        <div className="card skeleton" style={{ height: 280 }} />
      </div>
    );
  }

  const active = keys.filter((k) => k.is_active);
  const totalRequests = keys.reduce((sum, k) => sum + (k.request_count || 0), 0);
  const totalDeeds = keys.reduce((sum, k) => sum + (k.deed_count || 0), 0);
  const newRequests = requests.filter((r) => r.status === 'new');

  return (
    <div className="vstack">
      <div className="grid stats">
        <StatCard title="Active Keys" value={active.length} />
        <StatCard title="Deeds via API" value={totalDeeds} />
        <StatCard title="API Requests" value={totalRequests} />
        <StatCard title="Open Inquiries" value={newRequests.length} />
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--dp-danger)', color: 'var(--dp-danger)' }}>
          {error}
        </div>
      )}

      {/* The full key is displayed exactly once — it is bcrypt-hashed at
          rest and cannot be recovered afterward. */}
      {minted && (
        <div className="card" style={{ borderColor: 'var(--dp-brand, #7C4DFF)' }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            Copy this key now — it cannot be shown again
          </div>
          <code
            style={{
              display: 'block', padding: '12px 14px', background: 'var(--dp-surface-2, #f7f8fa)',
              borderRadius: 8, wordBreak: 'break-all', fontSize: 14, marginBottom: 12,
            }}
          >
            {minted.key}
          </code>
          <div className="hstack" style={{ gap: 8 }}>
            <button className="btn" onClick={() => navigator.clipboard?.writeText(minted.key)}>
              Copy
            </button>
            <button className="btn" onClick={() => setMinted(null)}>
              I&apos;ve saved it
            </button>
          </div>
        </div>
      )}

      {/* Keys */}
      <div className="card">
        <div className="hstack" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Partner API keys</div>
          <button className="btn" onClick={() => setShowMint((v) => !v)}>
            {showMint ? 'Cancel' : 'Create key'}
          </button>
        </div>

        {showMint && (
          <div className="vstack" style={{ gap: 10, marginBottom: 16 }}>
            <input
              className="input"
              placeholder="Who is this key for? (e.g. Pacific Coast Escrow)"
              value={mintName}
              onChange={(e) => setMintName(e.target.value)}
            />
            <label className="hstack" style={{ gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={mintTest} onChange={(e) => setMintTest(e.target.checked)} />
              <span>Test key (dp_test_ prefix)</span>
            </label>
            <button className="btn" onClick={handleMint} disabled={minting || !mintName.trim()}>
              {minting ? 'Creating…' : 'Create key'}
            </button>
          </div>
        )}

        {keys.length === 0 ? (
          <div style={{ color: 'var(--dp-muted, #8a94a0)' }}>
            No API keys yet. Keys are issued manually — create one after you&apos;ve
            talked with the partner.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th><th>Prefix</th><th>Status</th><th>Limits</th>
                  <th>Deeds</th><th>Requests</th><th>Last used</th><th></th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id}>
                    <td>{k.name}</td>
                    <td><code style={{ fontSize: 13 }}>{k.key_prefix}…</code></td>
                    <td>
                      <Badge kind={k.is_active ? 'success' : 'neutral'}>
                        {k.is_active ? 'Active' : 'Deactivated'}
                      </Badge>
                      {k.is_test && <Badge kind="neutral">Test</Badge>}
                    </td>
                    <td>{k.rate_limit_hour}/hr · {k.rate_limit_day}/day</td>
                    <td>{k.deed_count ?? 0}</td>
                    <td>{k.request_count ?? 0}</td>
                    <td>{fmtDate(k.last_used_at)}</td>
                    <td>
                      {k.is_active && (
                        <button className="btn" onClick={() => handleDeactivate(k)}>
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inquiries */}
      <div className="card">
        <div className="hstack" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>API access inquiries</div>
          <Badge kind="neutral">{requests.length} total</Badge>
        </div>

        {requests.length === 0 ? (
          <div style={{ color: 'var(--dp-muted, #8a94a0)' }}>
            No inquiries yet. Submissions from the API access form land here.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Company</th><th>Contact</th><th>Type</th><th>Volume</th>
                  <th>Received</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.company_name}
                      {r.notify_error && (
                        // The request survived an email failure — say so,
                        // rather than letting it look like it never came.
                        <div style={{ fontSize: 12, color: 'var(--dp-warn, #b26a00)' }}>
                          notification email failed — {r.notify_error}
                        </div>
                      )}
                    </td>
                    <td>{r.email}</td>
                    <td>{r.business_type || '—'}</td>
                    <td>{r.expected_volume || '—'}</td>
                    <td>{fmtDate(r.created_at)}</td>
                    <td><Badge kind={r.status === 'new' ? 'warn' : 'neutral'}>{r.status}</Badge></td>
                    <td>
                      <select
                        className="input"
                        value={r.status}
                        onChange={(e) => handleRequestStatus(r, e.target.value as ApiKeyRequestRow['status'])}
                      >
                        <option value="new">new</option>
                        <option value="contacted">contacted</option>
                        <option value="approved">approved</option>
                        <option value="declined">declined</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
