/**
 * Tests for course detail page
 * Testing materials loading and sync indicators
 */

import { render, screen, waitFor } from '@testing-library/react'
import CoursePage from '@/app/courses/[courseId]/page'
import { useOfflineMaterials } from '@/lib/hooks/useOfflineData'

// Mock dependencies
jest.mock('@/lib/hooks/useOfflineData')
jest.mock('next/navigation', () => ({
  useParams: () => ({ courseId: 'course-123' }),
}))
jest.mock('next/link', () => {
  return function Link({ children, href }) {
    return <a href={href}>{children}</a>
  }
})
jest.mock('@/components/MaterialCard', () => {
  return function MaterialCard({ material }) {
    return <div data-testid="material-card">{material.title}</div>
  }
})
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: {
        id: 'course-123',
        course_name: 'Test Course',
        department: 'Engineering',
      },
      error: null,
    }),
    order: jest.fn().mockResolvedValue({ data: [], error: null }),
  })),
}))
jest.mock('@/lib/db/syncManager', () => ({
  getTopicsForCourse: jest.fn().mockResolvedValue({
    success: true,
    data: [],
    isStale: false,
  }),
  syncTopicsForCourse: jest.fn().mockResolvedValue({
    success: true,
    data: [],
  }),
  syncCourses: jest.fn().mockResolvedValue({
    success: true,
    data: [],
  }),
}))
jest.mock('@/lib/db/indexedDB', () => ({
  STORES: {
    COURSES: 'courses',
    MATERIALS: 'materials',
    TOPICS: 'topics',
  },
  getFromStore: jest.fn().mockResolvedValue(null),
}))

