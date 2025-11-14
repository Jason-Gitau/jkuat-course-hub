'use client';

/**
 * Topic Details Page
 * View and manage all materials under a specific topic
 */

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import DeletionModal from '@/components/admin/DeletionModal';

export default function TopicDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const topicId = params.id;

  const [topic, setTopic] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Deletion modal
  const [deletionModal, setDeletionModal] = useState({
    isOpen: false,
    materialId: null,
    materialTitle: null,
  });

  const supabase = createClient();

  useEffect(() => {
    loadTopicData();
  }, [topicId]);

  async function loadTopicData() {
    setLoading(true);
    setError(null);

    try {
      // Fetch topic details
      const { data: topicData, error: topicError } = await supabase
        .from('topics')
        .select(`
          *,
          courses!course_id (id, course_name)
        `)
        .eq('id', topicId)
        .single();

      if (topicError) throw topicError;
      if (!topicData) throw new Error('Topic not found');

      setTopic(topicData);

      // Fetch materials for this topic
      const { data: materialsData, error: materialsError } = await supabase
        .from('materials')
        .select(`
          id,
          title,
          type,
          file_size,
          material_category,
          status,
          download_count,
          view_count,
          uploaded_by,
          created_at,
          storage_location,
          storage_path,
          file_url
        `)
        .eq('topic_id', topicId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (materialsError) throw materialsError;

      setMaterials(materialsData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteSuccess() {
    // Refresh materials list
    await loadTopicData();
  }

  function getFileIcon(type) {
    if (!type) return '📄';
    const typeMap = {
      pdf: '📕',
      docx: '📘',
      pptx: '🎯',
      doc: '📘',
      txt: '📄',
      jpg: '🖼️',
      jpeg: '🖼️',
      png: '🖼️',
      gif: '🎬',
      webp: '🖼️',
    };
    return typeMap[type.toLowerCase()] || '📄';
  }

  function getCategoryColor(category) {
    const colors = {
      complete_notes: 'bg-purple-100 text-purple-700 border-purple-200',
      weekly_notes: 'bg-blue-100 text-blue-700 border-blue-200',
      past_paper: 'bg-orange-100 text-orange-700 border-orange-200',
      assignment: 'bg-green-100 text-green-700 border-green-200',
      lab_guide: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      other: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return colors[category] || colors.other;
  }

  function getCategoryLabel(category) {
    const labels = {
      complete_notes: '📚 Complete Notes',
      weekly_notes: '📝 Weekly Notes',
      past_paper: '📋 Past Paper',
      assignment: '✏️ Assignment',
      lab_guide: '🔬 Lab Guide',
      other: '📄 Other',
    };
    return labels[category] || 'Other';
  }

  function formatFileSize(bytes) {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  async function handleViewMaterial(material) {
    try {
      let viewUrl = material.file_url;

      // For R2 files, get a signed URL
      if (material.storage_location === 'r2' && material.storage_path) {
        const response = await fetch(`/api/materials/${material.id}/download-url`);
        if (response.ok) {
          const data = await response.json();
          viewUrl = data.url;
        }
      }

      if (viewUrl) {
        window.open(viewUrl, '_blank');
      }
    } catch (err) {
      alert('Failed to open material: ' + err.message);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Topic</h2>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-yellow-800 mb-2">Topic Not Found</h2>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-3 transition"
          >
            ← Back to Topics
          </button>

          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">📑</span>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{topic.topic_name}</h1>
              <p className="text-gray-600 text-sm">
                Week {topic.week_number} • {topic.courses?.course_name || 'Unknown Course'}
              </p>
            </div>
          </div>

          {topic.description && (
            <p className="text-gray-700 italic mt-2">"{topic.description}"</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition">
          <p className="text-sm text-gray-600">Total Materials</p>
          <p className="text-2xl font-bold text-blue-600">{materials.length}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition">
          <p className="text-sm text-gray-600">Total Downloads</p>
          <p className="text-2xl font-bold text-green-600">
            {materials.reduce((sum, m) => sum + (m.download_count || 0), 0)}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition">
          <p className="text-sm text-gray-600">Total Views</p>
          <p className="text-2xl font-bold text-purple-600">
            {materials.reduce((sum, m) => sum + (m.view_count || 0), 0)}
          </p>
        </div>
      </div>

      {/* Materials List */}
      {materials.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <span className="text-6xl mb-4 block">📭</span>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Materials Yet</h3>
          <p className="text-gray-600">This topic doesn't have any materials uploaded yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {materials.map((material) => (
            <div
              key={material.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-gray-300 transition group"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Material Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3 mb-2">
                    <span className="text-2xl flex-shrink-0">
                      {getFileIcon(material.type)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition break-words">
                        {material.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-1 rounded-full border font-medium ${getCategoryColor(material.material_category)}`}>
                          {getCategoryLabel(material.material_category)}
                        </span>

                        {material.status === 'pending' && (
                          <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200 font-medium">
                            ⏳ Pending
                          </span>
                        )}

                        {material.status === 'rejected' && (
                          <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 border border-red-200 font-medium">
                            ❌ Rejected
                          </span>
                        )}

                        <span className="text-xs text-gray-500">
                          {formatFileSize(material.file_size)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <span>📥</span>
                      <span>{material.download_count || 0} downloads</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>👁️</span>
                      <span>{material.view_count || 0} views</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>👤</span>
                      <span>{material.uploaded_by || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>📅</span>
                      <span>{formatDate(material.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleViewMaterial(material)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition group/btn"
                    title="View material"
                  >
                    <span className="text-xl group-hover/btn:scale-110 transition">👁️</span>
                  </button>
                  <button
                    onClick={() => setDeletionModal({
                      isOpen: true,
                      materialId: material.id,
                      materialTitle: material.title,
                    })}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition group/btn"
                    title="Delete material"
                  >
                    <span className="text-xl group-hover/btn:scale-110 transition">🗑️</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Deletion Modal */}
      {deletionModal.isOpen && (
        <DeletionModal
          isOpen={deletionModal.isOpen}
          onClose={() => setDeletionModal({ isOpen: false, materialId: null, materialTitle: null })}
          onSuccess={handleDeleteSuccess}
          materialId={deletionModal.materialId}
          materialTitle={deletionModal.materialTitle}
        />
      )}
    </div>
  );
}
