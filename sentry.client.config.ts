import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Performance monitoring — sample 20% of transactions
  tracesSampleRate: 0.2,

  // Session replay — capture 5% of sessions, 100% of sessions with errors
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration(),
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
