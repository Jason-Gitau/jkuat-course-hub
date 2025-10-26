'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import StatCard from '@/components/admin/StatCard';

// Lazy load heavy chart components (reduces initial bundle by ~50KB)
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false });
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });

export default function AdminDashboard() {
  const [userStats, setUserStats] = useState(null);
  const [materialStats, setMaterialStats] = useState(null);
  const [storageStats, setStorageStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAllStats();
  }, []);

  async function fetchAllStats() {
    try {
      setLoading(true);
      const [userRes, materialRes, storageRes] = await Promise.all([
        fetch('/api/admin/user-stats'),
        fetch('/api/admin/material-stats'),
        fetch('/api/admin/storage-stats')
      ]);

      if (!userRes.ok || !materialRes.ok || !storageRes.ok) {
        throw new Error('Failed to fetch stats');
      }

      const [userData, materialData, storageData] = await Promise.all([
        userRes.json(),
        materialRes.json(),
        storageRes.json()
      ]);

      setUserStats(userData.stats);
      setMaterialStats(materialData.stats);
      setStorageStats(storageData.stats);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Dashboard</h2>
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchAllStats}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!userStats || !materialStats || !storageStats) return null;

  // Prepare chart colors
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  // Storage distribution data for pie chart
  const storageDistribution = [
    { name: 'Supabase', value: parseFloat(storageStats.supabaseSizeMB) },
    { name: 'R2', value: parseFloat(storageStats.r2SizeMB) },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Monitor your platform's performance and analytics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={userStats.totalUsers}
          subtitle={`+${userStats.recentSignups.last7Days} this week`}
          icon="👥"
          color="blue"
          trend={userStats.recentSignups.last7Days > 0 ? 'up' : 'neutral'}
          trendValue={userStats.recentSignups.last7Days}
        />
        <StatCard
          title="Total Materials"
          value={materialStats.totalMaterials}
          subtitle={`${materialStats.byStatus.approved} approved`}
          icon="📚"
          color="green"
        />
        <StatCard
          title="Storage Used"
          value={`${storageStats.totalSizeMB} MB`}
          subtitle={`${storageStats.supabaseUsagePercentage}% of Supabase`}
          icon="💾"
          color="purple"
        />
        <StatCard
          title="Pending Approvals"
          value={materialStats.byStatus.pending}
          subtitle={materialStats.byStatus.pending > 0 ? 'Needs attention' : 'All clear!'}
          icon="⏳"
          color={materialStats.byStatus.pending > 0 ? 'orange' : 'green'}
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/admin/pending"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
          >
            <span className="text-2xl">⏳</span>
            <div>
              <p className="font-semibold text-gray-900">Review Materials</p>
              <p className="text-sm text-gray-600">{materialStats.byStatus.pending} pending</p>
            </div>
          </Link>
          <Link
            href="/admin/deletion-requests"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition"
          >
            <span className="text-2xl">📋</span>
            <div>
              <p className="font-semibold text-gray-900">Deletion Requests</p>
              <p className="text-sm text-gray-600">Review requests</p>
            </div>
          </Link>
          <Link
            href="/admin/trash"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition"
          >
            <span className="text-2xl">🗑️</span>
            <div>
              <p className="font-semibold text-gray-900">Trash Bin</p>
              <p className="text-sm text-gray-600">30-day recovery</p>
            </div>
          </Link>
          <Link
            href="/admin/storage"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition"
          >
            <span className="text-2xl">💾</span>
            <div>
              <p className="font-semibold text-gray-900">Storage Analytics</p>
              <p className="text-sm text-gray-600">Monitor usage</p>
            </div>
          </Link>
          <button
            onClick={fetchAllStats}
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition"
          >
            <span className="text-2xl">🔄</span>
            <div>
              <p className="font-semibold text-gray-900">Refresh Data</p>
              <p className="text-sm text-gray-600">Update statistics</p>
            </div>
          </button>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">User Growth (Last 7 Days)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={userStats.growthChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#6B7280" />
              <YAxis tick={{ fontSize: 12 }} stroke="#6B7280" />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }} />
              <Legend />
              <Line type="monotone" dataKey="signups" stroke="#3B82F6" strokeWidth={2} name="New Users" />
              <Line type="monotone" dataKey="total" stroke="#10B981" strokeWidth={2} name="Total Users" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Upload Trends Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Activity (Last 7 Days)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={materialStats.uploadTrendsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#6B7280" />
              <YAxis tick={{ fontSize: 12 }} stroke="#6B7280" />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }} />
              <Legend />
              <Bar dataKey="uploads" fill="#3B82F6" name="Uploads" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Storage Distribution & Top Courses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Storage Distribution */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Storage Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={storageDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {storageDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 flex justify-center gap-6">
            {storageDistribution.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                ></div>
                <span className="text-sm text-gray-600">
                  {item.name}: {item.value} MB
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Courses */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Courses by Materials</h2>
          <div className="space-y-3">
            {materialStats.topCourses.slice(0, 5).map((course, index) => (
              <div key={course.course} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 text-blue-700 rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{course.course}</p>
                    <p className="text-xs text-gray-500">{course.count} materials • {course.totalSizeMB} MB</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{course.totalDownloads}</p>
                  <p className="text-xs text-gray-500">downloads</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Popular Materials & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Materials */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Most Popular Materials</h2>
          <div className="space-y-2">
            {materialStats.popularMaterials.slice(0, 5).map((material) => (
              <div key={material.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{material.title}</p>
                  <p className="text-xs text-gray-500">{material.course}</p>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-blue-600">{material.downloads}</p>
                    <p className="text-xs text-gray-500">downloads</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-green-600">{material.views}</p>
                    <p className="text-xs text-gray-500">views</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Uploads */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Uploads</h2>
          <div className="space-y-2">
            {materialStats.recentUploads.map((material) => {
              const timeAgo = new Date(material.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div key={material.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{material.title}</p>
                    <p className="text-xs text-gray-500">{material.course}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      material.status === 'approved' ? 'bg-green-100 text-green-700' :
                      material.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {material.status}
                    </span>
                    <span className="text-xs text-gray-500 whitespace-nowrap">{timeAgo}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
