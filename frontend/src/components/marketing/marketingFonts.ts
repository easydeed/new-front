import localFont from 'next/font/local';

/** Self-hosted faces for the marketing pages. The root layout keeps
 *  Inter. These load only where a marketing page applies the variables. */

const sans = localFont({
  src: './fonts/IBMPlexSans-latin.woff2',
  weight: '400 700',
  display: 'swap',
  variable: '--font-mkt-sans',
  fallback: ['system-ui', 'sans-serif'],
});

const serif = localFont({
  src: './fonts/SourceSerif4-latin.woff2',
  weight: '400 600',
  display: 'swap',
  variable: '--font-mkt-serif',
  fallback: ['Georgia', 'serif'],
});

const mono = localFont({
  src: [
    { path: './fonts/IBMPlexMono-400-latin.woff2', weight: '400', style: 'normal' },
    { path: './fonts/IBMPlexMono-500-latin.woff2', weight: '500', style: 'normal' },
    { path: './fonts/IBMPlexMono-600-latin.woff2', weight: '600', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-mkt-mono',
  fallback: ['ui-monospace', 'monospace'],
});

export const mktFontVars = `${sans.variable} ${serif.variable} ${mono.variable}`;
