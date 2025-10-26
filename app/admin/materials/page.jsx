'use client';

/**
 * All Materials Admin Page
 * View, search, filter, and delete all materials in the system
 */

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import DeletionModal from '@/components/admin/DeletionModal';

export default function AllMaterialsPage() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all'); // all, approved, pending, rejected
  const [searchQuery, setSearchQuery] = useState('');

  // Deletion modal
  const [deletionModal, setDeletionModal] = useState({
    isOpen: false,
    materialId: null,
    materialTitle: '',
  });

  const supabase = createClient();

  useEffect(() => {
    loadMaterials();
  }, [statusFilter]);

  async function loadMaterials() {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('materials')
        .select(`
          *,
          courses!course_id (course_name, department),
          topics!topic_id (topic_name, week_number),
          profiles!uploaded_by (full_name, email)
        `)
        .is('deleted_at', null) // Only non-deleted materials
        .order('created_at', { ascending: false });

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setMaterials(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleDeletionSuccess(result) {
    // Remove the deleted material from the list
    setMaterials(materials.filter((m) => m.id !== deletionModal.materialId));
    alert(`Material ${result.deletionType === 'soft' ? 'moved to trash' : 'permanently deleted'}!`);
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  // Filter materials by search query
  const filteredMaterials = materials.filter((material) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      material.title?.toLowerCase().includes(query) ||
      material.courses?.course_name?.toLowerCase().includes(query) ||
      material.topics?.topic_name?.toLowerCase().includes(query)
    );
  });

  // Stats
  const stats = {
    total: materials.length,
    approved: materials.filter((m) => m.status === 'approved').length,
    pending: materials.filter((m) => m.status === 'pending').length,
    rejected: materials.filter((m) => m.status === 'rejected').length,
  };

  if (loading && materials.length === 0) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
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
        <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Materials</h2>
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadMaterials}
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
          <span>📚</span> All Materials
        </h1>
        <p className="text-gray-600">Manage all materials in the system</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Approved</p>
          <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Rejected</p>
          <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        {/* Status Filters */}
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'all', label: 'All', count: stats.total },
            { id: 'approved', label: 'Approved', count: stats.approved },
            { id: 'pending', label: 'Pending', count: stats.pending },
            { id: 'rejected', label: 'Rejected', count: stats.rejected },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setStatusFilter(filter.id)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                statusFilter === filter.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>

        {/* Search */}
        <div>
          <input
            type="text"
            placeholder="Search by title, course, or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Materials List */}
      {filteredMaterials.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <span className="text-6xl mb-4 block">📭</span>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Materials Found</h3>
          <p className="text-gray-600">
            {searchQuery ? 'Try a different search query' : 'No materials match the current filter'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMaterials.map((material) => (
            <div
              key={material.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition"
            >
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Material Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        material.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : material.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {material.status}
                    </span>
                    <span className="text-xs text-gray-500">{formatDate(material.created_at)}</span>
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-1">{material.title}</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Course:</span> {material.courses?.course_name || 'N/A'}
                    </div>
                    {material.topics && (
                      <div>
                        <span className="font-medium">Topic:</span> Week {material.topics.week_number}:{' '}
                        {material.topics.topic_name}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Uploaded by:</span>{' '}
                      {material.profiles?.full_name || 'Unknown'}
                    </div>
                    <div className="flex items-center gap-4">
                      <span>📥 {material.download_count || 0}</span>
                      <span>👁️ {material.view_count || 0}</span>
                      <span>
                        {((material.file_size || 0) / (1024 * 1024)).toFixed(1)} MB
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex lg:flex-col items-center gap-2 lg:w-32">
                  <a
                    href={material.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 lg:w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-center text-sm"
                  >
                    View
                  </a>
                  <button
                    onClick={() =>
                      setDeletionModal({
                        isOpen: true,
                        materialId: material.id,
                        materialTitle: material.title,
                      })
                    }
                    className="flex-1 lg:w-full px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-gray-500 text-center">
        Showing {filteredMaterials.length} of {materials.length} materials
      </p>

      {/* Deletion Modal */}
      <DeletionModal
        isOpen={deletionModal.isOpen}
        onClose={() => setDeletionModal({ isOpen: false, materialId: null, materialTitle: '' })}
        onSuccess={handleDeletionSuccess}
        materialId={deletionModal.materialId}
        materialTitle={deletionModal.materialTitle}
      />
    </div>
  );
}
