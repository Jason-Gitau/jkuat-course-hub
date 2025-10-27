/**
 * Tests for syncManager
 * Testing performance optimization (removed material count query)
 */

import {
  syncCourses,
  syncMaterialsForCourse,
  syncTopicsForCourse,
  getCourses,
  getMaterialsForCourse,
  getTopicsForCourse,
} from '@/lib/db/syncManager'
import { createClient } from '@/lib/supabase/client'
import * as indexedDB from '@/lib/db/indexedDB'

// Mock Supabase client
jest.mock('@/lib/supabase/client')

// Mock IndexedDB
jest.mock('@/lib/db/indexedDB')

describe('syncCourses', () => {
  let mockSupabase

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup Supabase mock
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    }
    createClient.mockReturnValue(mockSupabase)

    // Setup IndexedDB mocks
    indexedDB.putManyInStore = jest.fn().mockResolvedValue(undefined)
    indexedDB.updateLastSyncTime = jest.fn().mockResolvedValue(undefined)
  })

  describe('Performance Optimization', () => {
    it('should NOT fetch materials count (optimization)', async () => {
      const mockCourses = [
        { id: '1', course_name: 'Course 1', department: 'Dept 1', description: 'Desc 1' },
        { id: '2', course_name: 'Course 2', department: 'Dept 2', description: 'Desc 2' },
      ]

      mockSupabase.order.mockResolvedValue({ data: mockCourses, error: null })

      await syncCourses()

      // Should only call courses query (NOT materials query)
      expect(mockSupabase.from).toHaveBeenCalledTimes(1)
      expect(mockSupabase.from).toHaveBeenCalledWith('courses')

      // Should NOT have materialsCount field
      const [[, coursesStored]] = indexedDB.putManyInStore.mock.calls
      coursesStored.forEach(course => {
        expect(course).not.toHaveProperty('materialsCount')
        expect(course).toHaveProperty('_syncedAt')
      })
    })

    it('should return courses with sync timestamp', async () => {
      const mockCourses = [
        { id: '1', course_name: 'Test Course', department: 'Engineering' },
      ]

      mockSupabase.order.mockResolvedValue({ data: mockCourses, error: null })

      const result = await syncCourses()

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data[0]._syncedAt).toBeDefined()
      expect(result.data[0].course_name).toBe('Test Course')
    })

    it('should store courses in IndexedDB', async () => {
      const mockCourses = [
        { id: '1', course_name: 'Course 1' },
        { id: '2', course_name: 'Course 2' },
      ]

      mockSupabase.order.mockResolvedValue({ data: mockCourses, error: null })

      await syncCourses()

      expect(indexedDB.putManyInStore).toHaveBeenCalledWith(
        indexedDB.STORES.COURSES,
        expect.arrayContaining([
          expect.objectContaining({ id: '1', course_name: 'Course 1' }),
          expect.objectContaining({ id: '2', course_name: 'Course 2' }),
        ])
      )

      expect(indexedDB.updateLastSyncTime).toHaveBeenCalledWith(indexedDB.STORES.COURSES)
    })
  })

  describe('Error Handling', () => {
    it('should handle Supabase errors gracefully', async () => {
      mockSupabase.order.mockResolvedValue({
        data: null,
        error: { message: 'Network error' },
      })

      const result = await syncCourses()

      expect(result.success).toBe(false)
      expect(result.data).toBe(null)
      expect(result.error).toBe('Network error')
    })

    it('should handle empty courses list', async () => {
      mockSupabase.order.mockResolvedValue({ data: [], error: null })

      const result = await syncCourses()

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
    })

    it('should handle IndexedDB storage errors', async () => {
      mockSupabase.order.mockResolvedValue({
        data: [{ id: '1', course_name: 'Course' }],
        error: null,
      })

      indexedDB.putManyInStore.mockRejectedValue(new Error('Storage quota exceeded'))

      const result = await syncCourses()

      expect(result.success).toBe(false)
      expect(result.error).toContain('Storage quota exceeded')
    })
  })
})

describe('syncMaterialsForCourse', () => {
  let mockSupabase

  beforeEach(() => {
    jest.clearAllMocks()

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
    }
    createClient.mockReturnValue(mockSupabase)

    indexedDB.putManyInStore = jest.fn().mockResolvedValue(undefined)
    indexedDB.updateLastSyncTime = jest.fn().mockResolvedValue(undefined)
  })

  it('should fetch and store materials for a course', async () => {
    const courseId = 'course-123'
    const mockMaterials = [
      {
        id: 'm1',
        title: 'Material 1',
        course_id: courseId,
        material_category: 'notes',
      },
      {
        id: 'm2',
        title: 'Material 2',
        course_id: courseId,
        material_category: 'past_paper',
      },
    ]

    // Create a fresh mock chain for this test
    const mockOrderChain = {
      order: jest.fn().mockResolvedValue({ data: mockMaterials, error: null })
    }
    const mockEqChain = {
      eq: jest.fn().mockReturnValue(mockOrderChain),
      order: mockOrderChain.order
    }
    const mockSelectChain = {
      select: jest.fn().mockReturnValue(mockEqChain),
      eq: mockEqChain.eq,
      order: mockOrderChain.order
    }
    mockSupabase.from = jest.fn().mockReturnValue(mockSelectChain)

    const result = await syncMaterialsForCourse(courseId)

    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(2)
    expect(result.data[0]._syncedAt).toBeDefined()

    expect(indexedDB.putManyInStore).toHaveBeenCalledWith(
      indexedDB.STORES.MATERIALS,
      expect.arrayContaining([
        expect.objectContaining({ id: 'm1', title: 'Material 1' }),
        expect.objectContaining({ id: 'm2', title: 'Material 2' }),
      ])
    )
  })

  it('should filter by status=approved', async () => {
    const courseId = 'course-123'
    mockSupabase.order.mockResolvedValue({ data: [], error: null })

    await syncMaterialsForCourse(courseId)

    expect(mockSupabase.eq).toHaveBeenCalledWith('course_id', courseId)
    expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'approved')
  })
})

