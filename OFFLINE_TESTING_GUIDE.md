# Complete Offline Testing Guide 🧪

**CRITICAL FIX APPLIED:** Service Worker now registers correctly!

---

## 🔧 What Was Fixed

### The Problem
The service worker registration was failing due to incorrect environment check:

```javascript
// ❌ BROKEN - process.env doesn't exist in browser!
if (process.env.NODE_ENV !== 'production') {
  return; // Never registered!
}
```

### The Solution
```javascript
// ✅ FIXED - Removed broken check
// next-pwa already handles dev/prod switching, so we don't need this!
export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', async () => {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  });
}
```

---

## 📋 Step-by-Step Testing Instructions

### Prerequisites
```bash
# 1. Build the app (PWA only works in production)
npm run build

# 2. Start production server
npm run start

# 3. Open browser
# Navigate to: http://localhost:3000
```

---

### Test 1: Verify Service Worker Registration ✅

**Steps:**
1. Open http://localhost:3000
2. Open DevTools (F12)
3. Go to **Console** tab
4. Look for these messages:

```
✅ Service Worker registered successfully!
   Scope: /
   State: activated
```

5. Go to **Application** tab → **Service Workers**
6. Should see:
   - Source: `/sw.js`
   - Status: **#1 activated and is running**
   - Scope: `/`

**Expected Result:** ✅ Service worker is registered and active

**If Failed:**
- Make sure you ran `npm run build` (not `npm run dev`)
- Check console for errors
- Try hard refresh (Ctrl+Shift+R)
- Clear cache and reload

---

### Test 2: Verify Caching is Working 📦

**Steps:**
1. With app loaded, go to **Application** tab
2. Navigate to **Cache Storage** (left sidebar)
3. Should see multiple caches:
   - ✅ `start-url`
   - ✅ `pages-cache`
   - ✅ `static-js-assets`
   - ✅ `static-style-assets`
   - ✅ `static-image-assets`
   - ✅ `others`
   - ✅ `workbox-precache-v2-...`

4. Click on **workbox-precache-v2-...**
5. Should see cached files:
   - `/` (home page)
   - `/_next/static/.../*.js` (JavaScript bundles)
   - `/_next/static/.../*.css` (Stylesheets)
   - `/offline` (offline fallback page)
   - `/manifest.json`
   - Icons, fonts, etc.

**Expected Result:** ✅ All static assets are cached

---

### Test 3: Verify IndexedDB is Populated 💾

**Steps:**
1. In **Application** tab, go to **IndexedDB** (left sidebar)
2. Expand **jkuat-course-hub** database
3. Should see stores:
   - ✅ `courses`
   - ✅ `materials`
   - ✅ `topics`
   - ✅ `userProfile`
   - ✅ `lastSync`
   - ✅ `fileCache`

4. Click on **courses** store
5. Should see course data if you've browsed courses

6. Check console for sync logs:
```
🔄 Starting background sync on app load...
🔄 Background syncing courses from Supabase...
✅ Courses synced successfully
```

**Expected Result:** ✅ Data is being synced to IndexedDB

---

### Test 4: Go Offline and Test Full Functionality 🔌

**This is the main test!**

#### Step 4a: Prepare for Offline
1. Navigate to `/courses` page
2. Click on a course to load materials
3. Verify materials loaded successfully
4. Check IndexedDB has data (see Test 3)

#### Step 4b: Go Offline
1. In DevTools, go to **Network** tab
2. Click dropdown that says "No throttling"
3. Select **"Offline"**
4. You should see a small red warning icon in DevTools

#### Step 4c: Test Navigation
1. **Refresh the page** (Ctrl+R or F5)
2. ✅ **Page should load instantly** (from service worker cache)
3. ✅ **App should look exactly the same**
4. Navigate to different pages:
   - `/` (home) - ✅ Should work
   - `/courses` - ✅ Should work
   - Click on a course - ✅ Should work
   - Materials should load - ✅ Should work from IndexedDB

