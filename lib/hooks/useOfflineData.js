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
  syncTopicsForCourse,
} from '@/lib/db/syncManager';
import { getFromStore, STORES, getByIndex } from '@/lib/db/indexedDB';

/**
 * Hook for accessing courses with SMART CACHING (React Query + Online-First)
 * Strategy:
 * - First visit: Fetch from Supabase, cache for 5 minutes
 * - Revisit (within 5 min): Load from React Query cache (instant, no API call)
 * - Revisit (after 5 min): Load from cache + background refetch
 * - Offline: Fall back to IndexedDB
 * Result: Fresh data + fewer API calls + instant revisits
 */
export function useOfflineCourses() {
  const [isOnline, setIsOnline] = useState(true);

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

  // React Query with 5-minute staleness + offline fallback
  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      // If ONLINE: Fetch from Supabase
      if (navigator.onLine) {
        console.log('🌐 Fetching courses from Supabase...');
        const result = await syncCourses();

        if (result.success) {
          console.log('✅ Fresh courses loaded from Supabase');
          return { data: result.data, source: 'supabase' };
        } else {
          console.warn('⚠️ Supabase fetch failed, falling back to cache');
          throw new Error(result.error);
        }
      }

      // If OFFLINE: Fall back to IndexedDB
      console.log('📂 Loading courses from IndexedDB (offline)...');
      const cacheResult = await getOfflineCourses();

      if (cacheResult.success && cacheResult.data.length > 0) {
        console.log('✅ Courses loaded from IndexedDB');
        return { data: cacheResult.data, source: 'indexeddb' };
      } else {
        throw new Error('No cached courses available');
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - prevents refetch on revisit
    gcTime: 10 * 60 * 1000, // 10 minutes in memory
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: false, // Don't retry, just fall back to IndexedDB
  });

  return {
    courses: data?.data || [],
    loading: isLoading,
    error: error?.message || null,
    isOnline,
    isOffline: !isOnline,
    source: data?.source || null,
    refetch,
    lastFetch: dataUpdatedAt, // When data was last fetched
  };
}

/**
 * Hook for accessing a single course with SMART CACHING (React Query + Online-First)
 * Strategy:
 * - First visit: Fetch from Supabase, cache for 5 minutes
 * - Revisit (within 5 min): Load from React Query cache (instant, no API call)
 * - Revisit (after 5 min): Load from cache + background refetch
 * - Offline: Fall back to IndexedDB
 * Result: Fresh data + fewer API calls + instant revisits
 */
export function useOfflineCourse(courseId) {
  const [isOnline, setIsOnline] = useState(true);

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

  // React Query with 5-minute staleness + offline fallback
  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      if (!courseId) {
        return { data: null, source: null };
      }

      // If ONLINE: Fetch from Supabase
      if (navigator.onLine) {
        console.log(`🌐 Fetching course from Supabase for course ${courseId}...`);
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        const { data: course, error: courseError } = await supabase
          .from('courses')
          .select('id, course_name, description, department')
          .eq('id', courseId)
          .single();

        if (courseError) {
          console.warn('⚠️ Supabase fetch failed, falling back to cache');
          throw new Error(courseError.message);
        }

        console.log(`✅ Fresh course loaded from Supabase for course ${courseId}`);
        return { data: course, source: 'supabase' };
      }

      // If OFFLINE: Fall back to IndexedDB
      console.log(`📂 Loading course from IndexedDB (offline) for course ${courseId}...`);
      const cacheResult = await getFromStore(STORES.COURSES, courseId);

      if (cacheResult) {
        console.log(`✅ Course loaded from IndexedDB for course ${courseId}`);
        return { data: cacheResult, source: 'indexeddb' };
      } else {
        throw new Error('No cached course available');
      }
    },
    enabled: !!courseId, // Only run query if courseId exists
    staleTime: 5 * 60 * 1000, // 5 minutes - prevents refetch on revisit
    gcTime: 10 * 60 * 1000, // 10 minutes in memory
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: false, // Don't retry, just fall back to IndexedDB
  });

  return {
    course: data?.data || null,
    loading: isLoading,
    error: error?.message || null,
    isOnline,
    isOffline: !isOnline,
    source: data?.source || null,
    refetch,
    lastFetch: dataUpdatedAt, // When data was last fetched
  };
}

