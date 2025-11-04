'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/lib/providers/UserProvider';
import Link from 'next/link';

function JoinPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile } = useUser();

  const [course, setCourse] = useState(null);
  const [inviter, setInviter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const courseId = searchParams.get('c');
  const inviterId = searchParams.get('ref');

  useEffect(() => {
    if (!courseId || !inviterId) {
      setError('Invalid invite link');
      setLoading(false);
      return;
    }

    fetchInviteData();
  }, [courseId, inviterId]);

  useEffect(() => {
    // If user is already logged in with a complete profile, redirect them to the course
    if (user && profile?.onboarding_completed && courseId) {
      router.push(`/courses/${courseId}`);
    }
  }, [user, profile, courseId]);

  async function fetchInviteData() {
    const supabase = createClient();

    try {
      // Fetch course and inviter info in parallel
      const [
        { data: courseData, error: courseError },
        { data: inviterData, error: inviterError }
      ] = await Promise.all([
        supabase
          .from('courses')
          .select('id, course_name, department, created_at')
          .eq('id', courseId)
          .single(),
        supabase
          .from('profiles')
          .select('full_name, course_id')
          .eq('id', inviterId)
          .single()
      ]);

      if (courseError) throw new Error('Course not found');
      if (inviterError) console.warn('Inviter not found');

      setCourse(courseData);
      setInviter(inviterData);
    } catch (err) {
      console.error('Error fetching invite data:', err);
      setError(err.message || 'Failed to load course information');
    } finally {
      setLoading(false);
    }
  }

  function handleJoinClick() {
    // Store invite params in localStorage for the onboarding page
    localStorage.setItem('inviteParams', JSON.stringify({
      courseId,
      inviterId
    }));

    // Redirect to login with params
    router.push(`/auth/login?c=${courseId}&ref=${inviterId}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading course information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invite</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link
              href="/"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            You've Been Invited!
          </h1>
          {inviter && (
            <p className="text-lg text-gray-600">
              {inviter.full_name} invited you to join their course
            </p>
          )}
        </div>

        {/* Course Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-2xl">
              {course.course_name.charAt(0)}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {course.course_name}
              </h2>
              {course.department && (
                <p className="text-gray-600 mb-3">{course.department}</p>
              )}
            </div>
          </div>

          {/* Features List */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Course Notes & Materials</p>
                <p className="text-sm text-gray-600">Access shared lecture notes and study resources</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Past Papers & Exams</p>
                <p className="text-sm text-gray-600">Practice with previous exam questions</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Collaborative Learning</p>
                <p className="text-sm text-gray-600">Connect with classmates and share knowledge</p>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleJoinClick}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Join {course.course_name} →
          </button>

          <p className="text-center text-sm text-gray-500 mt-4">
            Free to join • No credit card required
          </p>
        </div>

        {/* Footer Info */}
        <div className="text-center">
          <p className="text-gray-600 mb-2">
            Already have an account?{' '}
            <button
              onClick={handleJoinClick}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Sign in
            </button>
          </p>
          <p className="text-sm text-gray-500">
            By joining, you agree to access course materials responsibly
          </p>
        </div>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    }>
      <JoinPageContent />
    </Suspense>
  );
}
