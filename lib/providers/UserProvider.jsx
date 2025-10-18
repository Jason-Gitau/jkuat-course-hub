'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const UserContext = createContext({
  user: null,
  profile: null,
  loading: true,
  error: null,
  refreshProfile: () => {},
  isAuthenticated: false,
  hasProfile: false,
  isAdmin: false,
  isClassRep: false,
})

export function UserProvider({ children }) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Fetch user session (fast, from local storage)
  useEffect(() => {
    async function getSession() {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setAuthLoading(false)
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      // Invalidate profile query when auth state changes
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    })

    return () => subscription.unsubscribe()
  }, [supabase, queryClient])

  // Fetch profile with React Query (cached, only when user exists)
  const { data: profile, error, isLoading: profileLoading, refetch } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          courses:course_id (
            id,
            course_name,
            department,
            description
          )
        `)
        .eq('id', user.id)
        .single()

      if (error) {
        // Profile doesn't exist yet (new user)
        if (error.code === 'PGRST116') {
          return null
        }
        throw error
      }

      return data
    },
    enabled: !!user && !authLoading, // Only fetch if user exists
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  })

  const refreshProfile = () => {
    refetch()
  }

  const loading = authLoading || (!!user && profileLoading)

  const value = {
    user,
    profile: profile ?? null,
    loading,
    error: error?.message ?? null,
    refreshProfile,
    isAuthenticated: !!user,
    hasProfile: !!profile,
    isAdmin: profile?.role === 'admin',
    isClassRep: profile?.role === 'class_rep' || profile?.role === 'admin',
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

// Hook to use the user context
export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}

// Hook to sign out
export function useSignOut() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
      throw error
    }
    // Clear all queries on sign out
    queryClient.clear()
  }

  return { signOut }
}
