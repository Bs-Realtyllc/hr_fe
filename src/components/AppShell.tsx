'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import { useAppDispatch } from '@/store/hook';
import { setSidebarOpen } from '@/store/sidebarSlice';
import { RxHamburgerMenu } from 'react-icons/rx';


function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const dispatch = useAppDispatch();


  const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password', '/onboard/'];
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

  return (
    <div className="app-shell">
      <Sidebar />
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