describe('Course Detail Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Materials Loading State', () => {
    it('should show loading skeleton while materials are loading', () => {
      useOfflineMaterials.mockReturnValue({
        materials: [],
        loading: true,
        isSyncing: false,
        error: null,
        isOnline: true,
        isOffline: false,
        lastSync: null,
        refetch: jest.fn(),
      })

      render(<CoursePage />)

      // Should show loading animation
      const loadingContainer = screen.getByTestId('loading-skeleton')
      expect(loadingContainer).toBeInTheDocument()
    })

    it('should show materials after loading completes', async () => {
      const mockMaterials = [
        {
          id: 'm1',
          title: 'Lecture Notes Week 1',
          topic_id: 'topic-1',
          material_category: 'notes',
        },
        {
          id: 'm2',
          title: 'Past Paper 2023',
          topic_id: 'topic-1',
          material_category: 'past_paper',
        },
      ]

      useOfflineMaterials.mockReturnValue({
        materials: mockMaterials,
        loading: false,
        isSyncing: false,
        error: null,
        isOnline: true,
        isOffline: false,
        lastSync: Date.now(),
        refetch: jest.fn(),
      })

      render(<CoursePage />)

      await waitFor(() => {
        expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument()
      })

      // Should show materials
      expect(screen.getByText('Lecture Notes Week 1')).toBeInTheDocument()
      expect(screen.getByText('Past Paper 2023')).toBeInTheDocument()
    })
  })

  describe('Sync Indicator', () => {
    it('should show syncing banner when isSyncing=true', () => {
      const mockMaterials = [
        {
          id: 'm1',
          title: 'Cached Material',
          topic_id: 'topic-1',
        },
      ]

      useOfflineMaterials.mockReturnValue({
        materials: mockMaterials,
        loading: false,
        isSyncing: true, // Background sync in progress
        error: null,
        isOnline: true,
        isOffline: false,
        lastSync: Date.now() - 1000,
        refetch: jest.fn(),
      })

      render(<CoursePage />)

      // Should show sync indicator
      expect(screen.getByText(/syncing materials from server/i)).toBeInTheDocument()

      // Should still show cached materials
      expect(screen.getByText('Cached Material')).toBeInTheDocument()
    })

    it('should hide sync banner when isSyncing=false', () => {
      const mockMaterials = [
        {
          id: 'm1',
          title: 'Material',
          topic_id: 'topic-1',
        },
      ]

      useOfflineMaterials.mockReturnValue({
        materials: mockMaterials,
        loading: false,
        isSyncing: false,
        error: null,
        isOnline: true,
        isOffline: false,
        lastSync: Date.now(),
        refetch: jest.fn(),
      })

      render(<CoursePage />)

      // Should NOT show sync banner
      expect(screen.queryByText(/syncing materials/i)).not.toBeInTheDocument()
    })

    it('should not show sync banner when offline even if isSyncing=true', () => {
      useOfflineMaterials.mockReturnValue({
        materials: [],
        loading: false,
        isSyncing: true,
        error: null,
        isOnline: false,
        isOffline: true,
        lastSync: Date.now() - 1000,
        refetch: jest.fn(),
      })

      render(<CoursePage />)

      // Should NOT show syncing banner when offline
      expect(screen.queryByText(/syncing materials/i)).not.toBeInTheDocument()

      // Should show offline mode banner
      expect(screen.getByText(/offline mode/i)).toBeInTheDocument()
    })
  })

  describe('Offline Mode', () => {
    it('should show offline banner with last sync time', () => {
      const lastSyncTime = Date.now() - 5000

      useOfflineMaterials.mockReturnValue({
        materials: [],
        loading: false,
        isSyncing: false,
        error: null,
        isOnline: false,
        isOffline: true,
        lastSync: lastSyncTime,
        refetch: jest.fn(),
      })

      render(<CoursePage />)

      // Should show offline mode banner
      expect(screen.getByText(/offline mode.*viewing cached materials/i)).toBeInTheDocument()

      // Should show last sync time
      expect(screen.getByText(/last synced:/i)).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no materials are available', () => {
      useOfflineMaterials.mockReturnValue({
        materials: [],
        loading: false,
        isSyncing: false,
        error: null,
        isOnline: true,
        isOffline: false,
        lastSync: Date.now(),
        refetch: jest.fn(),
      })

      render(<CoursePage />)

      // Should not crash with empty materials
      expect(screen.queryByTestId('material-card')).not.toBeInTheDocument()
    })
  })

  describe('First-Time User Experience', () => {
    it('should keep loading state until materials are fetched for new users', async () => {
      // Simulate empty cache scenario
      useOfflineMaterials.mockReturnValue({
        materials: [],
        loading: true, // Still loading because cache is empty
        isSyncing: false,
        error: null,
        isOnline: true,
        isOffline: false,
        lastSync: null,
        refetch: jest.fn(),
      })

      render(<CoursePage />)

      // Should show loading state (not empty state)
      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
    })
  })

  describe('Returning User Experience', () => {
    it('should show cached materials immediately for returning users', () => {
      const mockMaterials = [
        {
          id: 'm1',
          title: 'Cached Material 1',
          topic_id: 'topic-1',
        },
        {
          id: 'm2',
          title: 'Cached Material 2',
          topic_id: 'topic-1',
        },
      ]

      useOfflineMaterials.mockReturnValue({
        materials: mockMaterials,
        loading: false, // No loading - data from cache
        isSyncing: false,
        error: null,
        isOnline: true,
        isOffline: false,
        lastSync: Date.now() - 1000,
        refetch: jest.fn(),
      })

      render(<CoursePage />)

      // Should immediately show materials (no loading state)
      expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument()
      expect(screen.getByText('Cached Material 1')).toBeInTheDocument()
      expect(screen.getByText('Cached Material 2')).toBeInTheDocument()
    })

    it('should update with fresh data after background sync completes', async () => {
      // Start with cached data
      const cachedMaterials = [
        { id: 'm1', title: 'Cached Material', topic_id: 'topic-1' },
      ]

      const { rerender } = render(<CoursePage />)

      useOfflineMaterials.mockReturnValue({
        materials: cachedMaterials,
        loading: false,
        isSyncing: true, // Syncing in background
        error: null,
        isOnline: true,
        isOffline: false,
        lastSync: Date.now() - 1000,
        refetch: jest.fn(),
      })

      rerender(<CoursePage />)

      // Should show cached data + sync indicator
      expect(screen.getByText('Cached Material')).toBeInTheDocument()
      expect(screen.getByText(/syncing materials/i)).toBeInTheDocument()

      // Simulate sync completion with new data
      const updatedMaterials = [
        { id: 'm1', title: 'Updated Material', topic_id: 'topic-1' },
      ]

      useOfflineMaterials.mockReturnValue({
        materials: updatedMaterials,
        loading: false,
        isSyncing: false, // Sync complete
        error: null,
        isOnline: true,
        isOffline: false,
        lastSync: Date.now(),
        refetch: jest.fn(),
      })

      rerender(<CoursePage />)

      // Should show updated data without sync indicator
      await waitFor(() => {
        expect(screen.queryByText(/syncing materials/i)).not.toBeInTheDocument()
      })
      expect(screen.getByText('Updated Material')).toBeInTheDocument()
    })
  })
})
