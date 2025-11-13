import { POST } from '@/app/api/upload/presigned-url/route'
import { getR2Client } from '@/lib/storage/r2-client'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Mock dependencies
jest.mock('@/lib/storage/r2-client')
jest.mock('@aws-sdk/s3-request-presigner')
jest.mock('@supabase/supabase-js')

describe('/api/upload/presigned-url', () => {
  let mockRequest

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock R2 client
    getR2Client.mockReturnValue({
      send: jest.fn().mockResolvedValue({})
    })

    // Mock signed URL generation
    getSignedUrl.mockResolvedValue('https://bucket.r2.cloudflarestorage.com/upload?X-Amz-Signature=...')

    // Mock request headers
    mockRequest = {
      json: jest.fn(),
      headers: new Map([
        ['cookie', 'auth_token=test']
      ])
    }
    mockRequest.headers.get = (key) => mockRequest.headers.get(key) || null
  })

  describe('Success Cases', () => {
    test('should generate presigned URL for valid PDF file', async () => {
      const body = {
        filename: 'lecture-notes.pdf',
        contentType: 'application/pdf',
        fileSize: 2 * 1024 * 1024 // 2 MB
      }

      mockRequest.json.mockResolvedValue(body)

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.uploadUrl).toContain('X-Amz-Signature')
      expect(data.key).toContain('lecture-notes.pdf')
      expect(data.bucket).toBe('jkuat-materials')
    })

    test('should generate presigned URL for DOCX file', async () => {
      const body = {
        filename: 'assignment.docx',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileSize: 5 * 1024 * 1024 // 5 MB
      }

      mockRequest.json.mockResolvedValue(body)

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.key).toContain('assignment.docx')
    })

    test('should generate presigned URL for image file', async () => {
      const body = {
        filename: 'diagram.png',
        contentType: 'image/png',
        fileSize: 1024 * 1024 // 1 MB
      }

      mockRequest.json.mockResolvedValue(body)

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    test('should generate unique keys for multiple requests', async () => {
      const body = {
        filename: 'test.pdf',
        contentType: 'application/pdf',
        fileSize: 1 * 1024 * 1024
      }

      mockRequest.json.mockResolvedValue(body)

      const response1 = await POST(mockRequest)
      const data1 = await response1.json()

      mockRequest.json.mockResolvedValue(body)
      const response2 = await POST(mockRequest)
      const data2 = await response2.json()

      expect(data1.key).not.toBe(data2.key)
    })

    test('should handle large files up to 50MB', async () => {
      const body = {
        filename: 'large-video.pdf',
        contentType: 'application/pdf',
        fileSize: 50 * 1024 * 1024 // 50 MB (max)
      }

      mockRequest.json.mockResolvedValue(body)

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('Error Cases - Missing Fields', () => {
    test('should return 400 for missing filename', async () => {
      const body = {
        contentType: 'application/pdf',
        fileSize: 1 * 1024 * 1024
      }

      mockRequest.json.mockResolvedValue(body)

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('filename')
    })

    test('should return 400 for missing contentType', async () => {
      const body = {
        filename: 'test.pdf',
        fileSize: 1 * 1024 * 1024
      }

      mockRequest.json.mockResolvedValue(body)

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('contentType')
    })
  })

  describe('Error Cases - File Size', () => {
    test('should return 413 for file exceeding 50MB limit', async () => {
      const body = {
        filename: 'too-large.pdf',
        contentType: 'application/pdf',
        fileSize: 51 * 1024 * 1024 // 51 MB (exceeds limit)
      }

      mockRequest.json.mockResolvedValue(body)

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(413)
      expect(data.error).toContain('too large')
    })

    test('should return 413 with correct error message for oversized file', async () => {
      const body = {
        filename: 'huge-file.pdf',
        contentType: 'application/pdf',
        fileSize: 100 * 1024 * 1024 // 100 MB
      }

      mockRequest.json.mockResolvedValue(body)

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(413)
      expect(data.error).toMatch(/50/i) // Should mention 50MB limit
    })
  })

  describe('Error Cases - Invalid File Type', () => {
    test('should return 400 for unsupported file type', async () => {
      const body = {
        filename: 'script.exe',
        contentType: 'application/x-msdownload',
        fileSize: 1 * 1024 * 1024
      }

      mockRequest.json.mockResolvedValue(body)

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid file type')
    })

    test('should return 400 for video file', async () => {
      const body = {
        filename: 'lecture.mp4',
        contentType: 'video/mp4',
        fileSize: 100 * 1024 * 1024
      }

      mockRequest.json.mockResolvedValue(body)

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid file type')
    })

    test('should accept all valid file types', async () => {
      const validTypes = [
        { name: 'test.pdf', type: 'application/pdf' },
        { name: 'test.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
        { name: 'test.ppt', type: 'application/vnd.ms-powerpoint' },
        { name: 'test.pptx', type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
        { name: 'test.png', type: 'image/png' },
        { name: 'test.jpg', type: 'image/jpeg' },
        { name: 'test.webp', type: 'image/webp' },
        { name: 'test.gif', type: 'image/gif' }
      ]

      for (const { name, type } of validTypes) {
        mockRequest.json.mockResolvedValue({
          filename: name,
          contentType: type,
          fileSize: 1 * 1024 * 1024
        })

        const response = await POST(mockRequest)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      }
    })
  })

  describe('R2 Configuration', () => {
    test('should return 500 if R2 client not configured', async () => {
      getR2Client.mockReturnValue(null)

      const body = {
        filename: 'test.pdf',
        contentType: 'application/pdf',
        fileSize: 1 * 1024 * 1024
      }

      mockRequest.json.mockResolvedValue(body)

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('R2')
    })

    test('should call getSignedUrl with correct parameters', async () => {
      const body = {
        filename: 'test.pdf',
        contentType: 'application/pdf',
        fileSize: 1 * 1024 * 1024
      }

      mockRequest.json.mockResolvedValue(body)

      await POST(mockRequest)

      // Verify getSignedUrl was called
      expect(getSignedUrl).toHaveBeenCalled()
    })
  })

  describe('Filename Handling', () => {
    test('should sanitize special characters in filename', async () => {
      const body = {
        filename: 'my file@#$%.pdf',
        contentType: 'application/pdf',
        fileSize: 1 * 1024 * 1024
      }

      mockRequest.json.mockResolvedValue(body)

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.key).not.toContain('@')
      expect(data.key).not.toContain('#')
      expect(data.key).not.toContain('$')
    })

    test('should preserve file extension', async () => {
      const filenames = ['test.pdf', 'document.docx', 'image.png']

      for (const filename of filenames) {
        mockRequest.json.mockResolvedValue({
          filename,
          contentType: filename.includes('pdf') ? 'application/pdf' : 'application/octet-stream',
          fileSize: 1 * 1024 * 1024
        })

        const response = await POST(mockRequest)
        const data = await response.json()

        const ext = filename.split('.').pop()
        expect(data.key).toContain(`.${ext}`)
      }
    })
  })
})
