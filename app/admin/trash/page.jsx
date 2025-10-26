'use client';

/**
 * Trash Bin Admin Page
 * Shows soft-deleted items with 30-day recovery window
 * Features: pagination, filtering by type, restore functionality
 */

import { useState, useEffect } from 'react';
import ConfirmModal from '@/components/admin/ConfirmModal';

export default function TrashBinPage() {
  const [trashData, setTrashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // all, materials, topics, courses
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Restore modal state
  const [restoreModal, setRestoreModal] = useState({
    isOpen: false,
    item: null,
  });

  useEffect(() => {
    fetchTrashData();
  }, [page, limit]);

  async function fetchTrashData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/trash?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch trash data');
      const data = await res.json();
      setTrashData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(item) {
    try {
      const res = await fetch('/api/admin/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: item.entity_type,
          entityId: item.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to restore item');
      }

      // Refresh data
      fetchTrashData();
      alert(`${item.entity_type} restored successfully!`);
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

  function getDaysClass(daysRemaining) {
    if (daysRemaining <= 3) return 'bg-red-100 text-red-700 border-red-300';
    if (daysRemaining <= 7) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    return 'bg-green-100 text-green-700 border-green-300';
  }

  // Filter items by active tab
  const getFilteredItems = () => {
    if (!trashData?.items) return [];

    if (activeTab === 'all') {
      return [
        ...trashData.items.materials,
        ...trashData.items.topics,
        ...trashData.items.courses,
      ].sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at));
    }

    return trashData.items[activeTab] || [];
  };

  const filteredItems = getFilteredItems();

  if (loading && !trashData) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Trash Bin</h2>
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchTrashData}
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
          <span>🗑️</span> Trash Bin
        </h1>
        <p className="text-gray-600">
          Soft-deleted items are kept for 30 days before permanent deletion
        </p>
      </div>

      {/* Stats */}
      {trashData?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Total Items</p>
            <p className="text-2xl font-bold text-gray-900">{trashData.stats.total}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Materials</p>
            <p className="text-2xl font-bold text-blue-600">{trashData.stats.materials}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Topics</p>
            <p className="text-2xl font-bold text-green-600">{trashData.stats.topics}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Expiring Soon</p>
            <p className="text-2xl font-bold text-red-600">{trashData.stats.expiringSoon}</p>
            <p className="text-xs text-gray-500">&lt; 7 days remaining</p>
          </div>
        </div>
      )}

      {/* Filters & Pagination Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'all', label: 'All', count: trashData?.stats?.total || 0 },
            { id: 'materials', label: 'Materials', count: trashData?.stats?.materials || 0 },
            { id: 'topics', label: 'Topics', count: trashData?.stats?.topics || 0 },
            { id: 'courses', label: 'Courses', count: trashData?.stats?.courses || 0 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
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

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <span className="text-6xl mb-4 block">🎉</span>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Trash Bin is Empty</h3>
          <p className="text-gray-600">No deleted items found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div
              key={`${item.entity_type}-${item.id}`}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition"
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                {/* Item Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700">
                      {item.entity_type}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getDaysClass(
                        item.days_remaining
                      )}`}
                    >
                      {item.days_remaining} days left
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 truncate">{item.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Deleted by <span className="font-medium">{item.deleter_name || 'Unknown'}</span>{' '}
                    on {formatDate(item.deleted_at)}
                  </p>
                  {item.deletion_reason && (
                    <p className="text-sm text-gray-500 mt-1 italic">
                      Reason: {item.deletion_reason}
                    </p>
                  )}
                  {item.entity_type === 'material' && (
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>📥 {item.download_count || 0} downloads</span>
                      <span>👁️ {item.view_count || 0} views</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRestoreModal({ isOpen: true, item })}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition flex items-center gap-1"
                  >
                    <span>↺</span> Restore
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {trashData?.pagination && trashData.pagination.totalPages > 1 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Page {trashData.pagination.page} of {trashData.pagination.totalPages} (
            {trashData.pagination.total} total items)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!trashData.pagination.hasPrevious}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              ← Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!trashData.pagination.hasMore}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      <ConfirmModal
        isOpen={restoreModal.isOpen}
        onClose={() => setRestoreModal({ isOpen: false, item: null })}
        onConfirm={() => handleRestore(restoreModal.item)}
        title="Restore Item"
        message={`Are you sure you want to restore "${restoreModal.item?.title}"? It will be moved back to active status.`}
        confirmText="Restore"
        confirmColor="green"
      />
    </div>
  );
}
