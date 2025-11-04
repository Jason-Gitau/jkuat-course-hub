import React from 'react'

export const useSupabase = jest.fn(() => ({
  supabase: jest.fn(),
}))

export const SupabaseProvider = ({ children }) => {
  return <>{children}</>
}

export default {
  useSupabase,
  SupabaseProvider,
}
