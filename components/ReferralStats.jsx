'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/lib/providers/SupabaseProvider';
import { useUser } from '@/lib/providers/UserProvider';
import { getReferralCount, getInviteStats } from '@/lib/utils/inviteLinkGenerator';

export default function ReferralStats() {
  const { supabase } = useSupabase();
  const { user, profile } = useUser();
  const [stats, setStats] = useState({
    referralCount: 0,
    totalInvites: 0,
    totalUses: 0,
    invitesByCourse: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && profile) {
      fetchStats();
    }
  }, [user, profile]);

  async function fetchStats() {
    try {
      setLoading(true);

      // Fetch referral count from profile
      const referralCount = await getReferralCount(supabase, user.id);

      // Fetch invite stats
      const inviteStats = await getInviteStats(supabase, user.id);

      setStats({
        referralCount,
        ...inviteStats
      });
    } catch (err) {
      console.error('Error fetching referral stats:', err);
    } finally {
      setLoading(false);
    }
  }

  if (!user || !profile) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg shadow-sm border border-blue-200 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Your Invite Stats</h3>
          <p className="text-sm text-gray-600">See how many classmates you've helped join</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-3xl font-bold text-blue-600 mb-1">
            {stats.referralCount}
          </div>
          <div className="text-sm text-gray-600">Successful Referrals</div>
          <div className="text-xs text-gray-500 mt-1">
            Classmates who joined via your invite
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-3xl font-bold text-green-600 mb-1">
            {stats.totalInvites}
          </div>
          <div className="text-sm text-gray-600">Courses Shared</div>
          <div className="text-xs text-gray-500 mt-1">
            Different courses you've invited people to
          </div>
        </div>
      </div>

      {/* Invites by Course */}
      {stats.invitesByCourse.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Your Invites</h4>
          <div className="space-y-2">
            {stats.invitesByCourse.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {invite.courses?.course_name || 'Unknown Course'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {invite.uses_count} {invite.uses_count === 1 ? 'person' : 'people'} joined
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    {new Date(invite.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No invites yet */}
      {stats.totalInvites === 0 && (
        <div className="text-center py-6">
          <div className="text-gray-400 mb-2">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <p className="text-gray-600 mb-4">You haven't invited anyone yet</p>
          <p className="text-sm text-gray-500">
            Use the "Invite Classmates" button on any course page to start growing the community!
          </p>
        </div>
      )}

      {/* Encouragement */}
      {stats.referralCount > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">Great work! </span>
            {stats.referralCount === 1
              ? "You've helped 1 classmate join the platform."
              : `You've helped ${stats.referralCount} classmates join the platform.`}
            {' '}Keep sharing to build a stronger learning community!
          </p>
        </div>
      )}
    </div>
  );
}
