'use client'

import { useState, useCallback } from 'react'
import { getCachedFile, cacheFile } from '@/lib/db/indexedDB'

/**
 * Hook for caching and loading files (PDFs, docs) from IndexedDB
 * Downloads files only once, then serves from cache
 *
 * Usage:
 * const { openFile, isDownloading, progress } = useCachedFile()
 * onClick={() => openFile(material.id, material.file_url, material.title)}
 */
export function useCachedFile() {
  const [isDownloading, setIsDownloading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)

  /**
   * Open a file - either from cache or download and cache it
   * @param {string} materialId - Unique material ID
   * @param {string} fileUrl - URL to download from (Supabase or R2)
   * @param {string} fileName - Optional file name for download
   * @param {string} storageLocation - Storage backend ('supabase' or 'r2')
   */
  const openFile = useCallback(async (materialId, fileUrl, fileName = 'file', storageLocation = 'supabase') => {
    try {
      setIsDownloading(true)
      setProgress(0)
      setError(null)

      // Step 1: Check if file is already cached
      const cachedData = await getCachedFile(materialId)

      if (cachedData && cachedData.file_blob) {
        console.log('📂 Loading from cache:', fileName)

        // Create blob URL from cached data
        const blobUrl = URL.createObjectURL(cachedData.file_blob)

        // Open in new tab
        window.open(blobUrl, '_blank')

        setProgress(100)
        setIsDownloading(false)
        return
      }

      // Step 2: File not cached, get fresh download URL
      console.log('⬇️ Downloading file:', fileName)

      // For R2 files, get fresh signed URL from API
      let downloadUrl = fileUrl
      if (storageLocation === 'r2') {
        const urlResponse = await fetch(`/api/materials/${materialId}/download-url`)
        if (urlResponse.ok) {
          const { url } = await urlResponse.json()
          downloadUrl = url
          console.log('🔗 Got fresh R2 signed URL')
        }
      }

      const response = await fetch(downloadUrl)

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`)
      }

      // Get total file size for progress tracking
      const contentLength = response.headers.get('content-length')
      const total = parseInt(contentLength, 10)

      // Read response as stream for progress tracking
      const reader = response.body.getReader()
      const chunks = []
      let receivedLength = 0

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        chunks.push(value)
        receivedLength += value.length

        // Update progress
        if (total) {
          const percent = Math.round((receivedLength / total) * 100)
          setProgress(percent)
        }
      }

      // Combine chunks into single Uint8Array
      const chunksAll = new Uint8Array(receivedLength)
      let position = 0
      for (const chunk of chunks) {
        chunksAll.set(chunk, position)
        position += chunk.length
      }

      // Create blob from downloaded data
      const blob = new Blob([chunksAll], { type: response.headers.get('content-type') || 'application/octet-stream' })

      // Step 3: Cache the file in IndexedDB
      console.log('💾 Caching file:', fileName, `(${(blob.size / 1024 / 1024).toFixed(2)} MB)`)
      await cacheFile(materialId, fileUrl, blob)

      // Step 4: Open the file
      const blobUrl = URL.createObjectURL(blob)
      window.open(blobUrl, '_blank')

      setProgress(100)
      setIsDownloading(false)

      console.log('✅ File cached and opened successfully')
    } catch (err) {
      console.error('Error opening file:', err)
      setError(err.message)
      setIsDownloading(false)
      setProgress(0)

      // Fallback: try opening the original URL
      console.log('⚠️ Falling back to direct URL')
      window.open(fileUrl, '_blank')
    }
  }, [])

  /**
   * Check if a file is cached
   */
  const isFileCached = useCallback(async (materialId) => {
    const cachedData = await getCachedFile(materialId)
    return !!cachedData
  }, [])

  return {
    openFile,
    isDownloading,
    progress,
    error,
    isFileCached,
  }
}
