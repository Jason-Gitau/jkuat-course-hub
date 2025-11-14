'use client';

/**
 * Manage Topics Admin Page
 * View and manage all topics (units) in the system
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ConfirmModal from '@/components/admin/ConfirmModal';

export default function ManageTopicsPage() {
  const router = useRouter();
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [courses, setCourses] = useState([]);

  // Delete confirmation modal
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    topic: null,
  });

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      // Fetch courses for filter
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, course_name')
        .order('course_name');

      setCourses(coursesData || []);

      // Fetch topics with course info and material counts
      const { data: topicsData, error: topicsError } = await supabase
        .from('topics')
        .select(`
          *,
          courses!course_id (course_name)
        `)
        .is('deleted_at', null)
        .order('course_id')
        .order('week_number');

      if (topicsError) throw topicsError;

      // For each topic, get material count
      const topicsWithCounts = await Promise.all(
        topicsData.map(async (topic) => {
          const { count } = await supabase
            .from('materials')
            .select('id', { count: 'exact', head: true })
            .eq('topic_id', topic.id)
            .is('deleted_at', null);

          return {
            ...topic,
            materialsCount: count || 0,
          };
        })
      );

      setTopics(topicsWithCounts);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteTopic(topic) {
    try {
      const { error: deleteError } = await supabase.from('topics').delete().eq('id', topic.id);

      if (deleteError) throw deleteError;

      // Remove from list
      setTopics(topics.filter((t) => t.id !== topic.id));
      alert('Topic deleted successfully!');
    } catch (err) {
      alert(`Error deleting topic: ${err.message}`);
    }
  }

  // Filter topics
  const filteredTopics = topics.filter((topic) => {
    // Course filter
    if (courseFilter !== 'all' && topic.course_id !== courseFilter) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        topic.topic_name?.toLowerCase().includes(query) ||
        topic.courses?.course_name?.toLowerCase().includes(query) ||
        topic.description?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Group topics by course for better display
  const topicsByCourse = filteredTopics.reduce((acc, topic) => {
    const courseName = topic.courses?.course_name || 'Unknown Course';
    if (!acc[courseName]) {
      acc[courseName] = [];
    }
    acc[courseName].push(topic);
    return {};
  }, {});

  if (loading) {
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
        <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Topics</h2>
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadData}
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
          <span>📑</span> Manage Topics
        </h1>
        <p className="text-gray-600">View and manage all course topics/units in the system</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Total Topics</p>
          <p className="text-2xl font-bold text-gray-900">{topics.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Total Materials</p>
          <p className="text-2xl font-bold text-blue-600">
            {topics.reduce((sum, t) => sum + t.materialsCount, 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Across Courses</p>
          <p className="text-2xl font-bold text-green-600">{courses.length}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        {/* Course Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Course</label>
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Courses ({topics.length})</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.course_name} ({topics.filter((t) => t.course_id === course.id).length})
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div>
          <input
            type="text"
            placeholder="Search topics by name, course, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Topics List */}
      {filteredTopics.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <span className="text-6xl mb-4 block">📭</span>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Topics Found</h3>
          <p className="text-gray-600">
            {searchQuery || courseFilter !== 'all'
              ? 'Try different filters or search query'
              : 'No topics in the system'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTopics.map((topic) => (
            <div
              key={topic.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg hover:border-blue-300 transition cursor-pointer group"
              onClick={() => router.push(`/admin/topics/${topic.id}`)}
            >
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Topic Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                      Week {topic.week_number}
                    </span>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition">{topic.topic_name}</h3>
                  </div>

                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Course:</span> {topic.courses?.course_name || 'Unknown'}
                  </p>

                  {topic.description && (
                    <p className="text-sm text-gray-600 mb-2 italic line-clamp-1">"{topic.description}"</p>
                  )}

                  <div className="flex items-center gap-4 text-sm">
                    <div className="bg-gray-50 rounded px-3 py-1">
                      <span className="text-gray-500">Materials: </span>
                      <span className="font-semibold text-blue-600">{topic.materialsCount}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {topic.materialsCount > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/admin/topics/${topic.id}`);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-sm flex items-center gap-2"
                      title="View and manage materials"
                    >
                      <span>📋</span> View Materials
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteModal({ isOpen: true, topic });
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition text-sm"
                    disabled={topic.materialsCount > 0}
                    title={
                      topic.materialsCount > 0
                        ? 'Cannot delete topic with materials'
                        : 'Delete topic'
                    }
                  >
                    {topic.materialsCount > 0 ? 'Has Materials' : 'Delete'}
                  </button>
                </div>
              </div>

              {topic.materialsCount > 0 && (
                <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-800">
                  💡 Click this card or "View Materials" to manage materials under this topic
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-gray-500 text-center">
        Showing {filteredTopics.length} of {topics.length} topics
      </p>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, topic: null })}
        onConfirm={() => handleDeleteTopic(deleteModal.topic)}
        title="Delete Topic"
        message={`Are you sure you want to delete "${deleteModal.topic?.topic_name}"? This action cannot be undone.`}
        confirmText="Delete Topic"
        confirmColor="red"
      />
    </div>
  );
}
