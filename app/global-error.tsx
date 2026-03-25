"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en" className="dark">
      <body style={{ background: "#0a0910", color: "#eee", fontFamily: "system-ui", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ color: "#888", marginBottom: 24 }}>An unexpected error occurred. Our team has been notified.</p>
          <button
            onClick={reset}
            style={{ background: "#ff6a1a", color: "#0a0910", border: "none", padding: "10px 24px", borderRadius: 12, fontWeight: 600, cursor: "pointer" }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  )
}
