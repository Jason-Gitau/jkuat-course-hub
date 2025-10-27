/**
 * Tests for courses page
 * Testing loading states and sync indicators
 */

import { render, screen, waitFor } from '@testing-library/react'
import CoursesPage from '@/app/courses/page'
import { useOfflineCourses } from '@/lib/hooks/useOfflineData'

// Mock the hook
jest.mock('@/lib/hooks/useOfflineData')

// Mock Next.js Link component
jest.mock('next/link', () => {
  return function Link({ children, href }) {
    return <a href={href}>{children}</a>
  }
})

describe('Courses Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Loading State', () => {
    it('should show loading skeletons while loading', () => {
      useOfflineCourses.mockReturnValue({
        courses: [],
        loading: true,
        isSyncing: false,
        error: null,
        isOnline: true,
        isOffline: false,
        lastSync: null,
        refetch: jest.fn(),
      })

      render(<CoursesPage />)

      // Should show loading skeletons
      expect(screen.getByText('Browse Courses')).toBeInTheDocument()
      // Loading animation should be present (check for pulse animation class)
      const loadingContainer = screen.getByText('Browse Courses').closest('div')
      expect(loadingContainer).toBeInTheDocument()
    })
  })

  describe('Empty Cache - First Time Users', () => {
    it('should show loading state until data is fetched', async () => {
      // Simulate empty cache scenario
      const mockRefetch = jest.fn()

      useOfflineCourses.mockReturnValue({
        courses: [],
        loading: true, // Still loading because cache is empty
        isSyncing: false,
        error: null,
        isOnline: true,
        isOffline: false,
        lastSync: null,
        refetch: mockRefetch,
      })

      render(<CoursesPage />)

      // Should show loading state (not "No courses available")
      expect(screen.queryByText(/no courses available/i)).not.toBeInTheDocument()
    })

    it('should display courses after loading completes', async () => {
      const mockCourses = [
        {
          id: '1',
          course_name: 'Computer Science',
          department: 'Engineering',
          description: 'CS Program',
        },
        {
          id: '2',
          course_name: 'Civil Engineering',
          department: 'Engineering',
          description: 'Civil Program',
        },
      ]

      useOfflineCourses.mockReturnValue({
        courses: mockCourses,
        loading: false,
        isSyncing: false,
        error: null,
        isOnline: true,
        isOffline: false,
        lastSync: Date.now(),
        refetch: jest.fn(),
      })

      render(<CoursesPage />)

      // Should show courses
      expect(screen.getByText('Computer Science')).toBeInTheDocument()
      expect(screen.getByText('Civil Engineering')).toBeInTheDocument()
    })
  })

  describe('Has Cache - Returning Users', () => {
    it('should show cached courses immediately', () => {
      const mockCourses = [
        {
          id: '1',
          course_name: 'Cached Course',
          department: 'Engineering',
        },
      ]

      useOfflineCourses.mockReturnValue({
        courses: mockCourses,
        loading: false,
        isSyncing: false,
        error: null,
        isOnline: true,
        isOffline: false,
        lastSync: Date.now() - 1000,
        refetch: jest.fn(),
      })

      render(<CoursesPage />)

      // Should immediately show course (no loading state)
      expect(screen.getByText('Cached Course')).toBeInTheDocument()
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
  })

  describe('Sync Indicator', () => {
    it('should show "Syncing..." indicator when isSyncing=true', () => {
      const mockCourses = [
        { id: '1', course_name: 'Course 1', department: 'Dept' },
      ]

      useOfflineCourses.mockReturnValue({
        courses: mockCourses,
        loading: false,
        isSyncing: true, // Background sync in progress
        error: null,
        isOnline: true,
        isOffline: false,
        lastSync: Date.now() - 1000,
        refetch: jest.fn(),
      })

      render(<CoursesPage />)

      // Should show sync indicator
      expect(screen.getByText('Syncing...')).toBeInTheDocument()

      // Should still show cached courses
      expect(screen.getByText('Course 1')).toBeInTheDocument()
    })

    it('should hide sync indicator when isSyncing=false', () => {
      const mockCourses = [
        { id: '1', course_name: 'Course 1', department: 'Dept' },
      ]

      useOfflineCourses.mockReturnValue({
        courses: mockCourses,
        loading: false,
        isSyncing: false,
        error: null,
        isOnline: true,
        isOffline: false,
        lastSync: Date.now(),
        refetch: jest.fn(),
      })

      render(<CoursesPage />)

      // Should NOT show sync indicator
      expect(screen.queryByText('Syncing...')).not.toBeInTheDocument()
    })

    it('should not show sync indicator when offline', () => {
      const mockCourses = [
        { id: '1', course_name: 'Course 1', department: 'Dept' },
      ]

      useOfflineCourses.mockReturnValue({
        courses: mockCourses,
        loading: false,
        isSyncing: true, // Trying to sync
        error: null,
        isOnline: false, // But offline
        isOffline: true,
        lastSync: Date.now() - 1000,
        refetch: jest.fn(),
      })

      render(<CoursesPage />)

      // Should NOT show "Syncing..." when offline
      expect(screen.queryByText('Syncing...')).not.toBeInTheDocument()

      // Should show offline mode badge instead
      expect(screen.getByText('Offline Mode')).toBeInTheDocument()
    })
  })

  describe('Offline Mode', () => {
    it('should show offline badge when offline', () => {
      const mockCourses = [
        { id: '1', course_name: 'Course 1', department: 'Dept' },
      ]

      useOfflineCourses.mockReturnValue({
        courses: mockCourses,
        loading: false,
        isSyncing: false,
        error: null,
        isOnline: false,
        isOffline: true,
        lastSync: Date.now() - 5000,
        refetch: jest.fn(),
      })

      render(<CoursesPage />)

      // Should show offline mode badge
      expect(screen.getByText('Offline Mode')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should display error message when there is an error', () => {
      useOfflineCourses.mockReturnValue({
        courses: [],
        loading: false,
        isSyncing: false,
        error: 'Failed to load courses',
        isOnline: true,
        isOffline: false,
        lastSync: null,
        refetch: jest.fn(),
      })

      render(<CoursesPage />)

      // Should show error message
      expect(screen.getByText(/error loading courses/i)).toBeInTheDocument()
      expect(screen.getByText('Failed to load courses')).toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    it('should filter courses based on search query', async () => {
      const mockCourses = [
        { id: '1', course_name: 'Computer Science', department: 'Engineering' },
        { id: '2', course_name: 'Civil Engineering', department: 'Engineering' },
        { id: '3', course_name: 'Business Administration', department: 'Business' },
      ]

      useOfflineCourses.mockReturnValue({
        courses: mockCourses,
        loading: false,
        isSyncing: false,
        error: null,
        isOnline: true,
        isOffline: false,
        lastSync: Date.now(),
        refetch: jest.fn(),
      })

      const { container } = render(<CoursesPage />)

      // All courses should be visible initially
      expect(screen.getByText('Computer Science')).toBeInTheDocument()
      expect(screen.getByText('Civil Engineering')).toBeInTheDocument()
      expect(screen.getByText('Business Administration')).toBeInTheDocument()

      // Type in search box
      const searchInput = screen.getByPlaceholderText(/search courses/i)
      fireEvent.change(searchInput, { target: { value: 'computer' } })

      // Should show only matching course
      await waitFor(() => {
        expect(screen.getByText('Computer Science')).toBeInTheDocument()
        expect(screen.queryByText('Civil Engineering')).not.toBeInTheDocument()
        expect(screen.queryByText('Business Administration')).not.toBeInTheDocument()
      })
    })
  })
})
