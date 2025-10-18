import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Optimize: Only check auth for routes that need it
  const isAuthPage = request.nextUrl.pathname.startsWith('/auth')
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith('/upload') ||
    request.nextUrl.pathname.startsWith('/admin') ||
    request.nextUrl.pathname.startsWith('/profile')

  const needsAuthCheck = isAuthPage || isProtectedRoute

  // Skip auth check for public pages (courses, home, etc.)
  if (!needsAuthCheck) {
    return response
  }

  // Only call getUser when necessary
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect authenticated users away from auth pages (except onboarding)
  if (isAuthPage && user && request.nextUrl.pathname !== '/auth/onboarding') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Protect routes that require authentication
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/auth/login', request.url)
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Optimize: Only check profile for authenticated users on protected routes
  // Profile check is now done client-side in UserProvider for better caching
  // Only check here if accessing protected routes to force onboarding
  if (user && isProtectedRoute && request.nextUrl.pathname !== '/auth/onboarding') {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    // If no profile exists, redirect to onboarding
    if (!profile || error?.code === 'PGRST116') {
      return NextResponse.redirect(new URL('/auth/onboarding', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
