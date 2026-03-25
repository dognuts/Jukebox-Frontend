import { withSentryConfig } from "@sentry/nextjs"

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Disable source maps in production to prevent easy code copying
  productionBrowserSourceMaps: false,
  // Tell Next.js 16 we're aware of Turbopack (Sentry adds webpack config)
  turbopack: {},
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(), payment=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://w.soundcloud.com https://www.youtube.com https://s.ytimg.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https: http:",
              "media-src 'self' blob: https: http:",
              "font-src 'self' data:",
              "connect-src 'self' https: wss:",
              "frame-src https://www.youtube.com https://w.soundcloud.com https://challenges.cloudflare.com",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
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

export default withSentryConfig(nextConfig, {
  // Upload source maps to Sentry for readable stack traces (only if auth token is set)
  silent: true, // suppress build output noise
  disableLogger: true,

  // Don't widen the scope of the bundle
  widenClientFileUpload: false,

  // Hide source maps from the client (security — we set productionBrowserSourceMaps: false above)
  hideSourceMaps: true,

  // Disable Sentry webpack plugin if no auth token is configured
  // This means builds work fine without Sentry — it's purely additive
  org: process.env.SENTRY_ORG || undefined,
  project: process.env.SENTRY_PROJECT || undefined,
  authToken: process.env.SENTRY_AUTH_TOKEN || undefined,
})
