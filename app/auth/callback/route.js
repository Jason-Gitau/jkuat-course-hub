import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    try {
      // Exchange code for session
      const { data: { session }, error: authError } = await supabase.auth.exchangeCodeForSession(code)

      if (authError) {
        console.error('Auth callback error:', authError)
        return NextResponse.redirect(new URL('/auth/login?error=auth_failed', requestUrl.origin))
      }

      if (session?.user) {
        // Check if user has completed onboarding
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, onboarding_completed')
          .eq('id', session.user.id)
          .single()

        // If no profile exists or onboarding not completed, redirect to onboarding
        if (!profile || profileError?.code === 'PGRST116' || !profile.onboarding_completed) {
          return NextResponse.redirect(new URL('/auth/onboarding', requestUrl.origin))
        }

        // Redirect to home after successful login
        return NextResponse.redirect(new URL('/', requestUrl.origin))
      }
    } catch (error) {
      console.error('Unexpected error in auth callback:', error)
      return NextResponse.redirect(new URL('/auth/login?error=unexpected', requestUrl.origin))
    }
  }

  // No code provided, redirect to login
  return NextResponse.redirect(new URL('/auth/login', requestUrl.origin))
}
