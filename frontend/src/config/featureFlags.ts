/**
 * Phase 12-2: Admin Panel Feature Flags
 * 
 * Controls which admin features are visible/enabled.
 * Set to false until real backend endpoints are implemented.
 */

export const FEATURE_FLAGS = {
  // Phase 12-2: Working features (real endpoints exist)
  REVENUE_TAB: false,          // TODO: requires real /admin/revenue endpoint (currently mock data)
  SYSTEM_TAB: false,           // TODO: requires /admin/system-metrics endpoint
  EXPORTS: true,               // ✅ /admin/export/users.csv & /admin/export/deeds.csv exist (admin_api_v2.py)
  
  // Future features (hide until implemented)
  API_MONITORING: false,       // Hide until real endpoint exists
  INTEGRATIONS: false,         // Hide until real endpoint exists
  AUDIT_LOGS: false,           // Hide until audit log API exists
  
  // Quick actions (only wired to real endpoints)
  QUICK_ACTIONS: true          // ✅ CSV exports work
} as const;

/**
 * Deployment Log:
 * - Created: October 9, 2025 at 9:15 PM PT
 * - Status: EXPORTS and QUICK_ACTIONS enabled (real endpoints exist)
 * - Next: Enable REVENUE_TAB and SYSTEM_TAB when backend endpoints are ready
 */

