/** @type {import('next').NextConfig} */
// Cache invalidation: 2026-03-17
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
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
