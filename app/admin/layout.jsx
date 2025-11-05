'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: '📊' },
    { name: 'Pending Approvals', path: '/admin/pending', icon: '⏳' },
    { name: 'Manage Courses', path: '/admin/courses', icon: '🎓' },
    { name: 'Manage Topics', path: '/admin/topics', icon: '📑' },
    { name: 'Deletion Requests', path: '/admin/deletion-requests', icon: '📋' },
    { name: 'Trash Bin', path: '/admin/trash', icon: '🗑️' },
    { name: 'Storage Analytics', path: '/admin/storage', icon: '💾' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Top Navigation Bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo / Brand - Simplified */}
            <Link href="/admin/dashboard" className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-1.5">
                <span className="text-xl">⚙️</span>
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">Admin</span>
            </Link>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition ${
                      isActive
                        ? 'bg-blue-600 dark:bg-blue-700 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Back to App */}
            <Link
              href="/"
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
            >
              <span>←</span>
              <span>Exit</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex gap-2 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <span>{item.icon}</span>
              <span className="text-sm">{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-600 dark:text-gray-400" suppressHydrationWarning>
              JKUAT Course Hub Admin Portal &copy; {new Date().getFullYear()}
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span>System Status: <span className="text-green-600 dark:text-green-400 font-semibold">● Online</span></span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
