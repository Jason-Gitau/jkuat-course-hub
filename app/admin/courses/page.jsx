'use client';

/**
 * Manage Courses Admin Page
 * View and manage all courses in the system
 */

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import ConfirmModal from '@/components/admin/ConfirmModal';
import Link from 'next/link';

export default function ManageCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Delete confirmation modal
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    course: null,
  });

  const supabase = createClient();

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    setLoading(true);
    setError(null);

    try {
      // Fetch courses with material and topic counts
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('course_name');

      if (coursesError) throw coursesError;

      // For each course, get counts
      const coursesWithCounts = await Promise.all(
        coursesData.map(async (course) => {
          const [materialsCount, topicsCount] = await Promise.all([
            supabase
              .from('materials')
              .select('id', { count: 'exact', head: true })
              .eq('course_id', course.id)
              .is('deleted_at', null),
            supabase
              .from('topics')
              .select('id', { count: 'exact', head: true })
              .eq('course_id', course.id)
              .is('deleted_at', null),
          ]);

          return {
            ...course,
            materialsCount: materialsCount.count || 0,
            topicsCount: topicsCount.count || 0,
          };
        })
      );

      setCourses(coursesWithCounts);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCourse(course) {
    try {
      // Note: For now we'll just delete the course
      // In production, you might want to:
      // 1. Mark materials as orphaned
      // 2. Delete or reassign topics
      // 3. Use a proper deletion API endpoint

      const { error: deleteError } = await supabase
        .from('courses')
        .delete()
        .eq('id', course.id);

      if (deleteError) throw deleteError;

      // Remove from list
      setCourses(courses.filter((c) => c.id !== course.id));
      alert('Course deleted successfully!');
    } catch (err) {
      alert(`Error deleting course: ${err.message}`);
    }
  }

  // Filter courses by search query
  const filteredCourses = courses.filter((course) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      course.course_name?.toLowerCase().includes(query) ||
      course.department?.toLowerCase().includes(query) ||
      course.description?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
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
        <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Courses</h2>
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadCourses}
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
          <span>🎓</span> Manage Courses
        </h1>
        <p className="text-gray-600">View and manage all courses in the system</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Total Courses</p>
          <p className="text-2xl font-bold text-gray-900">{courses.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Total Materials</p>
          <p className="text-2xl font-bold text-blue-600">
            {courses.reduce((sum, c) => sum + c.materialsCount, 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Total Topics</p>
          <p className="text-2xl font-bold text-green-600">
            {courses.reduce((sum, c) => sum + c.topicsCount, 0)}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <input
          type="text"
          placeholder="Search courses by name, department, or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Courses List */}
      {filteredCourses.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <span className="text-6xl mb-4 block">📭</span>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Courses Found</h3>
          <p className="text-gray-600">
            {searchQuery ? 'Try a different search query' : 'No courses in the system'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition"
            >
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Course Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 text-lg">{course.course_name}</h3>
                    {course.department && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                        {course.department}
                      </span>
                    )}
                  </div>

                  {course.description && (
                    <p className="text-sm text-gray-600 mb-3">{course.description}</p>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-gray-500 text-xs">Materials</p>
                      <p className="font-semibold text-blue-600">{course.materialsCount}</p>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-gray-500 text-xs">Topics</p>
                      <p className="font-semibold text-green-600">{course.topicsCount}</p>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-gray-500 text-xs">Course Code</p>
                      <p className="font-semibold text-gray-700">{course.course_code || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-gray-500 text-xs">Year</p>
                      <p className="font-semibold text-gray-700">{course.year || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex lg:flex-col items-center gap-2 lg:w-32">
                  <Link
                    href={`/courses/${course.id}`}
                    className="flex-1 lg:w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-center text-sm"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => setDeleteModal({ isOpen: true, course })}
                    className="flex-1 lg:w-full px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition text-sm"
                    disabled={course.materialsCount > 0 || course.topicsCount > 0}
                    title={
                      course.materialsCount > 0 || course.topicsCount > 0
                        ? 'Cannot delete course with materials or topics'
                        : 'Delete course'
                    }
                  >
                    {course.materialsCount > 0 || course.topicsCount > 0 ? 'Has Content' : 'Delete'}
                  </button>
                </div>
              </div>

              {(course.materialsCount > 0 || course.topicsCount > 0) && (
                <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded p-2 text-xs text-yellow-800">
                  ⚠️ This course has content. Delete all materials and topics first, or they will become
                  orphaned.
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-gray-500 text-center">
        Showing {filteredCourses.length} of {courses.length} courses
      </p>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, course: null })}
        onConfirm={() => handleDeleteCourse(deleteModal.course)}
        title="Delete Course"
        message={`Are you sure you want to delete "${deleteModal.course?.course_name}"? This action cannot be undone.`}
        confirmText="Delete Course"
        confirmColor="red"
      />
    </div>
  );
}
