"use client"

import { useEffect, useState } from "react"

// Shared prefers-reduced-motion hook for in-room animations that bypass
// the global CSS opt-out in globals.css — inline style={{ animation }}
// values, Web Animations API (el.animate) calls, and canvas rAF loops.
// SSR-safe: starts false (animations render as authored in the server
// HTML) and resolves on mount, then tracks live preference changes.
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  return reduced
}
