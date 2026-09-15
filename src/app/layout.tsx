import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, IBM_Plex_Sans } from 'next/font/google';
import '../styles/global.css';
import AppShell from '@/components/AppShell';
import StoreProvider from '@/store/storeProvider';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta-sans',
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans',
});

export const metadata: Metadata = {
  title: 'HR Platform',
  description: 'Internal HR management platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${ibmPlexSans.variable}`}>
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
          pauseOnFocusLoss ={false}
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
