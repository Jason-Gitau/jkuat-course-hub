'use client'

import { useRouter } from 'next/navigation'
import { useCachedFile } from '@/lib/hooks/useCachedFile'

/**
 * Material Card component with smart file caching
 * Downloads files only once, then serves from IndexedDB cache
 */
export default function MaterialCard({ material, getCategoryIcon, getFileIcon, getCategoryLabel }) {
  const router = useRouter()
  const { isDownloading, progress } = useCachedFile()

  const handleView = (e) => {
    e.preventDefault()
    e.stopPropagation()
    router.push(`/materials/${material.id}/view`)
  }

  return (
    <div
      className="block bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg p-4 transition shadow-sm hover:shadow-md"
    >

      <div className="flex items-start gap-3">
        <span className="text-2xl">
          {material.material_category ? getCategoryIcon(material.material_category) : getFileIcon(material.type)}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">{material.title}</h3>
            {/* Category Label */}
            {getCategoryLabel(material) && (
              <span className="inline-block bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs px-2 py-1 rounded-full whitespace-nowrap shrink-0">
                {getCategoryLabel(material)}
              </span>
            )}
          </div>

          {material.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{material.description}</p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Uploaded by {material.uploaded_by || 'Anonymous'} • {new Date(material.created_at).toLocaleDateString()}
          </p>

          {/* Action Button */}
          <button
            onClick={handleView}
            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition flex items-center justify-center gap-1 mt-4"
          >
            <span>👁️</span>
            <span>View Document</span>
          </button>
        </div>
      </div>
    </div>
  )
}
