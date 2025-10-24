'use client'

import { useState, useEffect } from 'react'
import { useCachedFile } from '@/lib/hooks/useCachedFile'

/**
 * Material Card component with smart file caching
 * Downloads files only once, then serves from IndexedDB cache
 */
export default function MaterialCard({ material, getCategoryIcon, getFileIcon, getCategoryLabel }) {
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

  const handleClick = (e) => {
    e.preventDefault()
    openFile(material.id, material.file_url, material.title, material.storage_location || 'supabase')
  }

  return (
    <div
      onClick={handleClick}
      className="block bg-white hover:bg-gray-50 border border-gray-200 rounded-lg p-4 transition shadow-sm hover:shadow-md cursor-pointer relative"
    >
      {/* Download Progress Bar */}
      {isDownloading && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 rounded-t-lg overflow-hidden">
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
            <h3 className="font-semibold text-gray-900">{material.title}</h3>
            <div className="flex items-center gap-2">
              {/* Cached Indicator */}
              {isCached && !isDownloading && (
                <span className="inline-block bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full whitespace-nowrap flex items-center gap-1">
                  <span>💾</span>
                  <span>Cached</span>
                </span>
              )}
              {/* Category Label */}
              {getCategoryLabel(material) && (
                <span className="inline-block bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full whitespace-nowrap">
                  {getCategoryLabel(material)}
                </span>
              )}
            </div>
          </div>

          {/* Download Status */}
          {isDownloading && (
            <div className="text-xs text-blue-600 mb-1">
              {progress < 100 ? `Downloading... ${progress}%` : 'Opening file...'}
            </div>
          )}

          {material.description && (
            <p className="text-sm text-gray-600 mt-1">{material.description}</p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Uploaded by {material.uploaded_by || 'Anonymous'} • {new Date(material.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  )
}
