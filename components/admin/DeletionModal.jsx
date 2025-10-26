'use client';

/**
 * Material Deletion Modal with Impact Warnings
 * Shows deletion impact and requires typed confirmation
 */

import { useState, useEffect } from 'react';

export default function DeletionModal({
  isOpen,
  onClose,
  onSuccess,
  materialId,
  materialTitle,
}) {
  const [impactData, setImpactData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deletionType, setDeletionType] = useState('soft'); // 'soft' or 'hard'
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  // Fetch impact data when modal opens
  useEffect(() => {
    if (isOpen && materialId) {
      fetchImpactData();
      setDeletionType('soft');
      setReason('');
      setConfirmText('');
      setError(null);
    }
  }, [isOpen, materialId]);

  async function fetchImpactData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/materials/${materialId}/delete`);
      if (!res.ok) throw new Error('Failed to fetch impact data');
      const data = await res.json();
      setImpactData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    // Validation
    if (reason.trim().length < 10) {
      alert('Deletion reason must be at least 10 characters');
      return;
    }

    if (confirmText !== materialTitle) {
      alert(`Please type "${materialTitle}" to confirm deletion`);
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/materials/${materialId}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deletionType,
          reason: reason.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete material');
      }

      const data = await res.json();
      onSuccess(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsDeleting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="deletion-modal"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative transform overflow-hidden rounded-lg bg-white shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
          {loading ? (
            // Loading State
            <div className="p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          ) : error ? (
            // Error State
            <div className="p-8">
              <div className="text-center">
                <span className="text-4xl">❌</span>
                <h3 className="mt-2 text-lg font-semibold text-gray-900">Error</h3>
                <p className="mt-1 text-sm text-gray-500">{error}</p>
                <button
                  onClick={onClose}
                  className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            // Main Content
            <div>
              {/* Header */}
              <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>⚠️</span>
                  Delete Material
                </h3>
              </div>

              <div className="px-6 py-4 space-y-6">
                {/* Material Info */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Material to delete:</p>
                  <p className="font-semibold text-gray-900">{materialTitle}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Uploaded by {impactData?.impact?.uploadedBy || 'Unknown'}
                  </p>
                </div>

                {/* Impact Warnings */}
                {impactData?.impact && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">Impact Analysis:</h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs text-blue-600 font-medium">Downloads</p>
                        <p className="text-2xl font-bold text-blue-700">
                          {impactData.impact.downloads}
                        </p>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-xs text-green-600 font-medium">Views</p>
                        <p className="text-2xl font-bold text-green-700">
                          {impactData.impact.views}
                        </p>
                      </div>
                    </div>

                    {impactData.warnings?.message && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                        <span className="text-lg">⚠️</span>
                        <p className="text-sm text-yellow-800">
                          {impactData.warnings.message}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Deletion Type Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Deletion Type *
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-start gap-3 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                      <input
                        type="radio"
                        name="deletionType"
                        value="soft"
                        checked={deletionType === 'soft'}
                        onChange={(e) => setDeletionType(e.target.value)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          Soft Delete (Recommended)
                        </p>
                        <p className="text-xs text-gray-500">
                          Move to trash bin. Can be restored within 30 days.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3 border-2 border-red-300 rounded-lg cursor-pointer hover:bg-red-50 transition">
                      <input
                        type="radio"
                        name="deletionType"
                        value="hard"
                        checked={deletionType === 'hard'}
                        onChange={(e) => setDeletionType(e.target.value)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-red-700">
                          Hard Delete (Permanent)
                        </p>
                        <p className="text-xs text-red-600">
                          ⚠️ Permanently remove from database. Cannot be undone!
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Reason Input */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Reason for Deletion *
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Explain why this material is being deleted (min. 10 characters)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    rows={3}
                    disabled={isDeleting}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {reason.length} / 10 characters minimum
                  </p>
                </div>

                {/* Typed Confirmation */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Type Material Name to Confirm *
                  </label>
                  <p className="text-xs text-gray-600 mb-2">
                    Type <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">
                      {materialTitle}
                    </span> to confirm deletion
                  </p>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Type material name here"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    disabled={isDeleting}
                  />
                  {confirmText && confirmText !== materialTitle && (
                    <p className="text-xs text-red-500 mt-1">
                      Name doesn't match. Please type exactly: {materialTitle}
                    </p>
                  )}
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-3">
                <button
                  onClick={handleDelete}
                  disabled={
                    isDeleting ||
                    reason.trim().length < 10 ||
                    confirmText !== materialTitle
                  }
                  className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {isDeleting ? 'Deleting...' : `Delete Material (${deletionType})`}
                </button>
                <button
                  onClick={onClose}
                  disabled={isDeleting}
                  className="px-6 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
