import { POST } from '@/app/api/upload/complete/route'
import { getServiceRoleClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

// Mock dependencies
jest.mock('@/lib/supabase/server')
jest.mock('@supabase/supabase-js')

describe('/api/upload/complete', () => {
  let mockRequest
  let mockSupabaseService
  let mockSupabaseUser

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock service role client for database writes
    mockSupabaseService = {
      from: jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'material-123',
                title: 'Test Material',
                material_category: 'notes',
                category_metadata: { week: 1 },
                week_number: 1,
                courses: { course_name: 'Computer Science' },
                topics: {
                  topic_name: 'Introduction',
                  unit_code: 'CS101',
                  year: 1,
                  semester: 1
                }
              },
              error: null
            })
          })
        })
      })
    }

    getServiceRoleClient.mockReturnValue(mockSupabaseService)

    // Mock user client for auth
    mockSupabaseUser = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } }
        })
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                year_of_study: 2,
                course_id: 'course-456'
              }
            })
          })
        })
      })
    }

    createClient.mockReturnValue(mockSupabaseUser)

    mockRequest = {
      json: jest.fn(),
      headers: new Map([
        ['cookie', 'auth_token=test']
      ])
    }
    mockRequest.headers.get = (key) => mockRequest.headers.get(key) || null
  })

  describe('Success Cases', () => {
    test('should save material metadata and return material data', async () => {
      const body = {
        key: 'uploads/1234567-abc/test.pdf',
        fileName: 'test.pdf',
        fileSize: 5242880, // 5 MB
        contentType: 'application/pdf',
        courseId: 'course-123',
        topicId: 'topic-456',
        title: 'Lecture Notes Week 1',
        description: 'Introduction to Course',
        uploaderName: 'John Doe',
        materialCategory: 'notes',
        categoryMetadata: { week: 1 },
        weekNumber: 1
      }

      mockRequest.json.mockResolvedValue(body)

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.material.id).toBe('material-123')
      expect(data.material.title).toBe('Test Material')
    })

    test('should handle upload without topic', async () => {
      const body = {
        key: 'uploads/1234567-abc/test.pdf',
        fileName: 'test.pdf',
        fileSize: 5242880,
        contentType: 'application/pdf',
        courseId: 'course-123',
        topicId: null, // No topic
        title: 'General Material',
        uploaderName: 'Jane Doe'
      }

      mockRequest.json.mockResolvedValue(body)

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    test('should handle upload without description', async () => {
      const body = {
        key: 'uploads/1234567-abc/test.pdf',
        fileName: 'test.pdf',
        fileSize: 5242880,
        contentType: 'application/pdf',
        courseId: 'course-123',
        title: 'Material without Description'
        // No description
      }

      mockRequest.json.mockResolvedValue(body)

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    test('should handle anonymous upload (no auth)', async () => {
      mockSupabaseUser.auth.getUser.mockResolvedValue({
        data: { user: null } // No user
      })

      const body = {
        key: 'uploads/1234567-abc/test.pdf',
        fileName: 'test.pdf',
        fileSize: 5242880,
        contentType: 'application/pdf',
        courseId: 'course-123',
        title: 'Anonymous Upload',
        uploaderName: 'Anonymous'
      }

      mockRequest.json.mockResolvedValue(body)

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    test('should save all file types correctly', async () => {
      const fileTypes = [
        { type: 'application/pdf', ext: 'pdf' },
        { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: 'docx' },
        { type: 'application/vnd.ms-powerpoint', ext: 'pptx' },
        { type: 'image/png', ext: 'image' }
      ]

      for (const { type, ext } of fileTypes) {
        mockRequest.json.mockResolvedValue({
          key: `uploads/1234567-abc/test.${ext}`,
          fileName: `test.${ext}`,
          fileSize: 5242880,
          contentType: type,
          courseId: 'course-123',
          title: `Test ${ext}`
        })

        const response = await POST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      }
    })
  })

  describe('Error Cases - Missing Fields', () => {
    test('should return 400 for missing key', async () => {
      const body = {
        // Missing key
        fileName: 'test.pdf',
        fileSize: 5242880,
        contentType: 'application/pdf',
        courseId: 'course-123',
        title: 'Test'
      }

      mockRequest.json.mockResolvedValue(body)

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing')
    })

    test('should return 400 for missing courseId', async () => {
      const body = {
        key: 'uploads/1234567-abc/test.pdf',
        fileName: 'test.pdf',
        fileSize: 5242880,
        contentType: 'application/pdf',
        // Missing courseId
        title: 'Test'
      }

      mockRequest.json.mockResolvedValue(body)

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing')
    })

    test('should return 400 for missing title', async () => {
      const body = {
        key: 'uploads/1234567-abc/test.pdf',
        fileName: 'test.pdf',
        fileSize: 5242880,
        contentType: 'application/pdf',
        courseId: 'course-123'
        // Missing title
      }

      mockRequest.json.mockResolvedValue(body)

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing')
    })
  })

  describe('Error Cases - Database', () => {
    test('should return 500 if database insert fails', async () => {
      mockSupabaseService.from = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Unique constraint violation' }
            })
          })
        })
      })

      getServiceRoleClient.mockReturnValue(mockSupabaseService)

      const body = {
        key: 'uploads/1234567-abc/test.pdf',
        fileName: 'test.pdf',
        fileSize: 5242880,
        contentType: 'application/pdf',
        courseId: 'course-123',
        title: 'Test'
      }

      mockRequest.json.mockResolvedValue(body)

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to save')
    })
  })

  describe('File Type Detection', () => {
    test('should detect PDF files correctly', async () => {
      mockRequest.json.mockResolvedValue({
        key: 'uploads/1234567-abc/document.pdf',
        fileName: 'document.pdf',
        fileSize: 5242880,
        contentType: 'application/pdf',
        courseId: 'course-123',
        title: 'PDF Document'
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      // The insert call should have been made with type: 'pdf'
      const insertCall = mockSupabaseService.from().insert.mock.calls[0]
      expect(insertCall[0].type).toBe('pdf')
    })

    test('should detect DOCX files correctly', async () => {
      mockRequest.json.mockResolvedValue({
        key: 'uploads/1234567-abc/document.docx',
        fileName: 'document.docx',
        fileSize: 5242880,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        courseId: 'course-123',
        title: 'Word Document'
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      const insertCall = mockSupabaseService.from().insert.mock.calls[0]
      expect(insertCall[0].type).toBe('docx')
    })

    test('should detect image files correctly', async () => {
      mockRequest.json.mockResolvedValue({
        key: 'uploads/1234567-abc/image.png',
        fileName: 'image.png',
        fileSize: 1024000,
        contentType: 'image/png',
        courseId: 'course-123',
        title: 'Image'
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      const insertCall = mockSupabaseService.from().insert.mock.calls[0]
      expect(insertCall[0].type).toBe('image')
    })
  })

  describe('Material Category Handling', () => {
    test('should save material with category metadata', async () => {
      const body = {
        key: 'uploads/1234567-abc/test.pdf',
        fileName: 'test.pdf',
        fileSize: 5242880,
        contentType: 'application/pdf',
        courseId: 'course-123',
        title: 'Week 1 Notes',
        materialCategory: 'notes',
        categoryMetadata: { week: 1 }
      }

      mockRequest.json.mockResolvedValue(body)

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      const insertCall = mockSupabaseService.from().insert.mock.calls[0]
      expect(insertCall[0].material_category).toBe('notes')
      expect(insertCall[0].category_metadata).toEqual({ week: 1 })
    })

    test('should save past paper with year metadata', async () => {
      const body = {
        key: 'uploads/1234567-abc/exam.pdf',
        fileName: 'exam.pdf',
        fileSize: 5242880,
        contentType: 'application/pdf',
        courseId: 'course-123',
        title: '2023 Final Exam',
        materialCategory: 'past_paper',
        categoryMetadata: { year: 2023 }
      }

      mockRequest.json.mockResolvedValue(body)

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      const insertCall = mockSupabaseService.from().insert.mock.calls[0]
      expect(insertCall[0].material_category).toBe('past_paper')
    })
  })

  describe('R2 URL Generation', () => {
    test('should generate correct public URL', async () => {
      process.env.R2_PUBLIC_URL = 'https://assets.example.com'

      const body = {
        key: 'uploads/1234567-abc/test.pdf',
        fileName: 'test.pdf',
        fileSize: 5242880,
        contentType: 'application/pdf',
        courseId: 'course-123',
        title: 'Test'
      }

      mockRequest.json.mockResolvedValue(body)

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
      const insertCall = mockSupabaseService.from().insert.mock.calls[0]
      expect(insertCall[0].file_url).toContain('https://assets.example.com')
    })

    test('should store R2 key as storage_path', async () => {
      const key = 'uploads/1234567-abc/document.pdf'

      mockRequest.json.mockResolvedValue({
        key,
        fileName: 'document.pdf',
        fileSize: 5242880,
        contentType: 'application/pdf',
        courseId: 'course-123',
        title: 'Test'
      })

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
      const insertCall = mockSupabaseService.from().insert.mock.calls[0]
      expect(insertCall[0].storage_path).toBe(key)
      expect(insertCall[0].storage_location).toBe('r2')
    })
  })
})
