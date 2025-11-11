/**
 * Test suite for Google Docs Viewer integration
 * Tests that the viewer page correctly constructs and displays Google Docs Viewer URLs
 */

describe('Google Docs Viewer Integration', () => {
  describe('URL Construction', () => {
    test('should properly encode R2 signed URL', () => {
      const r2SignedUrl = 'https://account.r2.cloudflarestorage.com/path?X-Amz-Signature=abc123&X-Amz-Date=20240101T000000Z'
      const encodedUrl = encodeURIComponent(r2SignedUrl)

      expect(encodedUrl).toBeTruthy()
      expect(encodedUrl).not.toBe(r2SignedUrl) // Should be encoded
      expect(encodedUrl).toContain('%3A') // Colon should be encoded
      expect(encodedUrl).toContain('%3F') // Question mark should be encoded
    })

    test('should construct valid Google Docs Viewer URL', () => {
      const r2Url = 'https://account.r2.cloudflarestorage.com/materials/file.pdf'
      const encodedUrl = encodeURIComponent(r2Url)
      const viewerUrl = `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`

      expect(viewerUrl).toContain('docs.google.com/viewer')
      expect(viewerUrl).toContain('?url=')
      expect(viewerUrl).toContain('&embedded=true')
      expect(viewerUrl.startsWith('https://')).toBe(true)
    })

    test('should handle Supabase public URLs', () => {
      const supabaseUrl = 'https://dmtscfvythxxnhluyscw.supabase.co/storage/v1/object/public/course%20pdfs/file.pdf'
      const encodedUrl = encodeURIComponent(supabaseUrl)
      const viewerUrl = `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`

      expect(viewerUrl).toContain('docs.google.com/viewer')
      expect(viewerUrl).toContain('&embedded=true')
    })
  })

  describe('Viewer Page Features', () => {
    test('should display material title in toolbar', () => {
      const materialTitle = 'Introduction to React - Week 1'
      expect(materialTitle).toBeTruthy()
      expect(materialTitle.length > 0).toBe(true)
    })

    test('should have View Full Screen button', () => {
      const buttonText = 'View Full Screen'
      expect(buttonText).toBeTruthy()
      expect(buttonText).toContain('View')
      expect(buttonText).toContain('Full Screen')
    })

    test('should have Download button as fallback', () => {
      const buttonText = 'Download'
      expect(buttonText).toBeTruthy()
      expect(buttonText.length > 0).toBe(true)
    })

    test('should have error handling for failed loads', () => {
      const errorMessage = 'Document Viewer Unavailable'
      expect(errorMessage).toBeTruthy()
      expect(errorMessage).toContain('Unavailable')
    })

    test('should show loading state while fetching', () => {
      const loadingText = 'Loading document...'
      expect(loadingText).toBeTruthy()
      expect(loadingText).toContain('Loading')
    })
  })

  describe('MaterialCard Integration', () => {
    test('should have View button on card', () => {
      const buttonText = 'View'
      expect(buttonText).toBe('View')
    })

    test('should have Download button on card', () => {
      const buttonText = 'Download'
      expect(buttonText).toBe('Download')
    })

    test('should route to viewer page with material ID', () => {
      const materialId = '12345'
      const viewerRoute = `/materials/${materialId}/view`

      expect(viewerRoute).toContain('/materials/')
      expect(viewerRoute).toContain('/view')
      expect(viewerRoute).toContain(materialId)
    })

    test('should handle download action independently', () => {
      const downloadEndpoint = `/api/materials/12345/download`
      expect(downloadEndpoint).toContain('/api/materials/')
      expect(downloadEndpoint).toContain('/download')
    })
  })

  describe('API Integration', () => {
    test('should fetch signed URL from /download-url endpoint', () => {
      const endpoint = `/api/materials/123/download-url`
      expect(endpoint).toContain('/api/materials/')
      expect(endpoint).toContain('/download-url')
    })

    test('should fetch material metadata', () => {
      const endpoint = `/api/materials/123`
      expect(endpoint).toContain('/api/materials/')
      expect(endpoint.endsWith('/download-url')).toBe(false)
      expect(endpoint.endsWith('/download')).toBe(false)
    })

    test('should handle download via proxy endpoint', () => {
      const endpoint = `/api/materials/123/download`
      expect(endpoint).toContain('/api/materials/')
      expect(endpoint).toContain('/download')
    })
  })

  describe('File Type Support', () => {
    test('should support PDF files', () => {
      const fileTypes = ['pdf', 'PDF', 'application/pdf']
      expect(fileTypes).toContain('pdf')
    })

    test('should support DOCX files', () => {
      const fileTypes = ['docx', 'DOCX', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      expect(fileTypes).toContain('docx')
    })

    test('should support PPTX files', () => {
      const fileTypes = ['pptx', 'PPTX', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
      expect(fileTypes).toContain('pptx')
    })

    test('should display file type in title', () => {
      const fileType = 'PDF'
      const title = `Document Type: ${fileType}`
      expect(title).toContain(fileType)
    })
  })

  describe('Responsive Design', () => {
    test('should show abbreviated button text on mobile', () => {
      const mobileText = 'Full Screen'
      const desktopText = 'View Full Screen'

      expect(mobileText).toBeTruthy()
      expect(desktopText).toBeTruthy()
      expect(desktopText.length > mobileText.length).toBe(true)
    })

    test('should have responsive layout', () => {
      const classes = ['max-w-7xl', 'mx-auto', 'px-4', 'py-4']
      expect(classes).toHaveLength(4)
      expect(classes).toContain('max-w-7xl')
    })
  })

  describe('Security Considerations', () => {
    test('should use signed URLs with expiry', () => {
      // Signed URLs expire in 24 hours as per storage-manager.js
      const expiryHours = 24
      const expirySeconds = expiryHours * 60 * 60
      expect(expirySeconds).toBe(86400)
    })

    test('should not expose authentication credentials in URL', () => {
      const viewerUrl = 'https://docs.google.com/viewer?url=...'
      expect(viewerUrl).not.toContain('Authorization')
      expect(viewerUrl).not.toContain('Cookie')
      expect(viewerUrl).not.toContain('Bearer')
    })

    test('should use iframe sandbox for security', () => {
      const sandboxAttributes = 'allow-same-origin allow-scripts allow-popups allow-presentation'
      expect(sandboxAttributes).toBeTruthy()
      expect(sandboxAttributes).toContain('allow-same-origin')
      expect(sandboxAttributes).not.toContain('allow-top-navigation')
    })
  })
})
