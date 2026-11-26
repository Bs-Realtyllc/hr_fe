import type { Metadata } from 'next';
import { plusJakartaSans } from '@/fonts';
import '../styles/global.css';
import '@bsrealtyllc/design-system/style.css';
import AppShell from '@/components/AppShell';
import StoreProvider from '@/store/storeProvider';
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
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}
