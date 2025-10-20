'use client'

import { useState, useEffect } from 'react'
import { getLastSyncTime, STORES } from '@/lib/db/indexedDB'
import { syncAll } from '@/lib/db/syncManager'

/**
 * Sync Status Component
 * Shows when data was last synced and provides manual refresh
 */
export default function SyncStatus({ userId }) {
  const [lastSync, setLastSync] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Load last sync time
    async function loadSyncTime() {
      const coursesSync = await getLastSyncTime(STORES.COURSES)
      const materialsSync = await getLastSyncTime(STORES.MATERIALS)

      // Use the most recent sync time
      const mostRecent = Math.max(coursesSync || 0, materialsSync || 0)
      setLastSync(mostRecent || null)
    }

    loadSyncTime()

    // Monitor online/offline status
    const updateOnlineStatus = () => setIsOnline(navigator.onLine)
    updateOnlineStatus()

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  const handleManualSync = async () => {
    if (!isOnline || syncing) return

    setSyncing(true)
    console.log('🔄 Manual sync triggered...')

    try {
      const result = await syncAll(userId)

      if (result.success) {
        setLastSync(Date.now())
        console.log('✅ Manual sync completed')
      } else {
        console.error('❌ Manual sync failed:', result.results)
        alert('Sync failed. Please try again.')
      }
    } catch (error) {
      console.error('❌ Sync error:', error)
      alert('Sync failed. Please try again.')
    } finally {
      setSyncing(false)
    }
  }

  const formatSyncTime = (timestamp) => {
    if (!timestamp) return 'Never'

    const now = Date.now()
    const diff = now - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (seconds < 60) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      {/* Online/Offline Indicator */}
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-gray-600">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Last Sync Time */}
      {lastSync && (
        <div className="text-gray-500">
          Last synced: {formatSyncTime(lastSync)}
        </div>
      )}

      {/* Manual Sync Button */}
      <button
        onClick={handleManualSync}
        disabled={!isOnline || syncing}
        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
          !isOnline || syncing
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
        }`}
        title={!isOnline ? 'Cannot sync while offline' : 'Refresh data from server'}
      >
        {syncing ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Syncing...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </span>
        )}
      </button>
    </div>
  )
}
