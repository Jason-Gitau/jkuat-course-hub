/**
 * Direct R2 Upload Handler
 * Handles client-to-R2 uploads using presigned URLs
 * Bypasses Vercel's 4.5 MB serverless function limit
 */

/**
 * Upload a file directly to R2 using a presigned URL
 * @param {File} file - File to upload
 * @param {Function} onProgress - Progress callback: (percentage: number) => void
 * @returns {Promise<{key: string, fileSize: number}>}
 */
export async function uploadToR2Direct(file, onProgress) {
  try {
    // Step 1: Get presigned URL from our API
    console.log('📋 Requesting presigned URL...')
    const presignedResponse = await fetch('/api/upload/presigned-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        fileSize: file.size
      })
    })

    if (!presignedResponse.ok) {
      const error = await presignedResponse.json()
      throw new Error(error.error || 'Failed to get presigned URL')
    }

    const { uploadUrl, key } = await presignedResponse.json()
    console.log('✅ Presigned URL received')

    // Step 2: Upload directly to R2
    console.log('⬆️ Uploading to R2...')
    const uploadResponse = await uploadFileToPresignedUrl(file, uploadUrl, onProgress)

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed with status ${uploadResponse.status}`)
    }

    console.log('✅ File uploaded to R2')

    return {
      key,
      fileSize: file.size,
      fileName: file.name,
      contentType: file.type
    }

  } catch (error) {
    console.error('❌ Direct R2 upload failed:', error)
    throw error
  }
}

/**
 * Upload file to presigned URL with progress tracking
 * @private
 */
function uploadFileToPresignedUrl(file, presignedUrl, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentage = (e.loaded / e.total) * 100
        onProgress?.(percentage)
      }
    })

    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100)
        resolve({ ok: true, status: xhr.status })
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Upload request failed (network error)'))
    })

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload was cancelled'))
    })

    // Start upload
    xhr.open('PUT', presignedUrl)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.send(file)
  })
}

/**
 * Complete an upload by saving metadata
 * @param {Object} uploadData - Data from uploadToR2Direct
 * @param {Object} metadata - Material metadata
 * @returns {Promise<Object>} - Material data from server
 */
export async function completeUpload(uploadData, metadata) {
  try {
    console.log('💾 Saving metadata...')

    const completeResponse = await fetch('/api/upload/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Include auth cookies
      body: JSON.stringify({
        key: uploadData.key,
        fileName: uploadData.fileName,
        fileSize: uploadData.fileSize,
        contentType: uploadData.contentType,
        ...metadata
      })
    })

    if (!completeResponse.ok) {
      const error = await completeResponse.json()
      throw new Error(error.error || 'Failed to complete upload')
    }

    const result = await completeResponse.json()
    console.log('✅ Upload completed and saved')

    return result.material

  } catch (error) {
    console.error('❌ Upload completion failed:', error)
    throw error
  }
}

/**
 * Perform a full upload: direct R2 upload + metadata save
 * @param {File} file - File to upload
 * @param {Object} metadata - Material metadata
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} - Material data
 */
export async function performFullUpload(file, metadata, onProgress) {
  try {
    // Upload to R2
    const uploadData = await uploadToR2Direct(file, (percentage) => {
      // Weight R2 upload as 90% of progress
      onProgress?.(Math.min(percentage * 0.9, 90))
    })

    // Save metadata
    const material = await completeUpload(uploadData, metadata)

    // Final progress
    onProgress?.(100)

    return material

  } catch (error) {
    console.error('❌ Full upload failed:', error)
    throw error
  }
}
