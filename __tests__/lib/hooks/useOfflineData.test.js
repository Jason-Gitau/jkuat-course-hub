/**
 * Tests for useOfflineData hooks
 * Testing empty cache fix and smart loading behavior
 */

import { renderHook, waitFor } from '@testing-library/react'
import { useOfflineCourses, useOfflineMaterials } from '@/lib/hooks/useOfflineData'
import * as syncManager from '@/lib/db/syncManager'

// Mock the sync manager
jest.mock('@/lib/db/syncManager')

describe('useOfflineCourses Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    })
  })

  describe('Empty Cache (First-Time Users)', () => {
    it('should keep loading=true until first sync completes for new users', async () => {
      // Mock empty IndexedDB cache
      syncManager.getOfflineCourses.mockResolvedValue({
        success: true,
        data: [], // Empty cache
        lastSync: null,
        isStale: true,
      })

      // Mock slow Supabase sync
      let syncResolve
      const syncPromise = new Promise(resolve => {
        syncResolve = resolve
      })
      syncManager.syncCourses.mockReturnValue(syncPromise)

      const { result } = renderHook(() => useOfflineCourses())

      // Initially loading
      expect(result.current.loading).toBe(true)
      expect(result.current.courses).toEqual([])

      // Wait for cache check
      await waitFor(() => {
        expect(syncManager.getOfflineCourses).toHaveBeenCalled()
      })

      // Should STILL be loading because cache is empty and sync hasn't completed
      expect(result.current.loading).toBe(true)
      expect(result.current.courses).toEqual([])

      // Now complete the sync
      syncResolve({
        success: true,
        data: [
          { id: '1', course_name: 'Test Course', _syncedAt: Date.now() }
        ],
      })

      // Wait for sync to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Should now have data and not be loading
      expect(result.current.courses).toHaveLength(1)
      expect(result.current.courses[0].course_name).toBe('Test Course')
    })

    it('should set loading=false immediately if offline with empty cache', async () => {
      // Set offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      })

      syncManager.getOfflineCourses.mockResolvedValue({
        success: true,
        data: [], // Empty cache
        lastSync: null,
        isStale: true,
      })

      const { result } = renderHook(() => useOfflineCourses())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.courses).toEqual([])
      expect(result.current.isOffline).toBe(true)
    })
  })

  describe('Has Cache (Returning Users)', () => {
    it('should show cached data immediately and sync in background', async () => {
      const cachedCourses = [
        { id: '1', course_name: 'Cached Course', _syncedAt: Date.now() - 1000 }
      ]

      syncManager.getOfflineCourses.mockResolvedValue({
        success: true,
        data: cachedCourses,
        lastSync: Date.now() - 1000,
        isStale: true,
      })

      syncManager.syncCourses.mockResolvedValue({
        success: true,
        data: [
          { id: '1', course_name: 'Updated Course', _syncedAt: Date.now() }
        ],
      })

      const { result } = renderHook(() => useOfflineCourses())

      // Wait for cached data
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Should show cached data immediately
      expect(result.current.courses).toHaveLength(1)
      expect(result.current.courses[0].course_name).toBe('Cached Course')

      // Wait for background sync
      await waitFor(() => {
        expect(result.current.isSyncing).toBe(false)
      }, { timeout: 3000 })

      // Should have updated data
      expect(result.current.courses[0].course_name).toBe('Updated Course')
    })

    it('should set isSyncing=true during background sync', async () => {
      syncManager.getOfflineCourses.mockResolvedValue({
        success: true,
        data: [{ id: '1', course_name: 'Cached', _syncedAt: Date.now() - 1000 }],
        lastSync: Date.now() - 1000,
        isStale: true,
      })

      let syncResolve
      const syncPromise = new Promise(resolve => {
        syncResolve = resolve
      })
      syncManager.syncCourses.mockReturnValue(syncPromise)

      const { result } = renderHook(() => useOfflineCourses())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Should show cached data
      expect(result.current.courses).toHaveLength(1)

      // Wait for sync to start
      await waitFor(() => {
        expect(result.current.isSyncing).toBe(true)
      })

      // Complete sync
      syncResolve({
        success: true,
        data: [{ id: '1', course_name: 'Updated', _syncedAt: Date.now() }],
      })

      // Wait for sync to complete
      await waitFor(() => {
        expect(result.current.isSyncing).toBe(false)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle IndexedDB errors gracefully', async () => {
      syncManager.getOfflineCourses.mockResolvedValue({
        success: false,
        data: null,
        error: 'IndexedDB not available',
      })

      const { result } = renderHook(() => useOfflineCourses())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBeTruthy()
    })

    it('should handle sync errors during background sync', async () => {
      syncManager.getOfflineCourses.mockResolvedValue({
        success: true,
        data: [],
        lastSync: null,
        isStale: true,
      })

      syncManager.syncCourses.mockResolvedValue({
        success: false,
        data: null,
        error: 'Network error',
      })

      const { result } = renderHook(() => useOfflineCourses())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Should not crash, just stop loading
      expect(result.current.courses).toEqual([])
    })
  })

  describe('refetch Function', () => {
    it('should trigger manual sync when refetch is called', async () => {
      syncManager.getOfflineCourses.mockResolvedValue({
        success: true,
        data: [{ id: '1', course_name: 'Initial', _syncedAt: Date.now() }],
        lastSync: Date.now(),
        isStale: false,
      })

      syncManager.syncCourses.mockResolvedValue({
        success: true,
        data: [{ id: '1', course_name: 'Refreshed', _syncedAt: Date.now() }],
      })

      const { result } = renderHook(() => useOfflineCourses())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Call refetch
      result.current.refetch()

      await waitFor(() => {
        expect(result.current.isSyncing).toBe(false)
      })

      expect(syncManager.syncCourses).toHaveBeenCalled()
    })
  })
})

