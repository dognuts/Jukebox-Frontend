import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Performance monitoring — sample 10% of transactions
  tracesSampleRate: 0.1,

  // Session replay — disabled by default to avoid input-latency overhead;
  // still capture replays on errors but at a reduced rate
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.25,

  integrations: [
    Sentry.replayIntegration({
      // Mask all text/media so replay processing is cheaper and PII-safe
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Don't send PII
  sendDefaultPii: false,

  // Filter out noisy errors
  ignoreErrors: [
    // Browser extensions
    "chrome-extension://",
    "moz-extension://",
    // Network errors that aren't our fault
    "Failed to fetch",
    "NetworkError",
    "Load failed",
    // ResizeObserver spam
    "ResizeObserver loop",
  ],
})
