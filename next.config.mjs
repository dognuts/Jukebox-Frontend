/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    // Only proxy to localhost in development — in production the frontend
    // calls the backend directly via NEXT_PUBLIC_API_URL
    if (process.env.NODE_ENV === 'production') return []
    return [
      {
        source: '/ws/:path*',
        destination: 'http://localhost:8080/ws/:path*',
      },
      {
        source: '/api/:path*',
        destination: 'http://localhost:8080/api/:path*',
      },
    ]
  },
}

export default nextConfig
