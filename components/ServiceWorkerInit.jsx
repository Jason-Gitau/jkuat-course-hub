'use client'

import { useEffect } from 'react'
import { registerServiceWorker } from '@/lib/sw/register'

/**
 * Service Worker Initialization Component
 * - Registers service worker for PWA functionality
 * - NO automatic background sync (switched to online-first strategy)
 *
 * Note: Background sync removed because:
 * - Online-first hooks now fetch fresh data directly from Supabase
 * - No need to pre-populate IndexedDB cache
 * - Reduces unnecessary API calls on every app load
 */
export default function ServiceWorkerInit() {
  useEffect(() => {
    // Register service worker (only in production)
    registerServiceWorker()

    // Log app initialization
    if (navigator.onLine) {
      console.log('🌐 App loaded online - will fetch fresh data on page visits')
    } else {
      console.log('📴 App loaded offline - will use cached data where available')
    }
  }, [])

  // This component doesn't render anything
  return null
}
