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
  /* HOME2 — the page title led with "AI-Enhanced", which is the risk
     word first for the audience this page is about to receive: title reps
     and referred escrow officers deciding whether a stranger's tool is
     safe to attach their name to. The product's own framing is that the
     software suggests and the officer decides; the title now says that. */
  title: "DeedPro — California deed preparation, confirmed by your officer",
  // RED-H1.1: "seamless integrations" and the SoftPro/Qualia keywords sold
  // title-software integrations that do not exist in this codebase in any
  // form — not a client, not a stub. "Trusted by 1,200+ escrow officers"
  // went with them: nothing in the product measures it.
  description: "California deed preparation for escrow and title professionals. Recorder-formatted PDFs, with every field confirmed before it prints.",
  keywords: "real estate, deed preparation, California deeds, grant deed, quitclaim deed, escrow, title",
  authors: [{ name: "DeedPro Team" }],
  openGraph: {
    /* HOME2 — this is what every shared link showed, and it contradicted
       the positioning of the page it linked to. "Transform deed creation
       with AI assistance" makes the software the actor; the page says the
       officer decides. A forwarded link is often the FIRST thing a title
       rep sees, and it was the one surface still selling the old story.
       The image is the deed hero already in `public/images` — the page
       previewed as text only, which for a forwarded link reads as a page
       nobody finished. */
    title: "DeedPro — California deed preparation, confirmed by your officer",
    description:
      "Recorder-formatted California deeds for escrow and title professionals. "
      + "The software suggests from county records; your officer confirms every field before it prints.",
    type: "website",
    images: [{ url: "/images/deed-hero.png", width: 1200, height: 630,
               alt: "A California grant deed prepared in DeedPro" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DeedPro — California deed preparation, confirmed by your officer",
    description:
      "The software suggests from county records; your officer confirms every field before it prints.",
    images: ["/images/deed-hero.png"],
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
        {/* HOME2 — THE GOOGLE MAPS SCRIPT WAS LOADED HERE, IN THE ROOT
            LAYOUT, on every page including the logged-out homepage.

            It is REDUNDANT, not merely misplaced: `useGoogleMaps` creates
            and appends its own script tag when `window.google` is absent,
            so every consumer — the builder's property section and the
            property search — already loads it on demand. Removing it here
            changes nothing about whether autocomplete works.

            What it does change is that a marketing page visited by someone
            who has not signed in stops making a third-party request and
            stops carrying the browser key in its HTML. The key is a
            `NEXT_PUBLIC_*` value and is therefore public by design — this
            is not a secret leaking — but a logged-out visitor should not
            be announced to Google to read a page about deeds. */}
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