describe('syncTopicsForCourse', () => {
  let mockSupabase

  beforeEach(() => {
    jest.clearAllMocks()

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
    }
    createClient.mockReturnValue(mockSupabase)

    indexedDB.putManyInStore = jest.fn().mockResolvedValue(undefined)
    indexedDB.updateLastSyncTime = jest.fn().mockResolvedValue(undefined)
  })

  it('should fetch and store topics for a course', async () => {
    const courseId = 'course-123'
    const mockTopics = [
      {
        id: 't1',
        topic_name: 'Introduction',
        unit_code: 'ENG101',
        year: 1,
        semester: 1,
        course_id: courseId,
      },
      {
        id: 't2',
        topic_name: 'Advanced Topics',
        unit_code: 'ENG102',
        year: 1,
        semester: 2,
        course_id: courseId,
      },
    ]

    // Create a fresh mock chain for this test
    const mockOrderChain = {
      order: jest.fn().mockReturnThis(),
      then: jest.fn().mockResolvedValue({ data: mockTopics, error: null })
    }
    mockOrderChain.order.mockResolvedValue({ data: mockTopics, error: null })

    const mockEqChain = {
      eq: jest.fn().mockReturnValue(mockOrderChain),
      order: mockOrderChain.order
    }
    const mockSelectChain = {
      select: jest.fn().mockReturnValue(mockEqChain),
      eq: mockEqChain.eq,
      order: mockOrderChain.order
    }
    mockSupabase.from = jest.fn().mockReturnValue(mockSelectChain)

    const result = await syncTopicsForCourse(courseId)

    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(2)

    expect(indexedDB.putManyInStore).toHaveBeenCalledWith(
      indexedDB.STORES.TOPICS,
      expect.arrayContaining([
        expect.objectContaining({ id: 't1', topic_name: 'Introduction' }),
        expect.objectContaining({ id: 't2', topic_name: 'Advanced Topics' }),
      ])
    )
  })

  it('should order topics by year, semester, and week', async () => {
    const courseId = 'course-123'

    // Track order calls
    const orderCalls = []
    const mockOrderFn = jest.fn((field, options) => {
      orderCalls.push({ field, options })
      return mockOrderChain
    })

    const mockOrderChain = {
      order: mockOrderFn
    }
    mockOrderFn.mockResolvedValue({ data: [], error: null })

    const mockEqChain = {
      eq: jest.fn().mockReturnValue(mockOrderChain),
      order: mockOrderFn
    }
    const mockSelectChain = {
      select: jest.fn().mockReturnValue(mockEqChain),
      eq: mockEqChain.eq,
      order: mockOrderFn
    }
    mockSupabase.from = jest.fn().mockReturnValue(mockSelectChain)

    await syncTopicsForCourse(courseId)

    // Verify all three order calls were made
    expect(orderCalls.length).toBeGreaterThanOrEqual(3)
    expect(orderCalls).toEqual(expect.arrayContaining([
      { field: 'year', options: { ascending: true, nullsFirst: false } },
      { field: 'semester', options: { ascending: true, nullsFirst: false } },
      { field: 'week_number', options: { ascending: true, nullsFirst: false } },
    ]))
  })
})

describe('Offline-first getter functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getCourses', () => {
    it('should return courses from IndexedDB', async () => {
      const mockCourses = [
        { id: '1', course_name: 'Course 1', _syncedAt: Date.now() },
      ]

      indexedDB.getAllFromStore = jest.fn().mockResolvedValue(mockCourses)
      indexedDB.getLastSyncTime = jest.fn().mockResolvedValue(Date.now() - 1000)

      const result = await getCourses()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockCourses)
      expect(result.lastSync).toBeDefined()
      expect(result.isStale).toBe(false) // Less than 30 minutes
    })

    it('should mark data as stale if older than 30 minutes', async () => {
      const thirtyOneMinutesAgo = Date.now() - (31 * 60 * 1000)

      indexedDB.getAllFromStore = jest.fn().mockResolvedValue([])
      indexedDB.getLastSyncTime = jest.fn().mockResolvedValue(thirtyOneMinutesAgo)

      const result = await getCourses()

      expect(result.isStale).toBe(true)
    })
  })

  describe('getMaterialsForCourse', () => {
    it('should return materials from IndexedDB', async () => {
      const courseId = 'course-123'
      const mockMaterials = [
        { id: 'm1', title: 'Material', course_id: courseId, _syncedAt: Date.now() },
      ]

      indexedDB.getByIndex = jest.fn().mockResolvedValue(mockMaterials)
      indexedDB.getLastSyncTime = jest.fn().mockResolvedValue(Date.now())

      const result = await getMaterialsForCourse(courseId)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockMaterials)
      expect(indexedDB.getByIndex).toHaveBeenCalledWith(
        indexedDB.STORES.MATERIALS,
        'course_id',
        courseId
      )
    })
  })

  describe('getTopicsForCourse', () => {
    it('should return topics from IndexedDB', async () => {
      const courseId = 'course-123'
      const mockTopics = [
        { id: 't1', topic_name: 'Topic', course_id: courseId, _syncedAt: Date.now() },
      ]

      indexedDB.getByIndex = jest.fn().mockResolvedValue(mockTopics)
      indexedDB.getLastSyncTime = jest.fn().mockResolvedValue(Date.now())

      const result = await getTopicsForCourse(courseId)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockTopics)
    })
  })
})
