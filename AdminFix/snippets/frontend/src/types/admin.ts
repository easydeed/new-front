export interface AdminDashboardStats {
  total_users: number;
  active_users: number;
  total_deeds: number;
  deeds_this_month: number;
  total_revenue?: number;
  monthly_revenue?: number;
}

export interface AdminUserRow {
  id: number;
  email: string;
  full_name: string;
  role: string;
  plan: string;
  last_login?: string | null;
  created_at: string;
  is_active: boolean;
  deed_count: number;
}

export interface AdminUserDetail extends AdminUserRow {
  company_name?: string | null;
  company_type?: string | null;
  phone?: string | null;
  state?: string | null;
  verified?: boolean;
  stripe_customer_id?: string | null;
  deed_stats?: { total: number; completed: number; drafts: number };
}

export interface AdminDeedRow {
  id: number;
  deed_type: string;
  status: string;
  property_address?: string | null;
  apn?: string | null;
  county?: string | null;
  created_at: string;
  updated_at?: string | null;
  user_email?: string | null;
}

export interface AdminDeedDetail extends AdminDeedRow {
  grantors?: string | null;
  grantees?: string | null;
  pdf_url?: string | null;
  metadata?: any;
}

export interface Paged<T> {
  page: number;
  limit: number;
  total: number;
  [key: string]: any;
  data?: T[]; // graceful
}
