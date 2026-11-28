import localFont from 'next/font/local';

// Self-hosted (latin subset) instead of next/font/google — the build no
// longer needs network access to fonts.googleapis.com/fonts.gstatic.com,
// and both layouts share one font instance instead of each loading it separately.
export const plusJakartaSans = localFont({
  src: [
    { path: './PlusJakartaSans-400.woff2', weight: '400', style: 'normal' },
    { path: './PlusJakartaSans-500.woff2', weight: '500', style: 'normal' },
    { path: './PlusJakartaSans-600.woff2', weight: '600', style: 'normal' },
    { path: './PlusJakartaSans-700.woff2', weight: '700', style: 'normal' },
    { path: './PlusJakartaSans-800.woff2', weight: '800', style: 'normal' },
  ],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
});

export const ibmPlexSans = localFont({
  src: [
    { path: './IBMPlexSans-400.woff2', weight: '400', style: 'normal' },
    { path: './IBMPlexSans-500.woff2', weight: '500', style: 'normal' },
    { path: './IBMPlexSans-600.woff2', weight: '600', style: 'normal' },
    { path: './IBMPlexSans-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-ibm-plex-sans',
  display: 'swap',
});
