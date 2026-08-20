/** @type {import('next').NextConfig} */
const nextConfig = {
  // Temporarily disabled rewrites to fix build issue
  // async rewrites() {
  //   return [
  //     {
  //       source: '/api/:path*',
  //       destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/:path*`,
  //     },
  //   ]
  // },
  // A4: /docs retires. It was ten cards linking to routes that were
  // never built — every link a 404, and the endpoints it advertised did
  // not match the real API. A permanent redirect inherits any bookmarks
  // and hands them the documentation that describes what exists.
  async redirects() {
    return [
      { source: '/docs', destination: '/developers', permanent: true },
      { source: '/docs/:path*', destination: '/developers', permanent: true },
    ]
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Optimize for production
  reactStrictMode: true,
  // Handle static assets
  assetPrefix: process.env.NODE_ENV === 'production' ? undefined : '',
  trailingSlash: false,
  // More lenient TypeScript checking for deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  /* ═══ ESLINT1 — READ THIS BEFORE TRUSTING THE LINE BELOW ═══
   *
   * `ignoreDuringBuilds: true` was set the day this file was created,
   * alongside `typescript.ignoreBuildErrors` and a commented-out rewrite
   * marked "temporarily disabled to fix build issue". It was never a
   * decision about linting; it was a deploy that needed to go out.
   *
   * It cost us a render crash. DASH3 declared two hooks after an early
   * return — first paint runs fewer hooks than the second and React tears
   * the component down — on the dashboard, the one screen every user
   * lands on. `react-hooks/rules-of-hooks` sees that exactly, is enabled
   * at error severity by `next/core-web-vitals`, and would have run here.
   *
   * THE LINTING IS NOT OPTIONAL ANY MORE. It moved to a blocking CI job
   * (`eslint-gate` in `.github/workflows/test.yml`, running
   * `scripts/eslint-gate.mjs`) which holds a frozen ceiling that only
   * goes down, pins the defect-catching rules at zero, and refuses the
   * three ways an eslint count can improve without anything improving.
   *
   * The flag stays HERE, for now, only because flipping it would fail
   * every build on 136 pre-existing violations — 104 of them
   * `no-explicit-any` — and a build that fails on old style debt is a
   * gate everyone re-disables. That is exactly how this line got written.
   * Remove it when the ceiling reaches zero errors; the gate is what
   * makes that a matter of time rather than of intent.
   */
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig 