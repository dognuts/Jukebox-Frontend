"use client"

import { useEffect, useRef, useState } from "react"
import type { RoomEffect } from "@/hooks/use-room-websocket"

interface RoomEffectOverlayProps {
  effect: RoomEffect | null
}

export function RoomEffectOverlay({ effect }: RoomEffectOverlayProps) {
  const [active, setActive] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Check expiry and manage active state
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!effect) {
      setActive(false)
      return
    }
    const expiresAt = new Date(effect.expiresAt).getTime()
    const remaining = expiresAt - Date.now()
    if (remaining <= 0) {
      setActive(false)
      return
    }
    setActive(true)
    timerRef.current = setTimeout(() => setActive(false), remaining)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [effect])

  if (!active || !effect) return null

  switch (effect.type) {
    case "aurora":
      return <AuroraEffect />
    case "neon_rain":
      return <NeonRainEffect />
    case "stardust":
      return <StardustEffect />
    default:
      return null
  }
}

/* ─── Aurora ──────────────────────────────────────────────────────── */
// Slow-moving gradient bands across the top of the screen. Pure CSS.

function AuroraEffect() {
  return (
    <div
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 2 }}
      aria-hidden
    >
      <div
        className="absolute inset-x-0 top-0"
        style={{
          height: "45%",
          background: `
            linear-gradient(135deg,
              oklch(0.30 0.15 195 / 0.06) 0%,
              transparent 25%,
              oklch(0.28 0.18 330 / 0.05) 40%,
              transparent 55%,
              oklch(0.32 0.14 80 / 0.06) 70%,
              transparent 85%,
              oklch(0.28 0.16 270 / 0.04) 100%
            )
          `,
          backgroundSize: "300% 300%",
          animation: "room-effect-aurora 20s ease-in-out infinite",
          maskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 top-0"
        style={{
          height: "35%",
          background: `
            linear-gradient(225deg,
              oklch(0.25 0.12 160 / 0.04) 0%,
              transparent 30%,
              oklch(0.30 0.16 280 / 0.05) 50%,
              transparent 70%,
              oklch(0.28 0.14 350 / 0.04) 100%
            )
          `,
          backgroundSize: "250% 250%",
          animation: "room-effect-aurora 15s ease-in-out infinite reverse",
          maskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
        }}
      />
    </div>
  )
}

/* ─── Neon Rain ───────────────────────────────────────────────────── */
// Faint vertical neon streaks falling across the background. Canvas.

function NeonRainEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d", { alpha: true })
    if (!ctx) return

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const dpr = window.devicePixelRatio || 1
    let w = window.innerWidth
    let h = window.innerHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const colors: [number, number, number][] = [
      [0, 186, 217], [210, 70, 190], [232, 154, 60], [180, 100, 255],
    ]

    interface Drop {
      x: number
      y: number
      speed: number
      length: number
      color: [number, number, number]
      opacity: number
    }

    const drops: Drop[] = []
    const MAX_DROPS = 25

    let lastFrame = 0

    function frame(time: number) {
      if (time - lastFrame < 50) { // ~20fps for subtle effect
        animRef.current = requestAnimationFrame(frame)
        return
      }
      lastFrame = time

      ctx!.clearRect(0, 0, w, h)

      // Spawn
      if (drops.length < MAX_DROPS && Math.random() < 0.15) {
        const c = colors[Math.floor(Math.random() * colors.length)]
        drops.push({
          x: Math.random() * w,
          y: -20,
          speed: 0.8 + Math.random() * 1.5,
          length: 20 + Math.random() * 40,
          color: c,
          opacity: 0.03 + Math.random() * 0.06,
        })
      }

      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i]
        d.y += d.speed

        if (d.y > h + d.length) {
          drops.splice(i, 1)
          continue
        }

        const grad = ctx!.createLinearGradient(d.x, d.y - d.length, d.x, d.y)
        grad.addColorStop(0, `rgba(${d.color[0]},${d.color[1]},${d.color[2]},0)`)
        grad.addColorStop(0.5, `rgba(${d.color[0]},${d.color[1]},${d.color[2]},${d.opacity})`)
        grad.addColorStop(1, `rgba(${d.color[0]},${d.color[1]},${d.color[2]},0)`)
        ctx!.strokeStyle = grad
        ctx!.lineWidth = 1
        ctx!.beginPath()
        ctx!.moveTo(d.x, d.y - d.length)
        ctx!.lineTo(d.x, d.y)
        ctx!.stroke()
      }

      animRef.current = requestAnimationFrame(frame)
    }

    animRef.current = requestAnimationFrame(frame)

    const onVis = () => {
      if (document.hidden) cancelAnimationFrame(animRef.current)
      else { lastFrame = 0; animRef.current = requestAnimationFrame(frame) }
    }
    document.addEventListener("visibilitychange", onVis)

    const onResize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    window.addEventListener("resize", onResize)

    return () => {
      cancelAnimationFrame(animRef.current)
      document.removeEventListener("visibilitychange", onVis)
      window.removeEventListener("resize", onResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 2 }}
      aria-hidden
    />
  )
}

