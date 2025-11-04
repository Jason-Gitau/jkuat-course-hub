'use client';

import { useState, useEffect, useRef } from 'react';
import { useSupabase } from '@/lib/providers/SupabaseProvider';
import {
  formatCourseName,
  validateCourseFormat,
  findSimilarCourses,
  checkDuplicateCourse,
  getValidationHelpText,
  suggestDepartment
} from '@/lib/utils/courseValidation';

export default function SmartCourseSelector({ value, onChange, error }) {
  const { supabase } = useSupabase();
  const [searchQuery, setSearchQuery] = useState('');
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [similarCourses, setSimilarCourses] = useState([]);
  const [validationMessage, setValidationMessage] = useState(null);
  const [creating, setCreating] = useState(false);
  const wrapperRef = useRef(null);

  // Fetch all courses on mount
  useEffect(() => {
    fetchCourses();
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter courses based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCourses(courses);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = courses.filter(course =>
      course.course_name.toLowerCase().includes(query)
    );
    setFilteredCourses(filtered);
  }, [searchQuery, courses]);

  async function fetchCourses() {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, course_name, department')
        .order('course_name');

      if (error) throw error;
      setCourses(data || []);
      setFilteredCourses(data || []);
    } catch (err) {
      console.error('Error fetching courses:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectCourse(course) {
    onChange(course);
    setSearchQuery(course.course_name);
    setIsOpen(false);
  }

  function handleInputChange(e) {
    const value = e.target.value;
    setSearchQuery(value);
    setIsOpen(true);

    // Clear selection if user is typing
    if (value !== (onChange?.value?.course_name || '')) {
      onChange(null);
    }
  }

  function handleCreateClick() {
    if (!searchQuery.trim()) {
      setValidationMessage({
        type: 'error',
        message: 'Please enter a course name first'
      });
      return;
    }

    // Validate format
    const validation = validateCourseFormat(searchQuery);
    if (!validation.valid) {
      setValidationMessage({
        type: 'error',
        message: validation.error
      });
      return;
    }

    // Check for duplicates and similar courses
    const duplicate = checkDuplicateCourse(searchQuery, courses);
    if (duplicate) {
      setValidationMessage({
        type: 'error',
        message: `This course already exists: "${duplicate.course_name}"`,
        suggestion: 'Please select it from the list instead.'
      });
      return;
    }

    // Find similar courses
    const similar = findSimilarCourses(searchQuery, courses, 0.7);
    setSimilarCourses(similar);

    // Show validation help text if there are similar courses
    if (similar.length > 0) {
      const helpText = getValidationHelpText(similar);
      setValidationMessage(helpText);
    } else {
      setValidationMessage(null);
    }

    setShowCreateModal(true);
    setIsOpen(false);
  }

  async function handleConfirmCreate() {
    setCreating(true);
    setValidationMessage(null);

    try {
      const formattedName = formatCourseName(searchQuery);
      const suggestedDept = suggestDepartment(formattedName);

      const { data, error } = await supabase
        .from('courses')
        .insert({
          course_name: formattedName,
          department: suggestedDept || 'General',
          description: `Created by user during onboarding`
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      const newCourse = data;
      setCourses(prev => [...prev, newCourse].sort((a, b) =>
        a.course_name.localeCompare(b.course_name)
      ));

      // Select the newly created course
      handleSelectCourse(newCourse);
      setShowCreateModal(false);
      setValidationMessage({
        type: 'success',
        message: `Course "${formattedName}" created successfully!`
      });

      // Clear success message after 3 seconds
      setTimeout(() => setValidationMessage(null), 3000);
    } catch (err) {
      console.error('Error creating course:', err);
      setValidationMessage({
        type: 'error',
        message: 'Failed to create course. Please try again.'
      });
    } finally {
      setCreating(false);
    }
  }

  function handleUseSimilar(course) {
    handleSelectCourse(course);
    setShowCreateModal(false);
    setValidationMessage(null);
    setSimilarCourses([]);
  }

  const showCreateOption = searchQuery.trim() &&
                          filteredCourses.length === 0 &&
                          !loading;

  // Get the display value
  const displayValue = value?.course_name || searchQuery;

  return (
    <div className="relative" ref={wrapperRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Course <span className="text-red-500">*</span>
      </label>

      <div className="relative">
        <input
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder="Search for your course..."
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
          disabled={loading}
        />

        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Dropdown menu */}
      {isOpen && !loading && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredCourses.length > 0 ? (
            <ul className="py-1">
              {filteredCourses.map(course => (
                <li
                  key={course.id}
                  onClick={() => handleSelectCourse(course)}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <div className="font-medium text-gray-900">{course.course_name}</div>
                  {course.department && (
                    <div className="text-sm text-gray-500">{course.department}</div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500">
              No courses found
            </div>
          )}

          {/* Create new course option */}
          {showCreateOption && (
            <div className="border-t border-gray-200">
              <button
                type="button"
                onClick={handleCreateClick}
                className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors flex items-center gap-2 text-blue-600 font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create "{formatCourseName(searchQuery)}"
              </button>
            </div>
          )}
        </div>
      )}

      {/* Validation messages */}
      {validationMessage && (
        <div className={`mt-2 p-3 rounded-lg text-sm ${
          validationMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
          validationMessage.type === 'warning' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
          'bg-green-50 text-green-700 border border-green-200'
        }`}>
          <div className="font-medium">{validationMessage.message}</div>
          {validationMessage.suggestion && (
            <div className="mt-1 text-xs">{validationMessage.suggestion}</div>
          )}
        </div>
      )}

      {error && !validationMessage && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* Create confirmation modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            {similarCourses.length > 0 ? (
              <>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Similar Course Found</h3>
                    <p className="text-sm text-gray-600">
                      You typed: <strong>{formatCourseName(searchQuery)}</strong>
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Did you mean one of these?</p>
                  <ul className="space-y-2">
                    {similarCourses.map(({ course, score }) => (
                      <li key={course.id}>
                        <button
                          type="button"
                          onClick={() => handleUseSimilar(course)}
                          className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all"
                        >
                          <div className="font-medium text-gray-900">{course.course_name}</div>
                          <div className="text-xs text-gray-500">
                            {Math.round(score * 100)}% match
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleConfirmCreate}
                    disabled={creating}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {creating ? 'Creating...' : 'Create New Course'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setSimilarCourses([]);
                      setValidationMessage(null);
                    }}
                    disabled={creating}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Create New Course</h3>
                    <p className="text-sm text-gray-600">
                      This will create: <strong>{formatCourseName(searchQuery)}</strong>
                    </p>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-6">
                  Your classmates will be able to see and join this course. Make sure the name is correct before creating it.
                </p>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleConfirmCreate}
                    disabled={creating}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {creating ? 'Creating...' : 'Create Course'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setValidationMessage(null);
                    }}
                    disabled={creating}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
