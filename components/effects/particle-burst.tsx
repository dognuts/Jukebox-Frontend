"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { createPortal } from "react-dom"

interface Particle {
  id: number
  emoji: string
  startX: number
  startY: number
  driftX: number
  travelY: number
  duration: number
  size: number
}

export function useParticleBurst() {
  const [particles, setParticles] = useState<Particle[]>([])

  const burst = useCallback(
    (emoji: string, count: number = 6, originEl?: HTMLElement | null) => {
      let originX = window.innerWidth / 2
      let originY = window.innerHeight * 0.75
      if (originEl) {
        const rect = originEl.getBoundingClientRect()
        originX = rect.left + rect.width / 2
        originY = rect.top
      }

      const newParticles: Particle[] = Array.from(
        { length: count },
        (_, i) => ({
          id: Date.now() + i + Math.random(),
          emoji,
          startX: originX + (Math.random() - 0.5) * 40,
          startY: originY,
          driftX: (Math.random() - 0.5) * 120,
          travelY: -(120 + Math.random() * 160),
          duration: 1.8 + Math.random() * 1.2,
          size: 1.2 + Math.random() * 1.0,
        })
      )
      setParticles((prev) => [...prev, ...newParticles])
      setTimeout(() => {
        setParticles((prev) =>
          prev.filter((p) => !newParticles.find((np) => np.id === p.id))
        )
      }, 4000)
    },
    []
  )

  return { particles, burst }
}

function FloatingEmoji({ particle }: { particle: Particle }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const animation = el.animate(
      [
        {
          transform: "translateY(0px) translateX(0px) scale(0.5)",
          opacity: 1,
        },
        {
          transform: `translateY(${particle.travelY * 0.4}px) translateX(${particle.driftX * 0.5}px) scale(1.2)`,
          opacity: 1,
          offset: 0.3,
        },
        {
          transform: `translateY(${particle.travelY * 0.8}px) translateX(${particle.driftX * 0.85}px) scale(1.1)`,
          opacity: 0.8,
          offset: 0.6,
        },
        {
          transform: `translateY(${particle.travelY}px) translateX(${particle.driftX}px) scale(0.7)`,
          opacity: 0,
        },
      ],
      {
        duration: particle.duration * 1000,
        easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        fill: "forwards",
      }
    )

    return () => animation.cancel()
  }, [particle])

  return (
    <span
      ref={ref}
      className="absolute"
      style={{
        left: `${particle.startX}px`,
        top: `${particle.startY}px`,
        fontSize: `${particle.size}rem`,
      }}
    >
      {particle.emoji}
    </span>
  )
}

export function ParticleBurstDisplay({
  particles,
}: {
  particles: Particle[]
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || particles.length === 0) return null

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 9999 }}
      aria-hidden="true"
    >
      {particles.map((p) => (
        <FloatingEmoji key={p.id} particle={p} />
      ))}
    </div>,
    document.body
  )
}
