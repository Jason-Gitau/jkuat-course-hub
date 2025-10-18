'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function CoursesPage() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState(null)

  const supabase = createClient()

  useEffect(() => {
    async function loadCourses() {
      try {
        setLoading(true)
        setError(null)

        // Optimized: Get all courses and materials in two parallel queries
        // This eliminates the N+1 problem (was 50+ queries, now just 2)
        const [{ data: courses, error: coursesError }, { data: materials, error: materialsError }] = await Promise.all([
          supabase
            .from('courses')
            .select('id, course_name, description, department')
            .order('course_name'),
          supabase
            .from('materials')
            .select('course_id')
            .eq('status', 'approved')
        ])

        if (coursesError) {
          console.error('Error loading courses:', coursesError)
          setError(`Failed to load courses: ${coursesError.message}`)
          setLoading(false)
          return
        }

        if (materialsError) {
          console.error('Error loading materials:', materialsError)
          setError(`Failed to load materials: ${materialsError.message}`)
          setLoading(false)
          return
        }

        // Count materials per course in memory (instant - no DB query needed)
        const materialCounts = {}
        materials?.forEach(m => {
          materialCounts[m.course_id] = (materialCounts[m.course_id] || 0) + 1
        })

        const coursesWithCounts = courses?.map(course => ({
          ...course,
          materialsCount: materialCounts[course.id] || 0
        })) || []

        setCourses(coursesWithCounts)
        setLoading(false)
      } catch (err) {
        console.error('Unexpected error:', err)
        setError(`Unexpected error: ${err.message}`)
        setLoading(false)
      }
    }

    loadCourses()
  }, [])

  const filteredCourses = courses.filter(course => {
    const query = searchQuery.toLowerCase()
    return (
      course.course_name.toLowerCase().includes(query) ||
      (course.department && course.department.toLowerCase().includes(query))
    )
  })

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Browse Courses</h1>
        <p className="text-gray-600 mb-6">
          Select a course to view materials and access the AI tutor
        </p>

        {/* Search Bar */}
        <input
          type="text"
          placeholder="Search courses by name or department..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-md border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          <p className="font-semibold">Error loading courses:</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Courses Grid */}
      {filteredCourses.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          {searchQuery ? (
            <p className="text-gray-600">
              No courses found matching "{searchQuery}"
            </p>
          ) : (
            <div>
              <p className="text-gray-600 mb-4">No courses available yet.</p>
              <p className="text-sm text-gray-500">
                Courses will appear here once they're added to the system.
              </p>
              <p className="text-xs text-gray-400 mt-4">
                Check browser console for detailed error logs
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map(course => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="block bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-blue-300 transition-all group"
            >
              {/* Department Badge */}
              {course.department && (
                <div className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold mb-3">
                  {course.department}
                </div>
              )}

              {/* Course Name */}
              <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {course.course_name}
              </h2>

              {/* Description */}
              {course.description && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {course.description}
                </p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-gray-500 mt-auto pt-4 border-t border-gray-100">
                <span>
                  {course.materialsCount || 0} materials
                </span>
              </div>

              {/* Hover Arrow */}
              <div className="mt-4 text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                View Course
                <span>→</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Call to Action */}
      <div className="mt-12 bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <h3 className="font-semibold text-green-900 mb-2">
          Don't see your course?
        </h3>
        <p className="text-sm text-green-800 mb-4">
          Help us expand by uploading materials for your courses
        </p>
        <Link
          href="/upload"
          className="inline-block bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-medium transition-colors"
        >
          Upload Materials
        </Link>
      </div>
    </div>
  )
}
