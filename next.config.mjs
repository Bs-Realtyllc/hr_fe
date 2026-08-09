/** @type {import('next').NextConfig} */
const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true';

const nextConfig = {
  // Web: standalone for Docker. Mobile: export for Capacitor static bundle.
  output: isCapacitorBuild ? 'export' : 'standalone',

  // Trailing slash required for Capacitor static export (index.html per route)
  ...(isCapacitorBuild && { trailingSlash: true }),

  // Disable Next.js image optimisation for Capacitor (no server at runtime)
  images: {
    unoptimized: isCapacitorBuild,
  },

  // API rewrites only work when the Next.js server is running (web deployment)
  ...(!isCapacitorBuild && {
    async rewrites() {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:6002/api';
      return [
        {
          source: '/api/:path*',
          destination: `${apiUrl}/:path*`,
        },
      ];
    },
  }),
};

export default nextConfig;