/**
 * Hook for accessing materials with SMART CACHING (React Query + Online-First)
 * Strategy:
 * - First visit: Fetch from Supabase, cache for 5 minutes
 * - Revisit (within 5 min): Load from React Query cache (instant, no API call)
 * - Revisit (after 5 min): Load from cache + background refetch
 * - Offline: Fall back to IndexedDB
 * Result: Fresh data + fewer API calls + instant revisits
 */
export function useOfflineMaterials(courseId) {
  const [isOnline, setIsOnline] = useState(true);

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

  // React Query with 5-minute staleness + offline fallback
  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['materials', courseId],
    queryFn: async () => {
      if (!courseId) {
        return { data: [], source: null };
      }

      // If ONLINE: Fetch from Supabase
      if (navigator.onLine) {
        console.log(`🌐 Fetching materials from Supabase for course ${courseId}...`);
        const result = await syncMaterialsForCourse(courseId);

        if (result.success) {
          console.log(`✅ Fresh materials loaded from Supabase for course ${courseId}`);
          return { data: result.data, source: 'supabase' };
        } else {
          console.warn('⚠️ Supabase fetch failed, falling back to cache');
          throw new Error(result.error);
        }
      }

      // If OFFLINE: Fall back to IndexedDB
      console.log(`📂 Loading materials from IndexedDB (offline) for course ${courseId}...`);
      const cacheResult = await getOfflineMaterialsForCourse(courseId);

      if (cacheResult.success && cacheResult.data.length > 0) {
        console.log(`✅ Materials loaded from IndexedDB for course ${courseId}`);
        return { data: cacheResult.data, source: 'indexeddb' };
      } else {
        throw new Error('No cached materials available');
      }
    },
    enabled: !!courseId, // Only run query if courseId exists
    staleTime: 5 * 60 * 1000, // 5 minutes - prevents refetch on revisit
    gcTime: 10 * 60 * 1000, // 10 minutes in memory
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: false, // Don't retry, just fall back to IndexedDB
  });

  return {
    materials: data?.data || [],
    loading: isLoading,
    error: error?.message || null,
    isOnline,
    isOffline: !isOnline,
    source: data?.source || null,
    refetch,
    lastFetch: dataUpdatedAt, // When data was last fetched
  };
}

/**
 * Hook for accessing topics/units for a course with SMART CACHING (React Query + Online-First)
 * Strategy:
 * - First visit: Fetch from Supabase, cache for 5 minutes
 * - Revisit (within 5 min): Load from React Query cache (instant, no API call)
 * - Revisit (after 5 min): Load from cache + background refetch
 * - Offline: Fall back to IndexedDB
 * Result: Fresh data + fewer API calls + instant revisits
 */
export function useOfflineTopics(courseId) {
  const [isOnline, setIsOnline] = useState(true);

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

  // React Query with 5-minute staleness + offline fallback
  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['topics', courseId],
    queryFn: async () => {
      if (!courseId) {
        return { data: [], source: null };
      }

      // If ONLINE: Fetch from Supabase
      if (navigator.onLine) {
        console.log(`🌐 Fetching topics from Supabase for course ${courseId}...`);
        const result = await syncTopicsForCourse(courseId);

        if (result.success) {
          console.log(`✅ Fresh topics loaded from Supabase for course ${courseId}`);
          return { data: result.data, source: 'supabase' };
        } else {
          console.warn('⚠️ Supabase fetch failed, falling back to cache');
          throw new Error(result.error);
        }
      }

      // If OFFLINE: Fall back to IndexedDB
      console.log(`📂 Loading topics from IndexedDB (offline) for course ${courseId}...`);
      const cacheResult = await getByIndex(STORES.TOPICS, 'course_id', courseId);

      if (cacheResult && cacheResult.length > 0) {
        console.log(`✅ Topics loaded from IndexedDB for course ${courseId}`);
        return { data: cacheResult, source: 'indexeddb' };
      } else {
        throw new Error('No cached topics available');
      }
    },
    enabled: !!courseId, // Only run query if courseId exists
    staleTime: 5 * 60 * 1000, // 5 minutes - prevents refetch on revisit
    gcTime: 10 * 60 * 1000, // 10 minutes in memory
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: false, // Don't retry, just fall back to IndexedDB
  });

  return {
    topics: data?.data || [],
    loading: isLoading,
    error: error?.message || null,
    isOnline,
    isOffline: !isOnline,
    source: data?.source || null,
    refetch,
    lastFetch: dataUpdatedAt, // When data was last fetched
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
