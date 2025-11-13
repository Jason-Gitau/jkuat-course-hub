'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getAllUploads,
  getQueueStats,
  retryUpload,
  cancelUpload,
  onUploadEvent,
  clearAllFailed,
  clearAllCompleted,
} from '@/lib/uploadQueue';

export default function UploadQueue() {
  const [uploads, setUploads] = useState([]);
  const [stats, setStats] = useState({ pending: 0, uploading: 0, completed: 0, failed: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const isMountedRef = useRef(true);

  // Load uploads and stats
  const loadQueue = useCallback(async () => {
    try {
      const [allUploads, queueStats] = await Promise.all([
        getAllUploads(),
        getQueueStats(),
      ]);

      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setUploads(allUploads.sort((a, b) => b.created_at - a.created_at));
        setStats(queueStats);

        // Show queue if there are active uploads
        if (queueStats.pending > 0 || queueStats.uploading > 0 || queueStats.failed > 0) {
          setIsVisible(true);
        }
      }
    } catch (error) {
      console.error('Error loading upload queue:', error);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    loadQueue();

    // Subscribe to upload events
    const unsubscribe = onUploadEvent((event, data) => {
      loadQueue(); // Reload queue on any event
    });

    // Refresh queue periodically
    const interval = setInterval(loadQueue, 3000);

    return () => {
      isMountedRef.current = false;
      unsubscribe();
      clearInterval(interval);
    };
  }, [loadQueue]);

  const handleRetry = async (id) => {
    try {
      await retryUpload(id);
      loadQueue();
    } catch (error) {
      console.error('Error retrying upload:', error);
    }
  };

  const handleCancel = async (id) => {
    try {
      await cancelUpload(id);
      loadQueue();
    } catch (error) {
      console.error('Error canceling upload:', error);
    }
  };

  const handleClearFailed = async () => {
    if (!confirm('Clear all failed uploads? This cannot be undone.')) return;
    try {
      await clearAllFailed();
      loadQueue();
    } catch (error) {
      console.error('Error clearing failed uploads:', error);
    }
  };

  const handleClearCompleted = async () => {
    try {
      await clearAllCompleted();
      loadQueue();
    } catch (error) {
      console.error('Error clearing completed uploads:', error);
    }
  };

  const handleClose = () => {
    // Only hide if no active uploads
    if (stats.pending === 0 && stats.uploading === 0) {
      setIsVisible(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  const hasActiveUploads = stats.pending > 0 || stats.uploading > 0;

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white border-2 border-gray-300 rounded-lg shadow-2xl z-50">
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-3 rounded-t-lg flex items-center justify-between cursor-pointer"
           onClick={() => setIsMinimized(!isMinimized)}>
        <div className="flex items-center gap-2">
          <span className="text-lg">📤</span>
          <div>
            <h3 className="font-semibold">Upload Queue</h3>
            <p className="text-xs text-blue-100">
              {stats.uploading > 0 && `${stats.uploading} uploading`}
              {stats.uploading > 0 && stats.pending > 0 && ', '}
              {stats.pending > 0 && `${stats.pending} pending`}
              {!hasActiveUploads && stats.completed > 0 && `${stats.completed} completed`}
              {stats.failed > 0 && `, ${stats.failed} failed`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Clear Failed Button - Sleek Icon Only */}
          {stats.failed > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClearFailed();
              }}
              className="text-white hover:bg-red-500 rounded px-1.5 py-1 transition-colors"
              title={`Clear ${stats.failed} failed upload${stats.failed > 1 ? 's' : ''}`}
            >
              🗑️
            </button>
          )}

          {/* Clear Completed Button - Sleek Icon Only */}
          {stats.completed > 0 && !hasActiveUploads && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClearCompleted();
              }}
              className="text-white hover:bg-blue-700 rounded px-1.5 py-1 transition-colors opacity-60 hover:opacity-100"
              title={`Clear ${stats.completed} completed upload${stats.completed > 1 ? 's' : ''}`}
            >
              ✓
            </button>
          )}

          {/* Minimize Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
            className="text-white hover:bg-blue-700 rounded px-2 py-1"
          >
            {isMinimized ? '▲' : '▼'}
          </button>

          {/* Close Button */}
          {!hasActiveUploads && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="text-white hover:bg-blue-700 rounded px-2 py-1"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="max-h-96 overflow-y-auto">
          {uploads.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No uploads in queue</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {uploads.map((upload) => (
                <UploadItem
                  key={upload.id}
                  upload={upload}
                  onRetry={handleRetry}
                  onCancel={handleCancel}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UploadItem({ upload, onRetry, onCancel }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-700';
      case 'uploading': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'failed': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'uploading': return '⬆️';
      case 'completed': return '✅';
      case 'failed': return '❌';
      default: return '📄';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="p-4 hover:bg-gray-50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* File name */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{getStatusIcon(upload.status)}</span>
            <p className="font-medium text-sm text-gray-900 truncate">
              {upload.metadata?.title || upload.file_name}
            </p>
          </div>

          {/* File details */}
          <p className="text-xs text-gray-500 mb-2">
            {upload.file_name} • {formatFileSize(upload.file_size)}
          </p>

          {/* Status badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(upload.status)}`}>
              {upload.status.charAt(0).toUpperCase() + upload.status.slice(1)}
            </span>
            {upload.retry_count > 0 && (
              <span className="text-xs text-gray-500">
                Retry {upload.retry_count}/3
              </span>
            )}
          </div>

          {/* Progress bar for uploading */}
          {upload.status === 'uploading' && (
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${upload.progress}%` }}
              ></div>
            </div>
          )}

          {/* Error message */}
          {upload.status === 'failed' && upload.error && (
            <p className="text-xs text-red-600 mt-1">
              {upload.error}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1">
          {upload.status === 'failed' && (
            <button
              onClick={() => onRetry(upload.id)}
              className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
            >
              Retry
            </button>
          )}
          {(upload.status === 'pending' || upload.status === 'failed') && (
            <button
              onClick={() => onCancel(upload.id)}
              className="text-xs bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
