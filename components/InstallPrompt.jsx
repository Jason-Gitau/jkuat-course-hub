'use client'

import { useEffect, useState } from 'react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [hasShownThisSession, setHasShownThisSession] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check if already shown this session (prevents multiple shows on navigation/refresh)
    const shownThisSession = sessionStorage.getItem('pwa-prompt-shown')
    if (shownThisSession) {
      console.log('[PWA] Prompt already shown this session, skipping')
      return
    }

    // Check dismissal count - stop showing after 3 dismissals
    const dismissCount = parseInt(localStorage.getItem('pwa-dismiss-count') || '0')
    if (dismissCount >= 3) {
      console.log('[PWA] User has dismissed 3+ times, not showing again')
      return
    }

    // Check if user has already dismissed the prompt recently
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed)
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24)

      // Adjust wait period based on dismissal count
      let waitDays = 7 // Default: 7 days
      if (dismissCount === 1) waitDays = 30 // After 1st dismissal: 30 days
      if (dismissCount >= 2) waitDays = 90 // After 2nd dismissal: 90 days

      if (daysSinceDismissed < waitDays) {
        console.log(`[PWA] Dismissed ${Math.floor(daysSinceDismissed)} days ago, waiting ${waitDays} days (dismissal #${dismissCount})`)
        return
      }
    }

    // Prevent showing if already shown this session via state
    if (hasShownThisSession) {
      return
    }

    let timeoutId = null

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      console.log('[PWA] beforeinstallprompt event fired')

      // DON'T call preventDefault() - let browser show its native install button!
      // This allows the download icon to appear in the address bar on desktop

      // Stash the event so it can be triggered later
      setDeferredPrompt(e)

      // Show custom install prompt after 3 seconds
      timeoutId = setTimeout(() => {
        console.log('[PWA] Showing install prompt')
        setShowPrompt(true)
        setHasShownThisSession(true)

        // Mark as shown this session to prevent re-showing on navigation
        sessionStorage.setItem('pwa-prompt-shown', 'true')
      }, 3000)
    }

    // Detect if app was successfully installed
    const handleAppInstalled = () => {
      console.log('[PWA] App installed successfully')
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)

      // Clear dismissal tracking since user installed
      localStorage.removeItem('pwa-install-dismissed')
      localStorage.removeItem('pwa-dismiss-count')
      sessionStorage.removeItem('pwa-prompt-shown')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Cleanup function
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [hasShownThisSession])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return
    }

    console.log('[PWA] User clicked install button')

    // Show the install prompt
    deferredPrompt.prompt()

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('[PWA] User accepted the install prompt')
      setShowPrompt(false)
      setDeferredPrompt(null)

      // Clear dismissal tracking since user accepted
      localStorage.removeItem('pwa-install-dismissed')
      localStorage.removeItem('pwa-dismiss-count')
    } else {
      console.log('[PWA] User dismissed the native install prompt')
      handleDismiss()
    }
  }

  const handleDismiss = () => {
    console.log('[PWA] User dismissed the install prompt')

    setShowPrompt(false)

    // Increment dismissal count
    const dismissCount = parseInt(localStorage.getItem('pwa-dismiss-count') || '0')
    const newCount = dismissCount + 1
    localStorage.setItem('pwa-dismiss-count', newCount.toString())

    // Remember dismissal timestamp
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())

    // Mark session as shown (prevents re-showing this session)
    sessionStorage.setItem('pwa-prompt-shown', 'true')

    console.log(`[PWA] Dismissal #${newCount} recorded`)
  }

  // Don't show if not mounted yet, already installed, or prompt not available
  if (!mounted || isInstalled || !showPrompt || !deferredPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-2xl p-4 border border-blue-500">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-white/80 hover:text-white transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-start gap-4">
          {/* App Icon */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-2xl font-bold text-blue-600">JK</span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 pr-6">
            <h3 className="font-bold text-lg mb-1">
              Install JKUAT Course Hub
            </h3>
            <p className="text-sm text-blue-50 mb-3">
              Add to your home screen for offline access during strikes and faster loading!
            </p>

            {/* Benefits */}
            <div className="space-y-1 mb-4 text-xs text-blue-50">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Works offline</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Ultra-fast loading</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Less data usage</span>
              </div>
            </div>

            {/* Install button */}
            <button
              onClick={handleInstallClick}
              className="w-full bg-white text-blue-600 font-semibold py-2.5 px-4 rounded-lg hover:bg-blue-50 transition-colors shadow-lg"
            >
              Add to Home Screen
            </button>

            <button
              onClick={handleDismiss}
              className="w-full text-center text-sm text-blue-100 hover:text-white mt-2 py-1"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
