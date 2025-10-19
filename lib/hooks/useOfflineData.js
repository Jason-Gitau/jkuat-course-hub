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
 * Hook for accessing courses with offline support
 * Strategy: Try network first, fallback to IndexedDB if offline
 */
export function useOfflineCourses() {
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
    queryKey: ['courses'],
    queryFn: async () => {
      const result = await syncCourses();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: isOnline,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Load offline data when offline or as fallback
  useEffect(() => {
    async function loadOfflineData() {
      const result = await getOfflineCourses();
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
  }, [isOnline, error]);

  return {
    courses: isOnline && onlineData ? onlineData : offlineData?.data || [],
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
 * Hook for accessing materials for a specific course with offline support
 */
export function useOfflineMaterials(courseId) {
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
    queryKey: ['materials', courseId],
    queryFn: async () => {
      const result = await syncMaterialsForCourse(courseId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: isOnline && !!courseId,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Load offline data when offline or as fallback
  useEffect(() => {
    async function loadOfflineData() {
      if (!courseId) return;

      const result = await getOfflineMaterialsForCourse(courseId);
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
  }, [isOnline, error, courseId]);

  return {
    materials: isOnline && onlineData ? onlineData : offlineData?.data || [],
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
