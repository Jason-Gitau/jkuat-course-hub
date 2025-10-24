'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function StorageAnalyticsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/storage-stats');

      if (!response.ok) {
        throw new Error('Failed to fetch storage stats');
      }

      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching storage stats:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Stats</h2>
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchStats}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const { stats: storageStats, migrationCandidates, largestFiles, courseStats } = stats;

  // Determine health status
  const getHealthStatus = (percentage) => {
    if (percentage < 60) return { color: 'green', text: 'Healthy', icon: '✅' };
    if (percentage < 80) return { color: 'yellow', text: 'Warning', icon: '⚠️' };
    return { color: 'red', text: 'Critical', icon: '🚨' };
  };

  const supabaseHealth = getHealthStatus(parseFloat(storageStats.supabaseUsagePercentage));

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Storage Analytics</h1>
            <p className="text-gray-600">Monitor and manage your storage usage</p>
          </div>
          <Link
            href="/admin/pending"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            ← Back to Admin
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Total Storage */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Storage</h3>
              <span className="text-2xl">💾</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{storageStats.totalSizeMB}</p>
            <p className="text-sm text-gray-500 mt-1">MB across {storageStats.totalCount} files</p>
          </div>

          {/* Supabase Usage */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Supabase</h3>
              <span className="text-2xl">{supabaseHealth.icon}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{storageStats.supabaseSizeMB}</p>
            <p className="text-sm text-gray-500 mt-1">
              MB ({storageStats.supabaseUsagePercentage}% of 1GB)
            </p>
            <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  supabaseHealth.color === 'green' ? 'bg-green-500' :
                  supabaseHealth.color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(storageStats.supabaseUsagePercentage, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* R2 Usage */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">R2 (Overflow)</h3>
              <span className="text-2xl">☁️</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{storageStats.r2SizeMB}</p>
            <p className="text-sm text-gray-500 mt-1">
              MB ({((storageStats.r2SizeMB / 10240) * 100).toFixed(1)}% of 10GB)
            </p>
          </div>

          {/* Migration Candidates */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Can Migrate</h3>
              <span className="text-2xl">📦</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{migrationCandidates.count}</p>
            <p className="text-sm text-gray-500 mt-1">
              files ({migrationCandidates.totalSizeMB} MB)
            </p>
          </div>
        </div>

        {/* Migration Alert */}
        {parseFloat(storageStats.supabaseUsagePercentage) > 70 && migrationCandidates.count > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-8 rounded-r-lg">
            <div className="flex items-start">
              <span className="text-3xl mr-4">⚠️</span>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                  Storage Optimization Recommended
                </h3>
                <p className="text-yellow-700 mb-4">
                  You're using {storageStats.supabaseUsagePercentage}% of your Supabase free tier.
                  {migrationCandidates.count} files ({migrationCandidates.totalSizeMB} MB) can be migrated to R2 to free up space.
                </p>
                <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm">
                  <p className="mb-2"># Run migration script:</p>
                  <p>node scripts/migrate-to-r2.js --limit=10</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Largest Files */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Largest Files</h2>
            <p className="text-sm text-gray-600 mt-1">Top 10 files by size</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Downloads</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {largestFiles?.map((file) => {
                  const age = Math.floor((Date.now() - new Date(file.created_at).getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <tr key={file.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{file.title}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{file.courses?.course_name || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">{file.file_size_mb} MB</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          file.storage_location === 'r2' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {file.storage_location || 'supabase'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{file.download_count || 0}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{age} days</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Storage by Course */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Storage by Course</h2>
            <p className="text-sm text-gray-600 mt-1">Top 10 courses by storage usage</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Files</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {courseStats?.map((course) => (
                  <tr key={course.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{course.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{course.count}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{course.totalSizeMB} MB</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {(course.totalSizeMB / course.count).toFixed(2)} MB
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : '🔄 Refresh Statistics'}
          </button>
        </div>
      </div>
    </div>
  );
}
