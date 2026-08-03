/**
 * Phase 12-2: Centralized Admin API Client
 * 
 * Typed API client for admin panel endpoints.
 * Handles authentication, error handling, and type safety.
 */

// ============================================================================
// TYPES
// ============================================================================

export type Paged<T> = { 
  items: T[]; 
  page: number; 
  limit: number; 
  total: number 
};

export type ApiKeyRow = {
  id: string;
  key_prefix: string;
  name: string;
  is_active: boolean;
  is_test: boolean;
  rate_limit_hour: number;
  rate_limit_day: number;
  created_at?: string;
  last_used_at?: string | null;
  deed_count?: number;
  request_count?: number;
};

export type ApiKeyListResponse = {
  api_keys: ApiKeyRow[];
  total: number;
  page: number;
  pages: number;
};

export type ApiKeyDetail = {
  api_key: ApiKeyRow & { created_by_email?: string };
  stats: {
    total_deeds?: number;
    completed_deeds?: number;
    total_requests?: number;
    error_requests?: number;
    avg_response_ms?: number | null;
  };
  recent_requests: Array<{
    endpoint: string;
    method: string;
    status_code: number;
    response_time_ms: number;
    created_at: string;
  }>;
};

/** The full key is returned exactly once, at creation. */
export type CreatedApiKey = {
  success: boolean;
  api_key: ApiKeyRow & { key: string };
  warning: string;
};

export type ApiKeyRequestRow = {
  id: number;
  company_name: string;
  business_type?: string | null;
  contact_name?: string | null;
  email: string;
  phone?: string | null;
  use_case?: string | null;
  expected_volume?: string | null;
  integration_timeline?: string | null;
  current_software?: string | null;
  additional_info?: string | null;
  status: 'new' | 'contacted' | 'approved' | 'declined';
  notified_at?: string | null;
  /** Set when the owner's notification email failed — the request is
   *  still here, which is the point of storing before sending. */
  notify_error?: string | null;
  created_at: string;
};

export type ActivityEvent = {
  type: 'user_signup' | 'deed_created' | string;
  user: string;
  timestamp: string | null;
  deed_id?: number;
};

export type StatSummary = {
  total_users: number;
  active_users: number;
  total_deeds: number;
  deeds_this_month?: number;
  /**
   * ADMIN1: /admin/dashboard has always computed a real 7-day signup +
   * deed feed and no frontend rendered it. It is the closest thing the
   * platform has to an activity timeline, and it was being thrown away.
   */
  recent_activity?: ActivityEvent[];
  /**
   * NOT RENDERED, and deliberately not typed as trustworthy: the
   * backend derives these from plan counts times hardcoded prices
   * (admin_inline.py), which contradicts the real Stripe figures on
   * /admin/revenue. Use the Revenue tab for money.
   */
  total_revenue?: number;
  monthly_revenue?: number;
};

export type UserRow = {
  id: number;
  email: string;
  full_name?: string;
  role?: string;
  plan?: string;
  created_at?: string;
  last_login?: string | null;
  is_active?: boolean;
  deed_count?: number;
};

export type DeedRow = {
  id: number;
  deed_type: string;
  status: string;
  property_address?: string;
  apn?: string;
  county?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: number;
  user_email?: string;
};

export type UserDetail = UserRow & {
  stripe_customer_id?: string;
  deeds?: DeedRow[];
  company_name?: string;
  phone?: string;
  state?: string;
  verified?: boolean;
  deed_stats?: { total: number; completed: number; drafts: number };
};

// Phase 23-B: Complete revenue data structure
export type RevenueSummary = {
  overview: {
    total_revenue_cents: number;
    monthly_revenue_cents: number;
    stripe_fees_cents: number;
    refunds_cents: number;
    net_monthly_revenue_cents: number;
  };
  monthly_breakdown: Array<{
    month: string;
    revenue_cents: number;
    revenue_dollars: number;
  }>;
  mrr_arr: {
    mrr_cents: number;
    mrr_dollars: number;
    arr_cents: number;
    arr_dollars: number;
  };
};

export type SystemMetric = {
  timestamp: string;
  api_calls: number;
  response_time_ms: number;
  error_rate: number;
  active_users?: number;
};

// ============================================================================
// HTTP CLIENT
// ============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

