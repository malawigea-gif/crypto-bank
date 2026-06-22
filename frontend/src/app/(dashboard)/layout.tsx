'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';

const userNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/wallet', label: 'Wallet', icon: '💰' },
  { href: '/transfer', label: 'Transfer', icon: '↗️' },
  { href: '/savings', label: 'Savings', icon: '🏦' },
  { href: '/loan', label: 'Loan', icon: '💳' },
  { href: '/exchange', label: 'Exchange', icon: '🔄' },
  { href: '/verify', label: 'Verification', icon: '🪪' },
  { href: '/messages', label: 'Messages', icon: '💬' },
  { href: '/profile', label: 'Profile', icon: '👤' },
];

const adminNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/admin', label: 'Admin Panel', icon: '⚙️' },
  { href: '/messages', label: 'Messages', icon: '💬' },
  { href: '/profile', label: 'Profile', icon: '👤' },
];

const GATED_PATHS = ['/wallet', '/transfer', '/savings', '/loan', '/exchange'];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, logout, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated()) router.push('/login');
  }, [_hasHydrated, isAuthenticated]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const isAdmin = user?.role === 'ADMIN';
  const navItems = isAdmin ? adminNavItems : userNavItems;
  const isUnverified = !isAdmin && user?.kycStatus !== 'VERIFIED';
  const displayName = user?.firstName
    ? `${user.firstName} ${user?.lastName || ''}`.trim()
    : (user?.fullName || user?.email || '');

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold text-white">🏦 Crypto Bank</h1>
          <p className="text-slate-400 text-sm mt-1">{displayName}</p>
          {isAdmin && (
            <span className="inline-block mt-1 text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
              Admin
            </span>
          )}
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                pathname === item.href
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg text-sm transition-colors"
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* KYC banner — only for unverified regular users on gated pages */}
        {isUnverified && GATED_PATHS.some(p => pathname?.startsWith(p)) && (
          <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-yellow-400 text-lg">🔒</span>
              <p className="text-yellow-300 text-sm">
                <strong>Verification required.</strong>{' '}
                {user?.kycStatus === 'PENDING'
                  ? 'Your documents are under review. Transactions will be enabled once approved.'
                  : user?.kycStatus === 'REJECTED'
                  ? 'Your KYC was rejected. Please re-submit your documents.'
                  : 'Submit your identity documents to enable transactions.'}
              </p>
            </div>
            <Link
              href="/verify"
              className="text-xs bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            >
              {user?.kycStatus === 'REJECTED' ? 'Re-submit' : 'Verify Now'}
            </Link>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
