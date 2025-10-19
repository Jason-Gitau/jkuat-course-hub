'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Custom hook to get current authenticated user and their profile
 * Returns: { user, profile, loading, error, refreshProfile }
 *
 * Usage:
 * const { user, profile, loading } = useUser()
 * if (loading) return <div>Loading...</div>
 * if (!user) return <div>Please sign in</div>
 * return <div>Welcome, {profile.full_name}!</div>
 */
export function useUser() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const supabase = createClient()

  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          courses:course_id (
            id,
            course_name,
            description
          )
        `)
        .eq('id', userId)
        .single()

      if (profileError) {
        // Profile doesn't exist yet (new user)
        if (profileError.code === 'PGRST116') {
          setProfile(null)
          return null
        }
        throw profileError
      }

      setProfile(data)
      return data
    } catch (err) {
      console.error('Error fetching profile:', err)
      setError(err.message)
      return null
    }
  }, [supabase])

  const refreshProfile = async () => {
    if (user) {
      setLoading(true)
      await fetchProfile(user.id)
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true

    async function loadUser() {
      try {
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) throw sessionError

        if (mounted) {
          if (session?.user) {
            setUser(session.user)
            await fetchProfile(session.user.id)
          } else {
            setUser(null)
            setProfile(null)
          }
        }
      } catch (err) {
        console.error('Error loading user:', err)
        if (mounted) {
          setError(err.message)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadUser()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (mounted) {
        if (session?.user) {
          setUser(session.user)
          await fetchProfile(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile, supabase.auth])

  return {
    user,
    profile,
    loading,
    error,
    refreshProfile,
    isAuthenticated: !!user,
    hasProfile: !!profile,
    isAdmin: profile?.role === 'admin',
    isClassRep: profile?.role === 'class_rep' || profile?.role === 'admin'
  }
}

/**
 * Hook to sign out user
 */
export function useSignOut() {
  const supabase = createClient()

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  return { signOut }
}
