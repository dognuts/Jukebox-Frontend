"use client"

import { useEffect, useState } from "react"

export function AmbientBackground() {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  if (reducedMotion) {
    return (
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
        aria-hidden="true"
      >
        {/* Static fallback */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 20% 30%, oklch(0.20 0.08 80 / 0.15), transparent),
              radial-gradient(ellipse 60% 50% at 80% 70%, oklch(0.18 0.06 250 / 0.12), transparent)
            `,
          }}
        />
        {/* Vignette */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 70% 70% at center, transparent 0%, oklch(0.08 0.01 280 / 0.6) 100%)",
          }}
        />
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {/* Slow-moving gradient orbs */}
      <div
        className="absolute inset-0 animate-ambient-drift-1"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 20% 30%, oklch(0.30 0.14 80 / 0.18), transparent)",
          filter: "blur(60px)",
        }}
      />
      <div
        className="absolute inset-0 animate-ambient-drift-2"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 80% 70%, oklch(0.28 0.12 250 / 0.15), transparent)",
          filter: "blur(80px)",
        }}
      />
      <div
        className="absolute inset-0 animate-ambient-drift-3"
        style={{
          background: "radial-gradient(ellipse 50% 40% at 50% 50%, oklch(0.25 0.10 350 / 0.10), transparent)",
          filter: "blur(100px)",
        }}
      />

      {/* Subtle noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
        }}
      />

      {/* Soft vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 70% 70% at center, transparent 0%, oklch(0.08 0.01 280 / 0.5) 100%)",
        }}
      />
    </div>
  )
}
