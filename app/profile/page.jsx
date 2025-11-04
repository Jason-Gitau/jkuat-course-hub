'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [courses, setCourses] = useState([]);
  const [showRepModal, setShowRepModal] = useState(false);

  useEffect(() => {
    loadProfile();
    loadCourses();
  }, []);

  async function loadProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      setUser(user);

      const { data, error } = await supabase
        .from('profiles')
        .select('*, courses!profiles_course_id_fkey(course_name)')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Failed to load profile:', error.message || error.hint);
        throw new Error(error.message || error.hint || 'Failed to load profile');
      }

      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadCourses() {
    const { data } = await supabase
      .from('courses')
      .select('id, course_name, department')
      .order('course_name');

    if (data) setCourses(data);
  }

  async function handleUpdateProfile(e) {
    e.preventDefault();
    setSaving(true);

    try {
      const formData = new FormData(e.target);

      const updates = {
        full_name: formData.get('full_name'),
        university: formData.get('university'),
        course_id: formData.get('course_id'),
        year_of_study: parseInt(formData.get('year_of_study')),
        bio: formData.get('bio'),
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      alert('Profile updated successfully!');
      await loadProfile();
    } catch (error) {
      alert('Failed to update profile: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleClassRep() {
    if (profile.role === 'class_rep') {
      // Downgrade from class rep
      const confirm = window.confirm(
        'Are you sure you want to remove your Class Rep status?'
      );
      if (!confirm) return;

      try {
        const { error } = await supabase
          .from('profiles')
          .update({ role: 'student' })
          .eq('id', user.id);

        if (error) throw error;

        alert('Class Rep status removed');
        await loadProfile();
      } catch (error) {
        alert('Failed to update role: ' + error.message);
      }
    } else {
      // Show modal for class rep self-declaration
      setShowRepModal(true);
    }
  }

  async function confirmClassRepStatus() {
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'class_rep' })
        .eq('id', user.id);

      if (error) throw error;

      setShowRepModal(false);
      alert('You are now a Class Rep! Thank you for contributing to the community.');
      await loadProfile();
    } catch (error) {
      alert('Failed to update role: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Profile Not Found</h1>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
              <p className="text-gray-600">{user?.email}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {profile.role === 'class_rep' && (
                <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                  ⭐ Class Rep
                </span>
              )}
              {profile.role === 'admin' && (
                <span className="px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
                  👑 Admin
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Class Rep Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Class Representative Status</h2>
              {profile.role === 'class_rep' ? (
                <div>
                  <p className="text-green-600 mb-4">
                    ✅ You are currently a Class Rep. Thank you for your contributions!
                  </p>
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                    <h3 className="font-semibold text-blue-900 mb-2">Your Benefits:</h3>
                    <ul className="list-disc list-inside text-blue-800 space-y-1">
                      <li>Priority support from the platform team</li>
                      <li>Class Rep badge on all your uploads</li>
                      <li>Featured on the Contributors Leaderboard</li>
                      <li>Early access to new features</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 mb-4">
                    Are you a class representative? Declare yourself to get special benefits!
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Class Rep Benefits:</h3>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      <li>⭐ Class Rep badge on your uploads</li>
                      <li>📊 Recognition on the contributors leaderboard</li>
                      <li>🎯 Priority support</li>
                      <li>🚀 Early access to new features</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleToggleClassRep}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              profile.role === 'class_rep'
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {profile.role === 'class_rep' ? 'Remove Class Rep Status' : 'I\'m a Class Rep'}
          </button>
        </div>

        {/* Profile Form */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h2>

          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                name="full_name"
                defaultValue={profile.full_name}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                University *
              </label>
              <input
                type="text"
                name="university"
                defaultValue={profile.university}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course *
              </label>
              <select
                name="course_id"
                defaultValue={profile.course_id}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select your course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.course_name} {course.department && `(${course.department})`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year of Study *
              </label>
              <select
                name="year_of_study"
                defaultValue={profile.year_of_study}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select year</option>
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
                <option value="5">Year 5+</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio (Optional)
              </label>
              <textarea
                name="bio"
                defaultValue={profile.bio || ''}
                rows={4}
                placeholder="Tell us about yourself..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Class Rep Confirmation Modal */}
      {showRepModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Become a Class Rep</h2>

            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                By declaring yourself as a Class Representative, you agree to:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
                <li>Upload quality materials for your classmates</li>
                <li>Help organize and maintain course content</li>
                <li>Respond to material requests when possible</li>
                <li>Uphold community guidelines</li>
              </ul>
              <p className="text-sm text-gray-500">
                Note: This is a trust-based system. We believe in the honor of JKUAT students.
                If misuse is detected, your status may be revoked.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowRepModal(false)}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmClassRepStatus}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? 'Confirming...' : 'I Agree'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
