/** @type {import('next').NextConfig} */
// Force full rebuild - cache disabled
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  onDemandEntries: {
    maxInactiveAge: 0,
    maxSize: 0,
  },
  async rewrites() {
    return [
      // Proxy WebSocket connections through Next.js to avoid cross-origin issues
      {
        source: '/ws/:path*',
        destination: 'http://localhost:8080/ws/:path*',
      },
      // Proxy API calls through Next.js too (optional but consistent)
      {
        source: '/api/:path*',
        destination: 'http://localhost:8080/api/:path*',
      },
    ]
  },
}

export default nextConfig