/* ─── Stardust ────────────────────────────────────────────────────── */
// Tiny twinkling star particles scattered across the background. Canvas.

function StardustEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d", { alpha: true })
    if (!ctx) return

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const dpr = window.devicePixelRatio || 1
    let w = window.innerWidth
    let h = window.innerHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    interface Star {
      x: number
      y: number
      size: number
      phase: number
      speed: number
      color: [number, number, number]
    }

    // Pre-generate fixed stars
    const stars: Star[] = Array.from({ length: 40 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      size: 0.5 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 1.5,
      color: [
        [255, 245, 220],
        [200, 220, 255],
        [255, 200, 220],
        [220, 255, 230],
      ][Math.floor(Math.random() * 4)] as [number, number, number],
    }))

    let lastFrame = 0

    function frame(time: number) {
      if (time - lastFrame < 50) { // ~20fps
        animRef.current = requestAnimationFrame(frame)
        return
      }
      lastFrame = time

      ctx!.clearRect(0, 0, w, h)
      const timeSec = time / 1000

      for (const s of stars) {
        const twinkle = (Math.sin(timeSec * s.speed + s.phase) + 1) / 2
        const alpha = 0.02 + twinkle * 0.08

        // Glow
        ctx!.save()
        ctx!.globalAlpha = alpha * 0.5
        const grad = ctx!.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 4)
        grad.addColorStop(0, `rgba(${s.color[0]},${s.color[1]},${s.color[2]},0.3)`)
        grad.addColorStop(1, `rgba(${s.color[0]},${s.color[1]},${s.color[2]},0)`)
        ctx!.fillStyle = grad
        ctx!.beginPath()
        ctx!.arc(s.x, s.y, s.size * 4, 0, Math.PI * 2)
        ctx!.fill()

        // Core
        ctx!.globalAlpha = alpha
        ctx!.fillStyle = `rgb(${s.color[0]},${s.color[1]},${s.color[2]})`
        ctx!.beginPath()
        ctx!.arc(s.x, s.y, s.size, 0, Math.PI * 2)
        ctx!.fill()
        ctx!.restore()
      }

      animRef.current = requestAnimationFrame(frame)
    }

    animRef.current = requestAnimationFrame(frame)

    const onVis = () => {
      if (document.hidden) cancelAnimationFrame(animRef.current)
      else { lastFrame = 0; animRef.current = requestAnimationFrame(frame) }
    }
    document.addEventListener("visibilitychange", onVis)

    const onResize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      // Redistribute stars
      for (const s of stars) {
        s.x = Math.random() * w
        s.y = Math.random() * h
      }
    }
    window.addEventListener("resize", onResize)

    return () => {
      cancelAnimationFrame(animRef.current)
      document.removeEventListener("visibilitychange", onVis)
      window.removeEventListener("resize", onResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 2 }}
      aria-hidden
    />
  )
}
