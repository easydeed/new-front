import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Helper function to validate if token is from our DeedPro API
function isDeedProToken(token: string): boolean {
  try {
    // Decode the JWT payload (basic validation)
    const payload = JSON.parse(atob(token.split('.')[1]))
    
    // Check if it has the structure of our DeedPro tokens
    // Our tokens have 'sub' as user ID (number as string) and 'email' field
    return (
      payload.sub &&
      payload.email &&
      payload.exp &&
      !payload.username && // Exclude SSO tokens
      !payload.ownerId    // Exclude Vercel tokens
    )
  } catch {
    return false
  }
}

// Define protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/onboarding',
  '/deed-builder',
  '/past-deeds',
  '/shared-deeds',
  '/account-settings',
  '/admin',
  // DARK1: '/team' is gone, on the same reasoning as '/security' below.
  // HX0 fixed its AUTH after the audit found it leaking; DARK1 asked
  // whether the page should exist and the answer was no — it advertised a
  // collaborative workspace and a Team tier that were never built. A guard
  // restricts an invention to signed-in users; deletion removes it.
  //
  // It stayed in THIS list after the page was deleted, which the pin in
  // `routeGuards.test.ts` caught: a protected-route table naming a route
  // that does not exist is a small lie about what the middleware guards.
  // RED-H1.1: '/security' is gone — the route was DELETED, not gutted.
  // It rendered entirely fabricated telemetry: invented login events with
  // invented IPs, an invented "Multiple rapid login attempts detected /
  // Automated Bot" incident, a fake IP whitelist, a fake last-scan
  // timestamp, and an audit-log toggle wired to nothing.
  //
  // That is not overstated copy. It is a fabricated INCIDENT REPORT —
  // a page telling an officer that an intrusion against their account was
  // detected and investigated, when no such detection exists. Removing
  // only its SOC2 badge would have left the invention behind and made it
  // read as more credible, not less.
  //
  // A security page returns when RED-S3 ships real session telemetry to
  // put on it. Until then the honest number of security pages is zero.
  '/api-key-request'
]

// Define public routes that should redirect if user is already logged in
const publicRoutes = [
  '/login',
  '/register',
  '/forgot-password'
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const url = request.nextUrl.clone()

  // Check if the current path is protected
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  )

  // Check if the current path is public
  const isPublicRoute = publicRoutes.some(route =>
    pathname.startsWith(route)
  )

  // Get token from the request (check both cookies and headers)
  const token = request.cookies.get('access_token')?.value ||
                request.headers.get('authorization')?.replace('Bearer ', '')

  // Check if user has a valid DeedPro token (must be from our API)
  const isAuthenticated = !!token && token.length > 20 && isDeedProToken(token)

  // Handle protected routes
  if (isProtectedRoute && !isAuthenticated) {
    // Save the attempted URL for redirect after login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', url.pathname + url.search)

    console.log(`🔒 Redirecting unauthenticated user from ${pathname} to login`)
    return NextResponse.redirect(loginUrl)
  }

  // Handle public routes when user is already authenticated
  if (isPublicRoute && isAuthenticated) {
    // Redirect to dashboard if user is already logged in
    const dashboardUrl = new URL('/dashboard', request.url)

    console.log(`✅ Redirecting authenticated user from ${pathname} to dashboard`)
    return NextResponse.redirect(dashboardUrl)
  }

  // Allow access to all other routes
  return NextResponse.next()
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)',
  ],
}
