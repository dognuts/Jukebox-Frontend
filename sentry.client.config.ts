import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Performance monitoring — sample 10% of transactions
  tracesSampleRate: 0.1,

  // Session replay is intentionally NOT registered: replaysSessionSampleRate
  // was 0, and statically registering Sentry.replayIntegration() ships the
  // entire @sentry-internal/replay bundle (~45-55KB gzipped) in the initial
  // client bundle of every page. If replay sampling is ever turned back on,
  // load it lazily instead of adding it to `integrations`:
  //
  //   Sentry.lazyLoadIntegration("replayIntegration").then((replayIntegration) => {
  //     Sentry.addIntegration(
  //       replayIntegration({ maskAllText: true, blockAllMedia: true })
  //     )
  //   })
  //
  // and set replaysSessionSampleRate / replaysOnErrorSampleRate here.

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
