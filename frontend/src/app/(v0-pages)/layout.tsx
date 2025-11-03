/**
 * V0 Pages Isolated Layout
 * 
 * This layout isolates V0-generated pages from global CSS cascade.
 * Per Phase 24-A lessons learned: Route groups prevent CSS pollution.
 * 
 * See: docs/V0_INTEGRATION_LESSONS_LEARNED.md
 */

export default function V0PagesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>;
}

