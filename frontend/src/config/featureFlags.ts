/**
 * Phase 12-2: Admin Panel Feature Flags
 * 
 * Controls which admin features are visible/enabled.
 * Set to false until real backend endpoints are implemented.
 */

export const FEATURE_FLAGS = {
  // Phase 12-2 + Phase 23-B: Working features (real endpoints exist)
  REVENUE_TAB: true,           // ✅ Phase 23-B: Real /admin/revenue endpoint deployed (complete billing system)
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
 * - Phase 23-B Deployed: October 30, 2025 at 9:15 PM PST
 * - Status: REVENUE_TAB now enabled (complete billing system deployed)
 * - Working: EXPORTS, QUICK_ACTIONS, REVENUE_TAB
 * - Next: Enable SYSTEM_TAB when /admin/system-metrics endpoint is ready
 */

