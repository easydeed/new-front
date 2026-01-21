/**
 * Phase 12-2: Admin Panel Feature Flags
 * 
 * Controls which admin features are visible/enabled.
 * Set to false until real backend endpoints are implemented.
 */

export const FEATURE_FLAGS = {
  // ========================================
  // ADMIN PANEL TABS (Phase 5 Overhaul)
  // ========================================
  REVENUE_TAB: true,           // ✅ Real Stripe data
  SYSTEM_TAB: true,            // ✅ Real PDF engine stats
  VERIFICATION_TAB: true,      // ✅ NEW: Document authenticity / QR verification
  DEED_ACTIONS: true,          // ✅ NEW: View PDF, Delete deed
  PARTNERS_TAB: true,          // ✅ ENABLED: Public API v1 launched
  
  // ========================================
  // ADMIN FEATURES
  // ========================================
  EXPORTS: true,               // ✅ CSV exports work
  QUICK_ACTIONS: true,         // ✅ CSV exports in Overview
  
  // Future features (hide until implemented)
  API_MONITORING: false,       // Hide until real endpoint exists
  INTEGRATIONS: false,         // Hide until real endpoint exists
  AUDIT_LOGS: false,           // Hide until audit log API exists
  
  // ========================================
  // V0 UI FACELIFT (Phase 24)
  // ========================================
  NEW_LANDING_PAGE: false,     // ✅ Phase 24-A: V0-generated landing page (deployed!)
  NEW_AUTH_PAGES: false,       // 🚧 Phase 24-B: V0 auth flow (Login, Register, Forgot, Reset)
  NEW_DASHBOARD: false,        // 🚧 Phase 24-B: V0-generated dashboard
  NEW_WIZARD_MODERN: false,    // 🚧 Phase 24-C: V0 wizard components (Modern)
  NEW_WIZARD_CLASSIC: false,   // 🚧 Phase 24-C: V0 wizard components (Classic)
} as const;

/**
 * Deployment Log:
 * - Created: October 9, 2025 at 9:15 PM PT
 * - Phase 23-B Deployed: October 30, 2025 at 9:15 PM PST
 * - Phase 24-A Deployed: October 31, 2025 at 9:30 AM PST (Landing page)
 * - Phase 24-B Started: October 31, 2025 at 10:15 AM PST (Auth + Dashboard)
 * - Status: All flags OFF by default (incremental rollout)
 * - Working: EXPORTS, QUICK_ACTIONS, REVENUE_TAB
 * - Next: Phase 24-B deployment (NEW_AUTH_PAGES, NEW_DASHBOARD)
 */

