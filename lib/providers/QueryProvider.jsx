'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time: How long data is considered fresh (5 minutes for metadata)
            staleTime: 5 * 60 * 1000, // 5 minutes - prevents excessive refetching
            // Cache time: How long unused data stays in cache
            gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
            // Refetch on window focus
            refetchOnWindowFocus: false, // Don't refetch on tab switch
            // Refetch when reconnecting
            refetchOnReconnect: true, // Refetch when coming back online
            // Retry failed requests
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
