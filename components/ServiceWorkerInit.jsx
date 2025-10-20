'use client'

import { useEffect } from 'react'
import { registerServiceWorker } from '@/lib/sw/register'
import { syncAll } from '@/lib/db/syncManager'

/**
 * Service Worker Initialization Component
 * - Registers service worker for PWA functionality
 * - Triggers background sync on app load
 */
export default function ServiceWorkerInit() {
  useEffect(() => {
    // Register service worker (only in production)
    registerServiceWorker()

    // Background sync on app load (only if online)
    if (navigator.onLine) {
      console.log('🔄 Starting background sync on app load...')

      // Delay slightly to not block initial render
      setTimeout(async () => {
        try {
          // Get user ID if logged in
          const { createClient } = await import('@/lib/supabase/client')
          const supabase = createClient()
          const { data: { user } } = await supabase.auth.getUser()

          const result = await syncAll(user?.id)

          if (result.success) {
            console.log('✅ Background sync completed')
          } else {
            console.warn('⚠️ Background sync had errors:', result.results)
          }
        } catch (error) {
          console.error('❌ Background sync failed:', error)
        }
      }, 1000) // 1 second delay
    } else {
      console.log('📴 App loaded offline - using cached data')
    }
  }, [])

  // This component doesn't render anything
  return null
}
