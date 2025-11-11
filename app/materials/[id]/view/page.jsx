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
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-900">{material?.title}</h1>
            <p className="text-sm text-gray-600">
              {material?.type?.toUpperCase()} • {material?.courses?.course_name}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Open in New Tab Button */}
            <a
              href={viewerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <span>📖</span>
              <span className="hidden sm:inline">View Full Screen</span>
              <span className="sm:hidden">Full Screen</span>
            </a>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2"
            >
              <span>⬇️</span>
              <span className="hidden sm:inline">Download</span>
              <span className="sm:hidden">DL</span>
            </button>

            {/* Back Button */}
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition"
              title="Go back"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* Viewer Content */}
      <div className="flex-1 p-4">
        <div className="max-w-7xl mx-auto h-full">
          {!iframeError ? (
            <div className="bg-white rounded-lg shadow-lg h-full overflow-hidden flex flex-col">
              {/* iframe container */}
              <iframe
                src={viewerUrl}
                title={`View ${material?.title}`}
                className="flex-1 w-full border-0"
                onError={() => {
                  console.error('Iframe failed to load')
                  setIframeError(true)
                }}
                sandbox="allow-same-origin allow-scripts allow-popups allow-presentation"
              />

              {/* Loading indicator */}
              <div className="text-center py-8 text-gray-600 hidden">
                <p>Preparing document for viewing...</p>
              </div>
            </div>
          ) : (
            /* Fallback when iframe fails */
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="text-center">
                <div className="text-gray-600 text-4xl mb-4">📄</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Document Viewer Unavailable</h2>
                <p className="text-gray-600 mb-6">
                  The document viewer is temporarily unavailable for this file. Please download the file to view it locally.
                </p>
                <button
                  onClick={handleDownload}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Download File
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border-t border-blue-200 px-4 py-3">
        <div className="max-w-7xl mx-auto text-sm text-blue-900">
          💡 <strong>Tip:</strong> For the best experience, use "View Full Screen" or download the file to view locally.
        </div>
      </div>
    </div>
  )
}
