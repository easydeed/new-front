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
  '/create-deed',
  '/past-deeds',
  '/shared-deeds',
  '/account-settings',
  '/admin',
  '/admin-honest',  // AdminFix: explicit route for admin honesty pass
  '/team',
  '/voice',
  '/mobile',
  '/security',
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
    loginUrl.searchParams.set('redirect', pathname)
    
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
