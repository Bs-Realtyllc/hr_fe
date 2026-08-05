'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import { useAppSelector } from '@/store/hook';


function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const isOpen = useAppSelector((state) => state.sidebar.isOpen);


  const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password'];
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));

  useEffect(() => {
    if (!loading && !user && !isPublic) {
      router.replace('/login');
    }
  }, [user, loading, pathname, router]);

  if (isPublic) {
    return <>{children}</>;
  }

  if (loading || !user) return null;

  return (
    <div className="app-shell">
      <Sidebar />
      <main className={`main-content ${isOpen ? '':'sidebar-closed'}`}>{children}</main>
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
