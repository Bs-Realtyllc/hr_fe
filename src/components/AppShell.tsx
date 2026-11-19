'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import Clock from '@/components/Clock';
import ClockInPopup from '@/components/ClockInPopup';
import { useAppDispatch } from '@/store/hooks';
import { setSidebarOpen } from '@/store/slices/sidebarSlice';
import { RxHamburgerMenu } from 'react-icons/rx';


function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const dispatch = useAppDispatch();


  const PUBLIC_PATHS = ['/login', '/logout', '/forgot-password', '/reset-password', '/onboard/', '/request-access', '/welcome', '/two-factor'];
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));

  useEffect(() => {
    if (!loading && !user && !isPublic) {
      router.replace('/login');
    }
  }, [user, loading, pathname, router]);

  // Route changes close the mobile drawer; harmless on desktop, where the
  // sidebar's layout doesn't depend on this flag at all.
  useEffect(() => {
    dispatch(setSidebarOpen(false));
  }, [pathname, dispatch]);

  if (isPublic) {
    return <>{children}</>;
  }

  if (loading || !user) return null;

  // Admin doesn't track their own attendance — same roles that see Tracker
  // in the sidebar are the only ones that clock in/out, so only they get
  // the global clock widget and its reminder popup. Suppressed on the
  // Tracker page itself, which already shows the full live timer — pause/
  // resume/clock-out there don't broadcast to this compact widget the way
  // clock-in does, so showing both risks two clocks disagreeing.
  const showClock = user.role !== 'admin' && !pathname.startsWith('/tracker');

  return (
    <div className="app-shell">
      <Sidebar />
      {showClock && <ClockInPopup />}
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
      <main className="main-content">
        <div className="page-container">{children}</div>
      </main>
      {/* Fixed overlay, not part of any page's layout flow, so it stays
          mounted (and in sync) across every route, not just Dashboard. */}
      {showClock && (
        <div className="global-clock-overlay">
          <Clock />
        </div>
      )}
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Shell>
        {children}</Shell>
    </AuthProvider >
  );
}
