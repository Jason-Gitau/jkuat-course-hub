'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import SmartCourseSelector from '@/components/onboarding/SmartCourseSelector'
import InviteClassmatesModal from '@/components/onboarding/InviteClassmatesModal'

export default function OnboardingPage() {
  const [user, setUser] = useState(null)
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [formData, setFormData] = useState({
    full_name: '',
    year_of_study: '',
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteParams, setInviteParams] = useState(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      try {
        // Check for invite parameters in localStorage
        const storedInviteParams = localStorage.getItem('inviteParams')
        if (storedInviteParams) {
          const params = JSON.parse(storedInviteParams)
          setInviteParams(params)
        }

        // Fetch user
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()

        if (userError || !currentUser) {
          router.push('/auth/login')
          return
        }

        setUser(currentUser)

        // Pre-fill name from OAuth
        setFormData(prev => ({
          ...prev,
          full_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '',
        }))

        // If there's an invite param with courseId, pre-fill the course
        if (storedInviteParams) {
          const params = JSON.parse(storedInviteParams)
          if (params.courseId) {
            const { data: course } = await supabase
              .from('courses')
              .select('id, course_name, department')
              .eq('id', params.courseId)
              .single()

            if (course) {
              setSelectedCourse(course)
            }
          }
        }
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
      if (!formData.full_name || !selectedCourse || !formData.year_of_study) {
        throw new Error('Please fill in all required fields')
      }

      // Prepare profile data
      const profileData = {
        id: user.id,
        full_name: formData.full_name,
        email: user.email,
        university: 'JKUAT', // Default university
        course_id: selectedCourse.id,
        year_of_study: parseInt(formData.year_of_study),
        role: 'student',
        onboarding_completed: true,
      }

      // Add referral tracking if coming from invite
      if (inviteParams?.inviterId) {
        profileData.invited_by = inviteParams.inviterId
      }

      // Create or update profile (upsert handles both new and existing profiles)
      const { data: insertedData, error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' })
        .select()

      if (profileError) {
        console.error('Supabase error details:', profileError)
        throw new Error(profileError.message || profileError.hint || 'Failed to create profile')
      }

      // Clear invite params from localStorage
      localStorage.removeItem('inviteParams')

      // Reset submitting state
      setSubmitting(false)

      // Show invite modal (user can invite classmates)
      setShowInviteModal(true)
    } catch (err) {
      console.error('Profile creation error:', err)
      console.error('Error type:', typeof err)
      console.error('Error keys:', Object.keys(err))
      console.error('Error stringified:', JSON.stringify(err, null, 2))
      setError(err.message || err.toString() || 'An unknown error occurred')
      setSubmitting(false)
    }
  }

  function handleSkipInvite() {
    // Redirect to upload page with tour trigger
    router.push('/upload?tour=true')
  }

  function handleInviteComplete() {
    // Redirect to upload page with tour trigger
    router.push('/upload?tour=true')
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

  // Show invite modal instead of the form if onboarding is complete
  if (showInviteModal && selectedCourse) {
    return (
      <InviteClassmatesModal
        course={selectedCourse}
        onSkip={handleSkipInvite}
        onClose={handleInviteComplete}
      />
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
            Let's set up your profile
          </p>
        </div>

        {/* Invite Banner */}
        {inviteParams?.courseId && selectedCourse && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">
                  You're joining <strong>{selectedCourse.course_name}</strong>
                </p>
                <p className="text-xs text-blue-700">via a classmate's invite</p>
              </div>
            </div>
          </div>
        )}

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

            {/* Smart Course Selector */}
            <SmartCourseSelector
              value={selectedCourse}
              onChange={setSelectedCourse}
              error={null}
            />

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
              disabled={submitting || !formData.full_name || !selectedCourse || !formData.year_of_study}
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
        </div>
      </div>
    </div>
  )
}
