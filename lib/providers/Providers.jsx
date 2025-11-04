'use client'

import { QueryProvider } from '@/lib/providers/QueryProvider'
import { SupabaseProvider } from '@/lib/providers/SupabaseProvider'
import { UserProvider } from '@/lib/providers/UserProvider'

export function Providers({ children }) {
  return (
    <QueryProvider>
      <SupabaseProvider>
        <UserProvider>
          {children}
        </UserProvider>
      </SupabaseProvider>
    </QueryProvider>
  )
}
