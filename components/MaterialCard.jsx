'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCachedFile } from '@/lib/hooks/useCachedFile'

/**
 * Material Card component with smart file caching
 * Downloads files only once, then serves from IndexedDB cache
 */
export default function MaterialCard({ material, getCategoryIcon, getFileIcon, getCategoryLabel }) {
  const router = useRouter()
  const { openFile, isDownloading, progress, isFileCached } = useCachedFile()
  const [isCached, setIsCached] = useState(false)

  // Check if file is already cached on mount
  useEffect(() => {
    async function checkCache() {
      const cached = await isFileCached(material.id)
      setIsCached(cached)
    }
    checkCache()
  }, [material.id, isFileCached])

  const handleDownload = (e) => {
    e.preventDefault()
    e.stopPropagation()
    openFile(material.id, material.file_url, material.title)
  }

  const handleView = (e) => {
    e.preventDefault()
    e.stopPropagation()
    router.push(`/materials/${material.id}/view`)
  }

  return (
    <div
      className="block bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg p-4 transition shadow-sm hover:shadow-md relative"
    >
      {/* Download Progress Bar */}
      {isDownloading && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-t-lg overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex items-start gap-3">
        <span className="text-2xl">
          {material.material_category ? getCategoryIcon(material.material_category) : getFileIcon(material.type)}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">{material.title}</h3>
            <div className="flex items-center gap-2">
              {/* Cached Indicator */}
              {isCached && !isDownloading && (
                <span className="inline-block bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs px-2 py-1 rounded-full whitespace-nowrap flex items-center gap-1">
                  <span>💾</span>
                  <span>Cached</span>
                </span>
              )}
              {/* Category Label */}
              {getCategoryLabel(material) && (
                <span className="inline-block bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs px-2 py-1 rounded-full whitespace-nowrap">
                  {getCategoryLabel(material)}
                </span>
              )}
            </div>
          </div>

          {/* Download Status */}
          {isDownloading && (
            <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">
              {progress < 100 ? `Downloading... ${progress}%` : 'Opening file...'}
            </div>
          )}

          {material.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{material.description}</p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Uploaded by {material.uploaded_by || 'Anonymous'} • {new Date(material.created_at).toLocaleDateString()}
          </p>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleView}
              className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition flex items-center justify-center gap-1"
            >
              <span>👁️</span>
              <span>View</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white text-sm font-medium rounded transition flex items-center justify-center gap-1"
            >
              <span>⬇️</span>
              <span>{isDownloading ? `${progress}%` : 'Download'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