#### Step 4d: Verify Offline Behavior
1. Check console - should see:
```
📴 App loaded offline - using cached data
```

2. Try to upload a file:
   - ❌ Should fail gracefully (needs internet)

3. Try AI chat:
   - ❌ Should fail gracefully (needs internet)

4. Browse cached materials:
   - ✅ Should work perfectly

#### Step 4e: Go Back Online
1. In **Network** tab, change "Offline" back to **"No throttling"**
2. Refresh page
3. ✅ Background sync should trigger:
```
🔄 Starting background sync on app load...
🔄 Background syncing courses from Supabase...
✅ Courses synced successfully
```

**Expected Result:** ✅ App works completely offline!

---

### Test 5: Test Offline Fallback Page 📄

**Steps:**
1. Make sure you're online first
2. Load http://localhost:3000
3. Go offline (Network → Offline)
4. Navigate to a page you **haven't visited yet**
   - Example: http://localhost:3000/some-random-page
5. ✅ Should see **"You're Offline"** page with:
   - Offline icon
   - Message explaining offline status
   - "View Cached Courses" button
   - "Go to Home" button
   - Network status indicator

**Expected Result:** ✅ Offline fallback page displays for uncached pages

---

### Test 6: Test Upload with IndexedDB Sync 📤

**Steps:**
1. Make sure you're **online**
2. Navigate to `/upload`
3. Upload a material:
   - Select course
   - Select unit
   - Choose file
   - Fill in title
   - Click Upload

4. Watch console for:
```
💾 Syncing uploaded material to IndexedDB...
✅ Material synced to IndexedDB
```

5. Navigate to the course page
6. ✅ **Your uploaded material should appear immediately**
7. No need to refresh!

**Expected Result:** ✅ Upload immediately syncs to IndexedDB

---

### Test 7: Test Manual Sync (Optional) 🔄

**If you added SyncStatus component:**

**Steps:**
1. Add `<SyncStatus userId={user?.id} />` to a page
2. Should see:
   - Green/Red dot (online/offline)
   - "Last synced: X minutes ago"
   - "Refresh" button

3. Click **Refresh** button
4. Should see "Syncing..." with spinner
5. Data refreshes from Supabase

**Expected Result:** ✅ Manual sync works

---

## 🎯 Quick Test Checklist

Use this for fast testing:

- [ ] App loads in production mode (`npm run build && npm run start`)
- [ ] Console shows "✅ Service Worker registered successfully!"
- [ ] Application → Service Workers shows "activated and running"
- [ ] Cache Storage has multiple caches
- [ ] IndexedDB has `jkuat-course-hub` database with data
- [ ] Can refresh page while offline - app still loads
- [ ] Can navigate pages offline
- [ ] Materials load from IndexedDB offline
- [ ] Offline fallback page shows for uncached pages
- [ ] Upload syncs to IndexedDB immediately
- [ ] Background sync runs on app load

---

## 🐛 Troubleshooting

### Service Worker Not Registering

**Symptoms:**
- Console shows no SW registration message
- Application → Service Workers is empty

**Solutions:**
1. ✅ Verify you're running `npm run start` (not `npm run dev`)
2. ✅ Check console for errors
3. ✅ Hard refresh (Ctrl+Shift+R)
4. ✅ Clear site data:
   - Application → Clear storage → Clear site data
5. ✅ Rebuild: `npm run build`

---

### App Doesn't Work Offline

**Symptoms:**
- White screen when offline
- "Unable to connect" error

**Solutions:**
1. ✅ Load app online first (SW needs to cache)
2. ✅ Verify service worker is active
3. ✅ Check Cache Storage has data
4. ✅ Make sure you visited the page before going offline
5. ✅ Try the offline fallback page: `/offline`

---

### IndexedDB Not Syncing

**Symptoms:**
- IndexedDB is empty
- No data loads offline

**Solutions:**
1. ✅ Check console for sync errors
2. ✅ Verify you're online for initial sync
3. ✅ Check browser console for:
   ```
   🔄 Background syncing...
   ✅ Synced successfully
   ```
