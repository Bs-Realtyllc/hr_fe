'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import { useAppDispatch } from '@/store/hook';
import { setSidebarOpen } from '@/store/sidebarSlice';
import { RxHamburgerMenu } from 'react-icons/rx';


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
  const dispatch = useAppDispatch();

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

  // Route changes close the mobile drawer; harmless on desktop, where the
  // sidebar's layout doesn't depend on this flag at all.
  useEffect(() => {
    dispatch(setSidebarOpen(false));
  }, [pathname, dispatch]);

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
      <div className="mobile-topbar">
        <button
          className="mobile-topbar-toggle"
          onClick={() => dispatch(setSidebarOpen(true))}
          aria-label="Open menu"
        >
          <RxHamburgerMenu />
        </button>
        <span className="mobile-topbar-title">HR Platform</span>
      </div>
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
