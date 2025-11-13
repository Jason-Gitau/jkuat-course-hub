/**
 * Upload Queue Manager
 * Handles background upload processing with retry logic
 */

import { STORES, putInStore, getUploadsByStatus, updateUploadProgress, deleteFromStore } from './db/indexedDB';

// Upload queue configuration
const CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAYS: [1000, 3000, 5000], // Exponential backoff in ms
  MAX_PARALLEL_UPLOADS: 2, // Process 2 uploads simultaneously
  POLL_INTERVAL: 2000, // Check for new uploads every 2 seconds
};

// Global state
let isProcessing = false;
let processingQueue = new Set();
let eventListeners = [];

/**
 * Add a file to the upload queue
 */
export async function addToUploadQueue(fileBlob, metadata) {
  const queueItem = {
    file_blob: fileBlob,
    file_name: fileBlob.name,
    file_size: fileBlob.size,
    file_type: fileBlob.type,
    metadata: metadata, // {courseId, topicId, title, description, category, etc.}
    status: 'pending',
    progress: 0,
    retry_count: 0,
    error: null,
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  try {
    await putInStore(STORES.UPLOAD_QUEUE, queueItem);
    notifyListeners('queue_updated');

    // Start processing if not already running
    if (!isProcessing) {
      startProcessing();
    }

    return queueItem;
  } catch (error) {
    // Handle storage quota exceeded
    if (error.name === 'QuotaExceededError') {
      throw new Error('Storage quota exceeded. Please clear some space or upload directly.');
    }
    throw error;
  }
}

/**
 * Start the background upload processor
 */
export function startProcessing() {
  if (isProcessing) return;

  isProcessing = true;
  processQueue();
}

/**
 * Stop the background upload processor
 */
export function stopProcessing() {
  isProcessing = false;
}

/**
 * Main queue processing loop
 */
async function processQueue() {
  while (isProcessing) {
    try {
      const pendingUploads = await getUploadsByStatus('pending');

      // Process uploads in parallel (up to MAX_PARALLEL_UPLOADS)
      const availableSlots = CONFIG.MAX_PARALLEL_UPLOADS - processingQueue.size;
      const uploadsToProcess = pendingUploads.slice(0, availableSlots);

      for (const upload of uploadsToProcess) {
        if (!processingQueue.has(upload.id)) {
          processingQueue.add(upload.id);
          processUpload(upload).finally(() => {
            processingQueue.delete(upload.id);
          });
        }
      }

      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, CONFIG.POLL_INTERVAL));
    } catch (error) {
      console.error('Error in queue processor:', error);
      await new Promise(resolve => setTimeout(resolve, CONFIG.POLL_INTERVAL));
    }
  }
}

/**
 * Process a single upload with retry logic
 */
async function processUpload(upload) {
  try {
    // Check if online before attempting upload
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.log(`⚠️ Offline - skipping upload for ${upload.file_name}`);
      return; // Keep in pending state, will retry when online
    }

    // Update status to uploading
    await updateUploadProgress(upload.id, { status: 'uploading', progress: 0 });
    notifyListeners('upload_started', upload);

    // Create FormData from the queued item
    const formData = new FormData();
    formData.append('file', upload.file_blob, upload.file_name);

    // Add all metadata fields
    const metadata = upload.metadata;
    formData.append('course_id', metadata.courseId);
    if (metadata.topicId) formData.append('topic_id', metadata.topicId);
    formData.append('title', metadata.title);
    if (metadata.description) formData.append('description', metadata.description);
    if (metadata.category) formData.append('material_category', metadata.category);
    if (metadata.categoryMetadata) {
      formData.append('category_metadata', JSON.stringify(metadata.categoryMetadata));
    }
    if (metadata.weekNumber) formData.append('week_number', metadata.weekNumber);
    if (metadata.uploaderName) formData.append('uploader_name', metadata.uploaderName);
    if (metadata.userId) formData.append('user_id', metadata.userId);
    if (metadata.uploaderYear) formData.append('uploader_year', metadata.uploaderYear);
    if (metadata.uploaderCourseId) formData.append('uploader_course_id', metadata.uploaderCourseId);

    // Upload with progress tracking
    const result = await uploadWithProgress(formData, (progress) => {
      updateUploadProgress(upload.id, { progress });
      notifyListeners('upload_progress', { ...upload, progress });
    });

    if (result.success) {
      // Upload succeeded
      await updateUploadProgress(upload.id, {
        status: 'completed',
        progress: 100,
        completed_at: Date.now(),
        result: result.data,
      });
      notifyListeners('upload_completed', { ...upload, result: result.data });

      // Auto-cleanup completed uploads after 5 minutes
      setTimeout(async () => {
        try {
          await deleteFromStore(STORES.UPLOAD_QUEUE, upload.id);
          notifyListeners('queue_updated');
        } catch (e) {
          console.warn('Failed to cleanup completed upload:', e);
        }
      }, 5 * 60 * 1000);
    } else {
      throw new Error(result.error || 'Upload failed');
    }
  } catch (error) {
    console.error(`Upload failed for ${upload.file_name}:`, error);

    // Retry logic
    if (upload.retry_count < CONFIG.MAX_RETRIES) {
      const retryDelay = CONFIG.RETRY_DELAYS[upload.retry_count] || 5000;
      await updateUploadProgress(upload.id, {
        status: 'pending',
        retry_count: upload.retry_count + 1,
        error: error.message,
      });

      notifyListeners('upload_retry', { ...upload, error: error.message });

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    } else {
      // Max retries reached
      await updateUploadProgress(upload.id, {
        status: 'failed',
        error: error.message,
      });
      notifyListeners('upload_failed', { ...upload, error: error.message });
    }
  }
}