describe('useOfflineMaterials Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    })
  })

  describe('Empty Cache (First-Time Users)', () => {
    it('should keep loading=true until first sync completes', async () => {
      const courseId = 'course-123'

      syncManager.getOfflineMaterialsForCourse.mockResolvedValue({
        success: true,
        data: [], // Empty cache
        lastSync: null,
        isStale: true,
      })

      let syncResolve
      const syncPromise = new Promise(resolve => {
        syncResolve = resolve
      })
      syncManager.syncMaterialsForCourse.mockReturnValue(syncPromise)

      const { result } = renderHook(() => useOfflineMaterials(courseId))

      // Initially loading
      expect(result.current.loading).toBe(true)

      await waitFor(() => {
        expect(syncManager.getOfflineMaterialsForCourse).toHaveBeenCalledWith(courseId)
      })

      // Should STILL be loading
      expect(result.current.loading).toBe(true)
      expect(result.current.materials).toEqual([])

      // Complete sync
      syncResolve({
        success: true,
        data: [
          { id: 'm1', title: 'Material 1', course_id: courseId, _syncedAt: Date.now() }
        ],
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.materials).toHaveLength(1)
    })
  })

  describe('Has Cache (Returning Users)', () => {
    it('should show cached materials immediately', async () => {
      const courseId = 'course-123'
      const cachedMaterials = [
        { id: 'm1', title: 'Cached Material', course_id: courseId, _syncedAt: Date.now() - 1000 }
      ]

      syncManager.getOfflineMaterialsForCourse.mockResolvedValue({
        success: true,
        data: cachedMaterials,
        lastSync: Date.now() - 1000,
        isStale: true,
      })

      syncManager.syncMaterialsForCourse.mockResolvedValue({
        success: true,
        data: cachedMaterials,
      })

      const { result } = renderHook(() => useOfflineMaterials(courseId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.materials).toHaveLength(1)
      expect(result.current.materials[0].title).toBe('Cached Material')
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing courseId gracefully', async () => {
      const { result } = renderHook(() => useOfflineMaterials(null))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.materials).toEqual([])
      expect(syncManager.getOfflineMaterialsForCourse).not.toHaveBeenCalled()
    })

    it('should handle courseId changes', async () => {
      const courseId1 = 'course-1'
      const courseId2 = 'course-2'

      syncManager.getOfflineMaterialsForCourse.mockResolvedValue({
        success: true,
        data: [],
        lastSync: null,
        isStale: true,
      })

      syncManager.syncMaterialsForCourse.mockResolvedValue({
        success: true,
        data: [],
      })

      const { result, rerender } = renderHook(
        ({ courseId }) => useOfflineMaterials(courseId),
        { initialProps: { courseId: courseId1 } }
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Change courseId
      rerender({ courseId: courseId2 })

      await waitFor(() => {
        expect(syncManager.getOfflineMaterialsForCourse).toHaveBeenCalledWith(courseId2)
      })
    })
  })
})
