/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // reactStrictMode: false,
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:6002/api';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
