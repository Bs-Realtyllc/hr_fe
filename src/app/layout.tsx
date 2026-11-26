import type { Metadata } from 'next';
import { plusJakartaSans } from '@/fonts';
import '@/styles/global.css';
import '@bsrealtyllc/design-system/style.css';
import StoreProvider from '@/store/StoreProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import QueryProvider from '@/providers/QueryProvider';
import { ToastContainer } from 'react-toastify';

export const metadata: Metadata = {
  title: 'HR Platform',
  description: 'Internal HR management platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <body>
        <ToastContainer
          position="bottom-right"
          autoClose={5000}
          limit={6}
          hideProgressBar
          newestOnTop
          stacked
          closeOnClick={false}
          rtl={false}
          pauseOnFocusLoss={false}
          draggable
          theme="light"
        />
        {/* Providers only. The signed-in shell (sidebar, clock, auth guard)
            lives in app/(app)/layout.tsx; (auth) and (public) pages render bare. */}
        <StoreProvider>
          <QueryProvider>
            <AuthProvider>{children}</AuthProvider>
          </QueryProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
