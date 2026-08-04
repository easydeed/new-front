import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
// Phase 24-A: vibrancy-boost.css DELETED - V0 design system taking over
// V0 provides all styling via route group layouts (see (v0-landing)/layout.tsx)
import { Toaster } from 'sonner'; // UI Polish: Toast notifications
import { ToastRouteDismiss } from '@/components/ToastRouteDismiss';

const inter = Inter({ 
  subsets: ["latin"],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter'
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
