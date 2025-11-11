'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function MaterialViewerPage() {
  const params = useParams()
  const router = useRouter()
  const [material, setMaterial] = useState(null)
  const [viewerUrl, setViewerUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [iframeError, setIframeError] = useState(false)

  useEffect(() => {
    loadMaterial()
  }, [params.id])

  async function loadMaterial() {
    try {
      setLoading(true)
      setError(null)
      setIframeError(false)

      // Fetch material metadata
      const metaResponse = await fetch(`/api/materials/${params.id}`)
      if (!metaResponse.ok) {
        const errorData = await metaResponse.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to load material (${metaResponse.status})`)
      }
      const materialData = await metaResponse.json()
      setMaterial(materialData)

      // Get signed URL for viewing
      const urlResponse = await fetch(`/api/materials/${params.id}/download-url`)
      if (!urlResponse.ok) {
        const errorData = await urlResponse.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.details || `Failed to generate viewer URL (${urlResponse.status})`)
      }
      const { url } = await urlResponse.json()

      // Construct Google Docs Viewer URL with proper encoding
      const encodedUrl = encodeURIComponent(url)
      const googleViewerUrl = `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`
      setViewerUrl(googleViewerUrl)
    } catch (err) {
      console.error('Error loading material:', {
        message: err.message,
        stack: err.stack,
        materialId: params.id
      })
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDownload() {
    try {
      const response = await fetch(`/api/materials/${params.id}/download`)
      if (!response.ok) throw new Error('Download failed')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = material?.title || 'document'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download error:', err)
      alert('Failed to download file. Please try again.')
    }
  }

  // Check if the file is an image
  const isImage = () => {
    if (!material?.type) return false
    const type = material.type.toLowerCase()
    return type.includes('image') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].some(ext => type.includes(ext))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <div className="text-red-600 text-5xl mb-4">⚠️</div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Material</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex gap-2">
              <button
                onClick={() => router.back()}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
              >
                Go Back
              </button>
              <button
                onClick={loadMaterial}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-100 dark:bg-gray-900 flex flex-col overflow-hidden">
      {/* Compact Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-10">
        <div className="px-3 py-2 sm:px-4 sm:py-3 flex items-center justify-between gap-2">
          {/* Title - Truncated */}
          <div className="flex-1 min-w-0">
            <h1 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate">
              {material?.title}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block truncate">
              {material?.type?.toUpperCase()} • {material?.courses?.course_name}
            </p>
          </div>

          {/* Action Buttons - Icons only on mobile */}
          <div className="flex gap-1 shrink-0">
            {/* Download Button */}
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition flex items-center justify-center text-gray-700 dark:text-gray-300"
              title="Download"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>

            {/* Open in New Tab Button */}
            <a
              href={viewerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition flex items-center justify-center text-gray-700 dark:text-gray-300"
              title="Open in new tab"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>

            {/* Close Button */}
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition flex items-center justify-center text-gray-700 dark:text-gray-300"
              title="Go back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Image Viewer Tip */}
      {isImage() && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-4 py-3">
          <div className="text-sm text-blue-900 dark:text-blue-200">
            💡 <strong>Tip:</strong> For the best viewing experience with images, use the Download button above to save the image and view it in your phone's gallery or image viewer.
          </div>
        </div>
      )}

      {/* Full-Screen Document Viewer */}
      <div className="flex-1 overflow-hidden">
        {!iframeError ? (
          <iframe
            src={viewerUrl}
            title={`View ${material?.title}`}
            className="w-full h-full border-0"
            onError={() => {
              console.error('Iframe failed to load')
              setIframeError(true)
            }}
            sandbox="allow-same-origin allow-scripts allow-popups allow-presentation"
          />
        ) : (
          /* Fallback when iframe fails */
          <div className="w-full h-full flex items-center justify-center bg-white dark:bg-gray-800">
            <div className="text-center p-8">
              <div className="text-gray-600 dark:text-gray-400 text-4xl mb-4">📄</div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Document Viewer Unavailable</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                The document viewer is temporarily unavailable for this file. Please download the file to view it locally.
              </p>
              <button
                onClick={handleDownload}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                Download File
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
