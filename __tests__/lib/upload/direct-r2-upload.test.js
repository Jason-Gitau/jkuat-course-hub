import { uploadToR2Direct, completeUpload, performFullUpload } from '@/lib/upload/direct-r2-upload'

// Mock fetch
global.fetch = jest.fn()

// Mock XMLHttpRequest
class MockXMLHttpRequest {
  constructor() {
    this.upload = {
      addEventListener: jest.fn(function(event, handler) {
        this[event] = handler
      })
    }
    this.addEventListener = jest.fn(function(event, handler) {
      this[event] = handler
    })
    this.setRequestHeader = jest.fn()
    this.open = jest.fn()
    this.send = jest.fn(function(file) {
      // Simulate successful upload
      if (this.upload.progress) {
        this.upload.progress({ lengthComputable: true, loaded: file.size, total: file.size })
      }
      if (this.load) {
        setTimeout(() => this.load(), 0)
      }
    })
  }
}

global.XMLHttpRequest = MockXMLHttpRequest

describe('direct-r2-upload', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    fetch.mockClear()
  })

  describe('uploadToR2Direct', () => {
    test('should upload file directly to R2', async () => {
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

      // Mock presigned URL endpoint
      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          uploadUrl: 'https://bucket.r2.cloudflarestorage.com/upload?sig=...',
          key: 'uploads/123-abc/test.pdf'
        })
      })

      const onProgress = jest.fn()
      const result = await uploadToR2Direct(file, onProgress)

      expect(result).toMatchObject({
        key: 'uploads/123-abc/test.pdf',
        fileSize: file.size,
        fileName: 'test.pdf',
        contentType: 'application/pdf'
      })

      // Verify presigned URL was requested
      expect(fetch).toHaveBeenCalledWith(
        '/api/upload/presigned-url',
        expect.objectContaining({
          method: 'POST'
        })
      )
    })

    test('should track upload progress', async () => {
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          uploadUrl: 'https://bucket.r2.cloudflarestorage.com/upload?sig=...',
          key: 'uploads/123-abc/test.pdf'
        })
      })

      const onProgress = jest.fn()
      await uploadToR2Direct(file, onProgress)

      // Progress should have been called
      expect(onProgress).toHaveBeenCalled()
    })

    test('should throw error if presigned URL request fails', async () => {
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

      fetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValue({
          error: 'File type not allowed'
        })
      })

      await expect(uploadToR2Direct(file)).rejects.toThrow('File type not allowed')
    })

    test('should handle network errors', async () => {
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

      fetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(uploadToR2Direct(file)).rejects.toThrow('Network error')
    })

    test('should validate file type', async () => {
      const file = new File(['test content'], 'test.exe', { type: 'application/x-msdownload' })

      fetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValue({
          error: 'Invalid file type'
        })
      })

      await expect(uploadToR2Direct(file)).rejects.toThrow('Invalid file type')
    })

    test('should validate file size limit', async () => {
      const largeFile = new File(['x'.repeat(51 * 1024 * 1024)], 'huge.pdf', {
        type: 'application/pdf'
      })

      fetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValue({
          error: 'File too large'
        })
      })

      await expect(uploadToR2Direct(largeFile)).rejects.toThrow('File too large')
    })
  })

  describe('completeUpload', () => {
    test('should save metadata after upload', async () => {
      const uploadData = {
        key: 'uploads/123-abc/test.pdf',
        fileName: 'test.pdf',
        fileSize: 1024,
        contentType: 'application/pdf'
      }

      const metadata = {
        courseId: 'course-123',
        topicId: 'topic-456',
        title: 'Test Material',
        description: 'A test material',
        materialCategory: 'notes',
        uploaderName: 'John Doe'
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          material: {
            id: 'material-123',
            title: 'Test Material',
            course: { course_name: 'Computer Science' }
          }
        })
      })

      const result = await completeUpload(uploadData, metadata)

      expect(result).toMatchObject({
        id: 'material-123',
        title: 'Test Material'
      })

      // Verify complete endpoint was called
      expect(fetch).toHaveBeenCalledWith(
        '/api/upload/complete',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include'
        })
      )
    })

    test('should throw error if completion fails', async () => {
      const uploadData = {
        key: 'uploads/123-abc/test.pdf',
        fileName: 'test.pdf',
        fileSize: 1024,
        contentType: 'application/pdf'
      }

      const metadata = {
        courseId: 'course-123',
        title: 'Test Material'
      }

      fetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValue({
          error: 'Course not found'
        })
      })

      await expect(completeUpload(uploadData, metadata)).rejects.toThrow('Course not found')
    })

    test('should include auth credentials in request', async () => {
      const uploadData = {
        key: 'uploads/123-abc/test.pdf',
        fileName: 'test.pdf',
        fileSize: 1024,
        contentType: 'application/pdf'
      }

      const metadata = {
        courseId: 'course-123',
        title: 'Test Material'
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          material: { id: 'material-123', title: 'Test Material' }
        })
      })

      await completeUpload(uploadData, metadata)

      const callArgs = fetch.mock.calls[0]
      expect(callArgs[1].credentials).toBe('include')
    })
  })

  describe('performFullUpload', () => {
    test('should perform complete upload workflow', async () => {
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const metadata = {
        courseId: 'course-123',
        title: 'Test Material'
      }

      // Mock presigned URL response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          uploadUrl: 'https://bucket.r2.cloudflarestorage.com/upload?sig=...',
          key: 'uploads/123-abc/test.pdf'
        })
      })

      // Mock completion response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          material: {
            id: 'material-123',
            title: 'Test Material',
            course: { course_name: 'Computer Science' }
          }
        })
      })

      const onProgress = jest.fn()
      const result = await performFullUpload(file, metadata, onProgress)

      expect(result).toMatchObject({
        id: 'material-123',
        title: 'Test Material'
      })

      // Progress should reach 100%
      expect(onProgress).toHaveBeenCalledWith(100)
    })

    test('should report progress correctly', async () => {
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const metadata = { courseId: 'course-123', title: 'Test' }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          uploadUrl: 'https://...',
          key: 'uploads/123/test.pdf'
        })
      })

      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          material: { id: 'mat-123', title: 'Test' }
        })
      })

      const onProgress = jest.fn()
      await performFullUpload(file, metadata, onProgress)

      // Should be called with final 100%
      const calls = onProgress.mock.calls
      expect(calls[calls.length - 1][0]).toBe(100)
    })

    test('should throw error and report progress on failure', async () => {
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const metadata = { courseId: 'course-123', title: 'Test' }

      fetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValue({
          error: 'File type not allowed'
        })
      })

      const onProgress = jest.fn()

      await expect(performFullUpload(file, metadata, onProgress)).rejects.toThrow()
    })

    test('should handle metadata-only errors gracefully', async () => {
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const metadata = { courseId: 'invalid-course', title: 'Test' }

      // File uploads successfully
      fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          uploadUrl: 'https://...',
          key: 'uploads/123/test.pdf'
        })
      })

      // But metadata save fails
      fetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValue({
          error: 'Course not found'
        })
      })

      const onProgress = jest.fn()

      await expect(performFullUpload(file, metadata, onProgress)).rejects.toThrow('Course not found')
    })
  })

  describe('Error Handling', () => {
    test('should provide helpful error messages', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })

      fetch.mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValue({
          error: 'R2 client not configured'
        })
      })

      await expect(uploadToR2Direct(file)).rejects.toThrow('R2 client not configured')
    })

    test('should handle timeout gracefully', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })

      // Simulate timeout
      fetch.mockRejectedValueOnce(new Error('Request timeout'))

      await expect(uploadToR2Direct(file)).rejects.toThrow('Request timeout')
    })
  })

  describe('File Type Validation', () => {
    const validTypes = [
      { type: 'application/pdf', name: 'document.pdf' },
      { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', name: 'doc.docx' },
      { type: 'image/png', name: 'image.png' },
      { type: 'image/jpeg', name: 'image.jpg' }
    ]

    validTypes.forEach(({ type, name }) => {
      test(`should accept ${name}`, async () => {
        const file = new File(['test'], name, { type })

        fetch.mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            uploadUrl: 'https://...',
            key: 'uploads/123/test'
          })
        })

        const result = await uploadToR2Direct(file)
        expect(result.fileName).toBe(name)
      })
    })
  })
})
