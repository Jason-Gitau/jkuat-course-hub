'use client';

/**
 * Deletion Requests Admin Page
 * Review and approve/reject student deletion requests
 */

import { useState, useEffect } from 'react';
import ConfirmModal from '@/components/admin/ConfirmModal';

export default function DeletionRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState(null);

  // Action modals
  const [approveModal, setApproveModal] = useState({
    isOpen: false,
    request: null,
  });
  const [rejectModal, setRejectModal] = useState({
    isOpen: false,
    request: null,
  });

  useEffect(() => {
    fetchRequests();
  }, [page, limit]);

  async function fetchRequests() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/deletion-requests?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch deletion requests');
      const data = await res.json();
      setRequests(data.requests || []);
      setPagination(data.pagination);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(request) {
    try {
      const res = await fetch('/api/admin/deletion-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: request.id,
          action: 'approve',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to approve request');
      }

      // Refresh data
      fetchRequests();
      alert('Deletion request approved. Material moved to trash.');
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }

  async function handleReject(request, rejectionReason) {
    try {
      const res = await fetch('/api/admin/deletion-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: request.id,
          action: 'reject',
          rejectionReason,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reject request');
      }

      // Refresh data
      fetchRequests();
      alert('Deletion request rejected.');
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (loading && requests.length === 0) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-red-800 mb-2">
          Error Loading Deletion Requests
        </h2>
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchRequests}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <span>📋</span> Deletion Requests
        </h1>
        <p className="text-gray-600">
          Review student requests to delete their uploaded materials
        </p>
      </div>

      {/* Stats & Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-600">Pending Requests</p>
          <p className="text-2xl font-bold text-gray-900">{pagination?.total || 0}</p>
        </div>

        {/* Per Page Selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Per page:</label>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <span className="text-6xl mb-4 block">✅</span>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">All Caught Up!</h3>
          <p className="text-gray-600">No pending deletion requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition"
            >
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Request Info */}
                <div className="flex-1">
                  {/* Material Title */}
                  <div className="mb-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                      {request.entity_type}
                    </span>
                    <h3 className="font-semibold text-gray-900 mt-1 text-lg">
                      {request.entity_title}
                    </h3>
                  </div>

                  {/* Requester Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-gray-500">Requested by:</p>
                      <p className="font-medium text-gray-900">{request.requester_name}</p>
                      <p className="text-sm text-gray-600">{request.requester_email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Requested on:</p>
                      <p className="text-sm text-gray-700">{formatDate(request.created_at)}</p>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Reason for deletion:</p>
                    <p className="text-sm text-gray-700 italic">"{request.request_reason}"</p>
                  </div>

                  {/* Impact Stats */}
                  {request.entity_type === 'material' && (
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <div className="flex items-center gap-1">
                        <span>📥</span>
                        <span className="text-gray-700">
                          {request.material_download_count || 0} downloads
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>👁️</span>
                        <span className="text-gray-700">
                          {request.material_view_count || 0} views
                        </span>
                      </div>
                      {(request.material_download_count > 50 ||
                        request.material_view_count > 100) && (
                        <div className="flex items-center gap-1 text-yellow-700 bg-yellow-50 px-2 py-1 rounded">
                          <span>⚠️</span>
                          <span className="font-medium">Popular material</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex lg:flex-col items-center gap-2 lg:w-32">
                  <button
                    onClick={() => setApproveModal({ isOpen: true, request })}
                    className="flex-1 lg:w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => setRejectModal({ isOpen: true, request })}
                    className="flex-1 lg:w-full px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
                  >
                    ✗ Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total requests)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.hasPrevious}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              ← Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasMore}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      <ConfirmModal
        isOpen={approveModal.isOpen}
        onClose={() => setApproveModal({ isOpen: false, request: null })}
        onConfirm={() => handleApprove(approveModal.request)}
        title="Approve Deletion Request"
        message={`Approve deletion of "${approveModal.request?.entity_title}"? The material will be soft-deleted and moved to the trash bin (30-day recovery).`}
        confirmText="Approve & Delete"
        confirmColor="green"
      />

      {/* Reject Modal */}
      <ConfirmModal
        isOpen={rejectModal.isOpen}
        onClose={() => setRejectModal({ isOpen: false, request: null })}
        onConfirm={(reason) => handleReject(rejectModal.request, reason)}
        title="Reject Deletion Request"
        message={`Provide a reason for rejecting "${rejectModal.request?.entity_title}" deletion request:`}
        confirmText="Reject Request"
        confirmColor="red"
        showInput={true}
        inputLabel="Rejection Reason"
        inputPlaceholder="Explain why this request is being rejected..."
        inputRequired={true}
        inputMinLength={5}
      />
    </div>
  );
}
