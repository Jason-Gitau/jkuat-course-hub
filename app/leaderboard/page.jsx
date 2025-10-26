'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function LeaderboardPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'week', 'month'

  useEffect(() => {
    loadLeaderboard();
  }, [filter]);

  async function loadLeaderboard() {
    try {
      setLoading(true);

      // Calculate date range for filter
      let dateFilter = null;
      if (filter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFilter = weekAgo.toISOString();
      } else if (filter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        dateFilter = monthAgo.toISOString();
      }

      // Query materials with user and course data
      let query = supabase
        .from('materials')
        .select(`
          id,
          user_id,
          created_at,
          download_count,
          profiles:user_id (
            full_name,
            role,
            courses!course_id (
              course_name
            )
          )
        `)
        .not('user_id', 'is', null);

      if (dateFilter) {
        query = query.gte('created_at', dateFilter);
      }

      const { data: materials, error } = await query;

      if (error) throw error;

      // Group by user and calculate stats
      const userStats = {};

      materials?.forEach((material) => {
        if (!material.user_id || !material.profiles) return;

        const userId = material.user_id;

        if (!userStats[userId]) {
          userStats[userId] = {
            userId,
            name: material.profiles.full_name || 'Anonymous',
            role: material.profiles.role || 'student',
            course: material.profiles.courses?.course_name || 'Unknown',
            uploads: 0,
            totalDownloads: 0,
            materials: [],
          };
        }

        userStats[userId].uploads++;
        userStats[userId].totalDownloads += material.download_count || 0;
        userStats[userId].materials.push(material);
      });

      // Convert to array and sort by uploads
      const leaderboardArray = Object.values(userStats)
        .sort((a, b) => b.uploads - a.uploads)
        .map((user, index) => ({
          ...user,
          rank: index + 1,
          avgDownloads: user.uploads > 0 ? (user.totalDownloads / user.uploads).toFixed(1) : 0,
        }));

      setLeaderboard(leaderboardArray);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }

  function getRankEmoji(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '🎖️';
  }

  function getRoleBadge(role) {
    if (role === 'class_rep') {
      return (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
          ⭐ Class Rep
        </span>
      );
    }
    if (role === 'admin') {
      return (
        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold">
          👑 Admin
        </span>
      );
    }
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Contributors Leaderboard</h1>
          <p className="text-lg text-gray-600">
            Recognizing our top contributors who make learning accessible for everyone
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex gap-2 flex-wrap justify-center">
            <button
              onClick={() => setFilter('all')}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setFilter('month')}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                filter === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setFilter('week')}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                filter === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              This Week
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Leaderboard */}
        {!loading && leaderboard.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg">No contributions yet for this period.</p>
            <Link
              href="/upload"
              className="inline-block mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Be the First to Contribute!
            </Link>
          </div>
        )}

        {!loading && leaderboard.length > 0 && (
          <>
            {/* Top 3 Podium */}
            {leaderboard.length >= 3 && (
              <div className="grid grid-cols-3 gap-4 mb-8">
                {/* 2nd Place */}
                <div className="flex flex-col items-center pt-8">
                  <div className="bg-white rounded-lg shadow-lg p-6 w-full text-center transform transition hover:scale-105">
                    <div className="text-4xl mb-2">🥈</div>
                    <h3 className="font-bold text-lg text-gray-900 mb-1">{leaderboard[1].name}</h3>
                    <div className="mb-2">{getRoleBadge(leaderboard[1].role)}</div>
                    <p className="text-sm text-gray-600 mb-3">{leaderboard[1].course}</p>
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-2xl font-bold text-blue-600">{leaderboard[1].uploads}</p>
                      <p className="text-xs text-gray-600">uploads</p>
                    </div>
                  </div>
                </div>

                {/* 1st Place */}
                <div className="flex flex-col items-center">
                  <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg shadow-xl p-8 w-full text-center transform transition hover:scale-105">
                    <div className="text-6xl mb-3">🥇</div>
                    <h3 className="font-bold text-xl text-gray-900 mb-2">{leaderboard[0].name}</h3>
                    <div className="mb-3">{getRoleBadge(leaderboard[0].role)}</div>
                    <p className="text-sm text-gray-800 mb-4">{leaderboard[0].course}</p>
                    <div className="bg-white bg-opacity-90 rounded p-4">
                      <p className="text-3xl font-bold text-yellow-700">{leaderboard[0].uploads}</p>
                      <p className="text-xs text-gray-700 font-semibold">uploads</p>
                    </div>
                  </div>
                </div>

                {/* 3rd Place */}
                <div className="flex flex-col items-center pt-12">
                  <div className="bg-white rounded-lg shadow-lg p-6 w-full text-center transform transition hover:scale-105">
                    <div className="text-4xl mb-2">🥉</div>
                    <h3 className="font-bold text-lg text-gray-900 mb-1">{leaderboard[2].name}</h3>
                    <div className="mb-2">{getRoleBadge(leaderboard[2].role)}</div>
                    <p className="text-sm text-gray-600 mb-3">{leaderboard[2].course}</p>
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-2xl font-bold text-blue-600">{leaderboard[2].uploads}</p>
                      <p className="text-xs text-gray-600">uploads</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Full Leaderboard Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Contributor
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Course
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Uploads
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Total Downloads
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Avg Downloads
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {leaderboard.map((user) => (
                      <tr
                        key={user.userId}
                        className={`hover:bg-gray-50 transition ${
                          user.rank <= 3 ? 'bg-yellow-50' : ''
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{getRankEmoji(user.rank)}</span>
                            <span className="font-semibold text-gray-900">#{user.rank}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{user.name}</span>
                            {user.role && <div className="mt-1">{getRoleBadge(user.role)}</div>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{user.course}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-lg font-bold text-blue-600">{user.uploads}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-gray-900">{user.totalDownloads}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-gray-600">{user.avgDownloads}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-8 text-center text-white">
              <h2 className="text-2xl font-bold mb-3">Want to see your name here?</h2>
              <p className="text-lg mb-6 opacity-90">
                Upload materials and help your fellow students succeed!
              </p>
              <Link
                href="/upload"
                className="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition shadow-lg"
              >
                Upload Materials
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
