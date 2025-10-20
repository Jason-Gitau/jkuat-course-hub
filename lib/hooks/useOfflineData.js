/**
 * React hooks for offline-first data access
 * Combines React Query (online performance) with IndexedDB (offline persistence)
 */

'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  syncCourses,
  syncMaterialsForCourse,
  syncUserProfile,
  getOfflineCourses,
  getOfflineMaterialsForCourse,
  getOfflineUserProfile,
} from '@/lib/db/syncManager';

/**
 * Hook for accessing courses with TRUE offline-first support
 * Strategy: ALWAYS load from IndexedDB first (instant), then background sync
 */
export function useOfflineCourses() {
  const [isOnline, setIsOnline] = useState(true);
  const [data, setData] = useState([]);
  const [lastSync, setLastSync] = useState(null);
  const [isStale, setIsStale] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Monitor online/offline status
  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);

    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // STEP 1: Load from IndexedDB immediately (offline-first)
  useEffect(() => {
    async function loadFromIndexedDB() {
      setLoading(true);
      const result = await getOfflineCourses();
      if (result.success) {
        setData(result.data);
        setLastSync(result.lastSync);
        setIsStale(result.isStale);
      } else {
        setError(result.error);
      }
      setLoading(false);
    }

    loadFromIndexedDB();
  }, []);

  // STEP 2: Background sync from Supabase (only if online and stale)
  useEffect(() => {
    async function backgroundSync() {
      if (!isOnline || !isStale) return;

      console.log('🔄 Background syncing courses from Supabase...');
      const result = await syncCourses();

      if (result.success) {
        // Update local state with fresh data
        setData(result.data);
        setLastSync(Date.now());
        setIsStale(false);
        console.log('✅ Courses synced successfully');
      } else {
        console.warn('⚠️ Background sync failed:', result.error);
      }
    }

    // Delay background sync slightly to let IndexedDB load first
    const timer = setTimeout(backgroundSync, 100);
    return () => clearTimeout(timer);
  }, [isOnline, isStale]);

  const refetch = async () => {
    setLoading(true);
    const result = await syncCourses();
    if (result.success) {
      setData(result.data);
      setLastSync(Date.now());
      setIsStale(false);
      setError(null);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return {
    courses: data,
    loading,
    error,
    isOnline,
    isOffline: !isOnline,
    lastSync,
    isStale,
    refetch,
  };
}

/**
 * Hook for accessing materials with TRUE offline-first support
 * Strategy: ALWAYS load from IndexedDB first (instant), then background sync
 */
export function useOfflineMaterials(courseId) {
  const [isOnline, setIsOnline] = useState(true);
  const [data, setData] = useState([]);
  const [lastSync, setLastSync] = useState(null);
  const [isStale, setIsStale] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Monitor online/offline status
  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);

    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // STEP 1: Load from IndexedDB immediately (offline-first)
  useEffect(() => {
    async function loadFromIndexedDB() {
      if (!courseId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const result = await getOfflineMaterialsForCourse(courseId);
      if (result.success) {
        setData(result.data);
        setLastSync(result.lastSync);
        setIsStale(result.isStale);
      } else {
        setError(result.error);
      }
      setLoading(false);
    }

    loadFromIndexedDB();
  }, [courseId]);

  // STEP 2: Background sync from Supabase (only if online and stale)
  useEffect(() => {
    async function backgroundSync() {
      if (!isOnline || !isStale || !courseId) return;

      console.log(`🔄 Background syncing materials for course ${courseId}...`);
      const result = await syncMaterialsForCourse(courseId);

      if (result.success) {
        // Update local state with fresh data
        setData(result.data);
        setLastSync(Date.now());
        setIsStale(false);
        console.log('✅ Materials synced successfully');
      } else {
        console.warn('⚠️ Background sync failed:', result.error);
      }
    }

    // Delay background sync slightly to let IndexedDB load first
    const timer = setTimeout(backgroundSync, 100);
    return () => clearTimeout(timer);
  }, [isOnline, isStale, courseId]);

  const refetch = async () => {
    if (!courseId) return;

    setLoading(true);
    const result = await syncMaterialsForCourse(courseId);
    if (result.success) {
      setData(result.data);
      setLastSync(Date.now());
      setIsStale(false);
      setError(null);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return {
    materials: data,
    loading,
    error,
    isOnline,
    isOffline: !isOnline,
    lastSync,
    isStale,
    refetch,
  };
}

/**
 * Hook for accessing user profile with offline support
 */
export function useOfflineProfile(userId) {
  const [isOnline, setIsOnline] = useState(true);
  const [offlineData, setOfflineData] = useState(null);

  // Monitor online/offline status
  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);

    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // React Query for online data
  const {
    data: onlineData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const result = await syncUserProfile(userId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: isOnline && !!userId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Load offline data when offline or as fallback
  useEffect(() => {
    async function loadOfflineData() {
      if (!userId) return;

      const result = await getOfflineUserProfile(userId);
      if (result.success) {
        setOfflineData({
          data: result.data,
          lastSync: result.lastSync,
          isStale: result.isStale,
        });
      }
    }

    if (!isOnline || error) {
      loadOfflineData();
    }
  }, [isOnline, error, userId]);

  return {
    profile: isOnline && onlineData ? onlineData : offlineData?.data || null,
    loading: isLoading && isOnline,
    error: isOnline ? error : null,
    isOnline,
    isOffline: !isOnline,
    lastSync: offlineData?.lastSync,
    isStale: offlineData?.isStale,
    refetch,
  };
}

/**
 * Hook to check network status
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);

    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  return { isOnline, isOffline: !isOnline };
}
