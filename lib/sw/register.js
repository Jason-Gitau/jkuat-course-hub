/**
 * Service Worker Registration
 * Handles PWA installation and updates
 *
 * NOTE: next-pwa already handles dev/prod environment switching,
 * so we don't need to check process.env here (it doesn't work in browser anyway!)
 */

export function registerServiceWorker() {
  // Check if we're in browser and SW is supported
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('⚠️ Service Workers not supported in this environment');
    return;
  }

  // Register service worker after page load
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('✅ Service Worker registered successfully!');
      console.log('   Scope:', registration.scope);
      console.log('   State:', registration.active?.state || 'installing');

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available
            console.log('🔄 New app version available! Refresh to update.');

            // Optionally show update prompt to user
            if (window.confirm('New version available! Reload to update?')) {
              window.location.reload();
            }
          }
        });
      });

      // Check for updates periodically (every hour)
      setInterval(() => {
        console.log('🔄 Checking for Service Worker updates...');
        registration.update();
      }, 60 * 60 * 1000);
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      console.error('   Error details:', error.message);
      console.error('   Make sure you are running in production mode (npm run build && npm run start)');
    }
  });

  // Listen for controller change (new SW activated)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('🔄 New Service Worker activated');
  });

  // Listen for messages from SW
  navigator.serviceWorker.addEventListener('message', (event) => {
    console.log('📨 Message from SW:', event.data);

    if (event.data && event.data.type === 'CACHE_UPDATED') {
      console.log('💾 Cache updated:', event.data.url);
    }
  });
}

/**
 * Unregister service worker (for debugging)
 */
export async function unregisterServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
    console.log('✅ Service Worker unregistered');
    return true;
  } catch (error) {
    console.error('❌ Failed to unregister Service Worker:', error);
    return false;
  }
}

/**
 * Check if app is running in standalone mode (installed as PWA)
 */
export function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

/**
 * Check if service worker is active
 */
export function isServiceWorkerActive() {
  return navigator.serviceWorker && navigator.serviceWorker.controller;
}
