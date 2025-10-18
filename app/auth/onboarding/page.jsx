'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const [user, setUser] = useState(null)
  const [courses, setCourses] = useState([])
  const [formData, setFormData] = useState({
    full_name: '',
    university: 'JKUAT',
    course_id: '',
    year_of_study: '',
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      try {
        // Optimized: Fetch user and courses in parallel
        const [
          { data: { user: currentUser }, error: userError },
          { data: coursesData, error: coursesError }
        ] = await Promise.all([
          supabase.auth.getUser(),
          supabase
            .from('courses')
            .select('id, course_name, course_code')
            .order('course_name')
        ])

        if (userError || !currentUser) {
          router.push('/auth/login')
          return
        }

        setUser(currentUser)

        // Pre-fill name and email from OAuth
        setFormData(prev => ({
          ...prev,
          full_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '',
        }))

        if (coursesError) throw coursesError

        setCourses(coursesData || [])
      } catch (err) {
        console.error('Error loading onboarding data:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      if (!formData.full_name || !formData.course_id || !formData.year_of_study) {
        throw new Error('Please fill in all required fields')
      }

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          full_name: formData.full_name,
          email: user.email,
          university: formData.university,
          course_id: formData.course_id,
          year_of_study: parseInt(formData.year_of_study),
          role: 'student',
        })

      if (profileError) throw profileError

      // Redirect to their course page
      router.push(`/courses/${formData.course_id}`)
    } catch (err) {
      console.error('Profile creation error:', err)
      setError(err.message)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome! 👋
          </h1>
          <p className="text-lg text-gray-600">
            Let's personalize your experience
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="full_name"
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="e.g., John Kamau"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            {/* University */}
            <div>
              <label htmlFor="university" className="block text-sm font-medium text-gray-700 mb-2">
                University <span className="text-red-500">*</span>
              </label>
              <select
                id="university"
                value={formData.university}
                onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              >
                <option value="JKUAT">Jomo Kenyatta University of Agriculture and Technology (JKUAT)</option>
                <option value="UON">University of Nairobi</option>
                <option value="TU-K">Technical University of Kenya</option>
                <option value="KU">Kenyatta University</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Course */}
            <div>
              <label htmlFor="course" className="block text-sm font-medium text-gray-700 mb-2">
                Course/Program <span className="text-red-500">*</span>
              </label>
              <select
                id="course"
                value={formData.course_id}
                onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              >
                <option value="">Select your course...</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.course_code} - {course.course_name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-gray-500">
                Don't see your course? You can add it later from the upload page.
              </p>
            </div>

            {/* Year of Study */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Year of Study <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map(year => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => setFormData({ ...formData, year_of_study: year.toString() })}
                    className={`
                      py-4 px-6 rounded-lg border-2 font-semibold transition-all
                      ${formData.year_of_study === year.toString()
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                      }
                    `}
                  >
                    Year {year}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !formData.full_name || !formData.course_id || !formData.year_of_study}
              className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-8"
            >
              {submitting ? 'Setting up your profile...' : 'Complete Setup →'}
            </button>
          </form>
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            This helps us show you relevant materials for your course and year.
          </p>
          <p className="mt-1">
            You can update this information anytime from your profile settings.
          </p>
        </div>
      </div>
    </div>
  )
}
