'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) {
    // If back online, redirect to home
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Offline Icon */}
        <div className="mb-6">
          <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto flex items-center justify-center">
            <svg
              className="w-10 h-10 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          You're Offline
        </h1>

        {/* Description */}
        <p className="text-gray-600 mb-6">
          It looks like you've lost your internet connection. Don't worry - you can still access cached content!
        </p>

        {/* What You Can Do */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
          <h2 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <span>💡</span>
            What you can do offline:
          </h2>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• View previously loaded courses</li>
            <li>• Access cached materials</li>
            <li>• Browse downloaded content</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href="/courses"
            className="block w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            View Cached Courses
          </Link>

          <Link
            href="/"
            className="block w-full bg-white border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Go to Home
          </Link>

          <button
            onClick={() => window.location.reload()}
            className="block w-full text-blue-600 hover:text-blue-700 text-sm font-medium py-2"
          >
            Try to reconnect
          </button>
        </div>

        {/* Network Status */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            {isOnline ? (
              <span className="text-green-600 font-medium">✓ Connected</span>
            ) : (
              <span className="text-red-600 font-medium">✗ No connection</span>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