4. ✅ Navigate to `/courses` to trigger sync
5. ✅ Check Application → IndexedDB → jkuat-course-hub

---

### Materials Not Loading Offline

**Symptoms:**
- Empty materials list offline
- Loading spinner forever

**Solutions:**
1. ✅ Load materials online first (they cache on view)
2. ✅ Check IndexedDB → materials store has data
3. ✅ Check console for errors
4. ✅ Verify course_id matches in materials table
5. ✅ Force manual sync from console:
   ```javascript
   const { syncMaterialsForCourse } = await import('/lib/db/syncManager.js')
   await syncMaterialsForCourse('course-id-here')
   ```

---

### Cache Taking Too Much Space

**Symptoms:**
- Browser warns about storage
- Slow performance

**Solutions:**
1. ✅ Check storage usage:
   ```javascript
   navigator.storage.estimate().then(console.log)
   ```
2. ✅ Clear specific caches:
   - Application → Cache Storage → Right-click → Delete
3. ✅ Clear IndexedDB:
   - Application → IndexedDB → Right-click → Delete database
4. ✅ Adjust cache limits in `next.config.mjs`

---

## 📊 Expected Console Output

### On App Load (Online):
```
✅ Service Worker registered successfully!
   Scope: /
   State: activated
🔄 Starting background sync on app load...
🔄 Background syncing courses from Supabase...
✅ Courses synced successfully
```

### On App Load (Offline):
```
✅ Service Worker registered successfully!
   Scope: /
   State: activated
📴 App loaded offline - using cached data
```

### On Upload:
```
💾 Syncing uploaded material to IndexedDB...
✅ Material synced to IndexedDB
```

### On Course Page Load:
```
🔄 Background syncing materials for course abc123...
✅ Materials synced successfully
🔄 Background syncing topics...
✅ Topics synced
```

---

## 🎉 Success Criteria

Your offline-first PWA is working correctly if:

✅ Service worker registers without errors
✅ App loads instantly when offline
✅ Can navigate all previously visited pages offline
✅ Materials load from IndexedDB offline
✅ Uploads sync to IndexedDB immediately
✅ Background sync keeps data fresh
✅ Offline fallback page shows for uncached routes
✅ No errors in console during offline operation

---

## 📱 Mobile Testing

### iOS Safari:
1. Build and deploy to production server (Vercel, etc.)
2. Open in Safari
3. Tap Share → Add to Home Screen
4. Open installed app
5. Go offline (Airplane mode)
6. Test functionality

### Android Chrome:
1. Build and deploy to production
2. Open in Chrome
3. Should see "Install app" prompt
4. Install PWA
5. Go offline
6. Test functionality

---

## 🚀 Performance Benchmarks

### Expected Load Times:

**Online (First Visit):**
- Home page: < 1s
- Courses page: < 1s
- Course materials: < 500ms

**Offline (From Cache):**
- Home page: < 100ms ⚡
- Courses page: < 50ms ⚡⚡
- Course materials: < 50ms ⚡⚡

**IndexedDB Queries:**
- Get courses: < 10ms 🚀
- Get materials: < 20ms 🚀
- Get topics: < 10ms 🚀

---

## ✅ Final Verification

Run through this final checklist before considering it complete:

1. [ ] Build succeeds without errors
2. [ ] Service worker registers in production
3. [ ] Cache Storage populated
4. [ ] IndexedDB syncs data
5. [ ] App loads offline
6. [ ] Navigation works offline
7. [ ] Materials display offline
8. [ ] Upload syncs to IndexedDB
9. [ ] Offline fallback page works
10. [ ] No console errors

---

## 🎯 You're Done!

If all tests pass, your offline-first PWA is **fully functional**! 🎉

The app now:
- ⚡ Loads instantly from IndexedDB
- 🔌 Works completely offline
- 📦 Caches app shell for offline use
- 🔄 Background syncs automatically
- 💾 Uploads update IndexedDB immediately

**Congratulations on building a true offline-first PWA!** 🚀
