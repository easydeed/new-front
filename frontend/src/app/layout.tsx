import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "../styles/wizardModern.css"; // Phase 15 v5: Modern wizard styles

const inter = Inter({ 
  subsets: ["latin"],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter'
});

export const metadata: Metadata = {
  title: "DeedPro - AI-Enhanced Real Estate Deed Platform",
  description: "Transform deed creation with AI assistance, seamless integrations, and enterprise API. Trusted by 1,200+ escrow officers.",
  keywords: "real estate, deed creation, AI assistance, SoftPro, Qualia, API integration",
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
      </body>
    </html>
  );
}
