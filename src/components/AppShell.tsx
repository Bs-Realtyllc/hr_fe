'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';

function initials(name: string) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password'];
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));

  // Auth guard
  useEffect(() => {
    if (!loading && !user && !isPublic) {
      router.replace('/login');
    }
  }, [user, loading, pathname, router, isPublic]);

  // Close sidebar on navigation (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Initialise Capacitor native plugins (no-op in browser)
  useEffect(() => {
    import('@/lib/capacitor').then(m => m.initCapacitorPlugins());
  }, []);

  if (isPublic) return <>{children}</>;
  if (loading || !user) return null;

  return (
    <div className="app-shell">
      {/* ── Mobile top bar ── */}
      <header className="mobile-header">
        <button
          className="mobile-hamburger"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation menu"
        >
          ☰
        </button>
        <span className="mobile-header-title">HR Platform</span>
        <div className="mobile-header-avatar" aria-hidden="true">
          {initials(user.name)}
        </div>
      </header>

      {/* ── Backdrop (tap to close sidebar on mobile) ── */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar (passes mobile open/close state) ── */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* ── Main content ── */}
      <main className="main-content">{children}</main>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Shell>{children}</Shell>
    </AuthProvider>
  );
}
