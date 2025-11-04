'use client'

import { createContext, useContext } from 'react'
import { createClient } from '@/lib/supabase/client'

const SupabaseContext = createContext({
  supabase: null,
})

export function SupabaseProvider({ children }) {
  const supabase = createClient()

  const value = {
    supabase,
  }

  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>
}

// Hook to use the supabase context
export function useSupabase() {
  const context = useContext(SupabaseContext)
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return context
}
