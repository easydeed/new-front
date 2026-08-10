import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
// Phase 24-A: vibrancy-boost.css DELETED - V0 design system taking over
// V0 provides all styling via route group layouts (see (v0-landing)/layout.tsx)
import { Toaster } from 'sonner'; // UI Polish: Toast notifications
import { ToastRouteDismiss } from '@/components/ToastRouteDismiss';

/**
 * Inter, SELF-HOSTED. Was `next/font/google`, which fetches from
 * fonts.googleapis.com AT BUILD TIME.
 *
 * ═══ WHY THIS MATTERS MORE THAN A FLAKY BUILD ═══
 *
 * That fetch failed once in CI with `NextFontError: Failed to fetch
 * Inter from Google Fonts`, on a pull request that changed only backend
 * files. The re-run was green. The cost of leaving it is not the reruns:
 * **a gate that fails for reasons unrelated to the diff trains people to
 * re-run rather than read**, and that is how a real failure eventually
 * gets waved through.
 *
 * There is an honesty point too. A build that can fail because a
 * third-party CDN is unreachable is not hermetic, and the same build
 * produces the PDFs this product's customers record at a county.
 *
 * ═══ ONE FILE, FOUR WEIGHTS ═══
 *
 * Inter v20's latin subset is a VARIABLE font: Google serves the same
 * woff2 for 400, 500, 600 and 700, so `weight: '100 900'` below is the
 * file's real range rather than a widening of what we had. 47KB, latin
 * only, committed beside this file.
 *
 * BRAND2 already did this for Plus Jakarta Sans (see
 * `components/brand/Logo.tsx`, pinned in brandLogo.test.tsx). Inter was
 * the only remaining build-time font fetch; there are now none.
 */
const inter = localFont({
  src: './fonts/Inter-latin-variable.woff2',
  weight: '100 900',
  display: 'swap',
  variable: '--font-inter',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
});

export const metadata: Metadata = {
  title: "DeedPro - AI-Enhanced Real Estate Deed Platform",
  // RED-H1.1: "seamless integrations" and the SoftPro/Qualia keywords sold
  // title-software integrations that do not exist in this codebase in any
  // form — not a client, not a stub. "Trusted by 1,200+ escrow officers"
  // went with them: nothing in the product measures it.
  description: "California deed preparation for escrow and title professionals. Recorder-formatted PDFs, with every field confirmed before it prints.",
  keywords: "real estate, deed preparation, California deeds, grant deed, quitclaim deed, escrow, title",
  authors: [{ name: "DeedPro Team" }],
  openGraph: {
    title: "DeedPro - AI-Enhanced Real Estate Deed Platform",
    description: "Transform deed creation with AI assistance and enterprise API",
    type: "website",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.className} ${inter.variable} font-inter antialiased`} suppressHydrationWarning>
        {children}
        {/* Google Maps API for address autocomplete */}
        {(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY) && (
          <Script
            src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY}&libraries=places`}
            strategy="beforeInteractive"
          />
        )}
        {/* U2.2: every toast is dismissable (closeButton) and none survives
            a route change (ToastRouteDismiss) — the immortal-toast fix. */}
        <ToastRouteDismiss />
        <Toaster
          position="top-right"
          closeButton
          toastOptions={{
            style: {
              background: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
            },
            className: 'shadow-lg',
          }}
        />
      </body>
    </html>
  );
}