function authHeaders() {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('access_token') || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(init.headers || {})
    },
    cache: 'no-store'
  });
  if (!res.ok) {
    let detail = '';
    try { 
      const j = await res.json(); 
      detail = j.detail || j.error || JSON.stringify(j); 
    } catch {}
    throw new Error(`${res.status}: ${detail || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ============================================================================
// ADMIN API
// ============================================================================

export const AdminApi = {
  // Dashboard Stats
  getSummary: () => http<StatSummary>('/admin/dashboard'),

  // Users Management
  searchUsers: (page = 1, limit = 25, search = '') =>
    http<Paged<UserRow>>(`/admin/users/search?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`),
  
  getUser: (id: number) => http<UserDetail>(`/admin/users/${id}`),

  // Deeds Management — /admin/deeds/search is the real endpoint: honest
  // statuses (draft/completed/deleted) and a working status + user filter.
  // (Its predecessor /admin/deeds hardcoded every status to "completed".)
  searchDeeds: (page = 1, limit = 25, search = '', status = '', userId?: number) => {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) qs.set('search', search);
    if (status) qs.set('status', status);
    if (userId != null) qs.set('user_id', String(userId));
    return http<Paged<DeedRow>>(`/admin/deeds/search?${qs.toString()}`);
  },
  
  getDeed: (id: number) => http<DeedRow>(`/admin/deeds/${id}`),

  // Revenue Analytics
  getRevenue: () => http<RevenueSummary>('/admin/revenue'),

  // System Metrics
  getSystemMetrics: () => http<{ metrics: SystemMetric[] }>('/admin/system-metrics'),

  // CSV Exports
  exportUsersCsv: async (): Promise<Blob> => {
    const res = await fetch(`${API_BASE}/admin/export/users.csv`, { 
      headers: { ...authHeaders() } 
    });
    if (!res.ok) throw new Error('Export users CSV failed');
    return res.blob();
  },
  
  exportDeedsCsv: async (): Promise<Blob> => {
    const res = await fetch(`${API_BASE}/admin/export/deeds.csv`, { 
      headers: { ...authHeaders() } 
    });
    if (!res.ok) throw new Error('Export deeds CSV failed');
    return res.blob();
  },

  // Phase 12-3: User CRUD Operations
  updateUser: (id: number, updates: Partial<UserDetail>) =>
    http<{success: boolean; message: string}>(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    }),
  
  deleteUser: (id: number) =>
    http<{success: boolean; message: string}>(`/admin/users/${id}`, {
      method: 'DELETE'
    }),

  // A3: partner API keys. These endpoints existed on the main API since
  // the public-API work and no frontend had ever called them — the only
  // key UI talked to a separate, dormant service through a shared setup
  // secret, dropping the admin's own JWT. This goes through the same
  // authenticated client as every other admin call.
  listApiKeys: (page = 1, limit = 25) =>
    http<ApiKeyListResponse>(`/admin/api-keys?page=${page}&limit=${limit}`),

  getApiKey: (id: string) => http<ApiKeyDetail>(`/admin/api-keys/${id}`),

  createApiKey: (body: { name: string; is_test?: boolean; rate_limit_hour?: number; rate_limit_day?: number }) =>
    http<CreatedApiKey>('/admin/api-keys', { method: 'POST', body: JSON.stringify(body) }),

  updateApiKey: (id: string, updates: { name?: string; is_active?: boolean; rate_limit_hour?: number; rate_limit_day?: number }) =>
    http<{ success: boolean; api_key: ApiKeyRow }>(`/admin/api-keys/${id}`, {
      method: 'PATCH', body: JSON.stringify(updates)
    }),

  deactivateApiKey: (id: string) =>
    http<{ success: boolean; message: string }>(`/admin/api-keys/${id}`, { method: 'DELETE' }),

  // The inquiry queue behind manual key issuance.
  listApiKeyRequests: () =>
    http<{ items: ApiKeyRequestRow[]; total: number }>('/admin/api-key-requests'),

  updateApiKeyRequest: (id: number, status: ApiKeyRequestRow['status']) =>
    http<{ success: boolean }>(`/admin/api-key-requests/${id}`, {
      method: 'PATCH', body: JSON.stringify({ status })
    }),
};

/**
 * Deployment Log:
 * - Updated: October 9, 2025 at 9:20 PM PT
 * - Status: Production-ready with full type safety
 * - Endpoints: 8/9 working (Revenue & SystemMetrics TBD)
 */