/**
 * Upload with XMLHttpRequest for progress tracking
 */
function uploadWithProgress(formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const progress = Math.round((e.loaded / e.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve({ success: true, data: response });
        } catch (e) {
          resolve({ success: true, data: { message: xhr.responseText } });
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.error || `HTTP ${xhr.status}`));
        } catch (e) {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });

    xhr.open('POST', '/api/upload');
    xhr.send(formData);
  });
}

/**
 * Get current queue statistics
 */
export async function getQueueStats() {
  const pending = await getUploadsByStatus('pending');
  const uploading = await getUploadsByStatus('uploading');
  const completed = await getUploadsByStatus('completed');
  const failed = await getUploadsByStatus('failed');

  return {
    pending: pending.length,
    uploading: uploading.length,
    completed: completed.length,
    failed: failed.length,
    total: pending.length + uploading.length + completed.length + failed.length,
  };
}

/**
 * Get all uploads (for UI display)
 */
export async function getAllUploads() {
  return await getUploadsByStatus();
}

/**
 * Retry a failed upload
 */
export async function retryUpload(id) {
  await updateUploadProgress(id, {
    status: 'pending',
    retry_count: 0,
    error: null,
  });
  notifyListeners('queue_updated');

  if (!isProcessing) {
    startProcessing();
  }
}

/**
 * Cancel/remove an upload from the queue
 */
export async function cancelUpload(id) {
  await deleteFromStore(STORES.UPLOAD_QUEUE, id);
  notifyListeners('queue_updated');
}

/**
 * Subscribe to upload events
 */
export function onUploadEvent(callback) {
  eventListeners.push(callback);

  // Return unsubscribe function
  return () => {
    eventListeners = eventListeners.filter(cb => cb !== callback);
  };
}

/**
 * Notify all event listeners
 */
function notifyListeners(event, data) {
  eventListeners.forEach(callback => {
    try {
      callback(event, data);
    } catch (error) {
      console.error('Error in upload event listener:', error);
    }
  });
}

/**
 * Initialize the upload queue system
 */
export function initUploadQueue() {
  if (typeof window === 'undefined') {
    return; // Not in browser
  }

  // Check for IndexedDB support
  if (!window.indexedDB) {
    console.warn('Upload queue: IndexedDB not supported in this browser');
    return;
  }

  // Auto-start processing on page load
  startProcessing();

  // Handle online/offline events
  window.addEventListener('online', () => {
    console.log('📶 Connection restored - resuming uploads');
    if (!isProcessing) {
      startProcessing();
    }
  });

  window.addEventListener('offline', () => {
    console.log('📵 Connection lost - uploads will resume when online');
  });

  // Handle page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Page hidden - could pause processing or continue
      // For now, continue processing in background
    } else {
      // Page visible again - ensure processing is active
      if (!isProcessing) {
        startProcessing();
      }
    }
  });

  console.log('📤 Upload queue initialized');
}

/**
 * Clear all failed uploads from the queue
 */
export async function clearAllFailed() {
  try {
    const failedUploads = await getUploadsByStatus('failed');
    for (const upload of failedUploads) {
      await deleteFromStore(STORES.UPLOAD_QUEUE, upload.id);
    }
    notifyListeners('queue_updated');
    console.log(`🗑️ Cleared ${failedUploads.length} failed uploads`);
    return failedUploads.length;
  } catch (error) {
    console.error('Error clearing failed uploads:', error);
    throw error;
  }
}

/**
 * Clear all completed uploads from the queue
 */
export async function clearAllCompleted() {
  try {
    const completedUploads = await getUploadsByStatus('completed');
    for (const upload of completedUploads) {
      await deleteFromStore(STORES.UPLOAD_QUEUE, upload.id);
    }
    notifyListeners('queue_updated');
    console.log(`🗑️ Cleared ${completedUploads.length} completed uploads`);
    return completedUploads.length;
  } catch (error) {
    console.error('Error clearing completed uploads:', error);
    throw error;
  }
}
