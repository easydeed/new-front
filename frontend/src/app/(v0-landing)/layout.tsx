import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./landing-v2/globals.css"; // V0's clean CSS (vibrancy-boost now scoped out!)

const inter = Inter({ 
  subsets: ["latin"],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-inter'
});

export const metadata: Metadata = {
  title: "DeedPro - Create California Deeds in Minutes",
  description: "AI-powered deed generation for escrow officers. Create compliant California deeds in minutes with SmartReview validation and seamless integrations.",
};

/**
 * ISOLATED V0 LANDING LAYOUT
 * 
 * This layout completely isolates the V0 landing page from the main app's CSS.
 * 
 * Route Groups in Next.js 15:
 * - Folders with parentheses like (v0-landing) don't affect the URL
 * - They can have their own layout that replaces the root layout
 * - This prevents CSS cascade from parent layouts
 * 
 * Result: /landing-v2 URL works, but uses THIS layout instead of src/app/layout.tsx
 */
export default function V0LandingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body 
        data-v0-page 
        className={`${inter.className} ${inter.variable} font-sans antialiased`} 
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}

