"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { usePathname } from "next/navigation"
import { useEasterEggs } from "@/hooks/use-easter-eggs"

interface Bubble {
  x: number
  y: number
  radius: number
  vy: number
  wobblePhase: number
  wobbleSpeed: number
  driftPhase: number
  driftAmp: number
  driftSpeed: number
  hue: number
  opacity: number
  maxOpacity: number
  born: number
  popping: boolean
  popFrame: number
}

interface PopDroplet {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  life: number
  hue: number
}

const HUES = [80, 350, 250, 160]
const MAX_BUBBLES = 7
const SPAWN_INTERVAL = 200 // frames (~3.3s at 60fps)

export function BubbleBackground() {
  const pathname = usePathname()
  // Skip the canvas animation on room pages entirely — the room view
  // covers the viewport with its own visuals, and the per-frame
  // radial-gradient work here was measurably contending with input
  // handling (causing noticeable typing lag in chat on lower-end
  // machines).
  const skip = pathname?.startsWith("/room/") ?? false

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bubblesRef = useRef<Bubble[]>([])
  const dropletsRef = useRef<PopDroplet[]>([])
  const animRef = useRef<number>(0)
  const spawnTimer = useRef(0)
  const { triggerBubblePop } = useEasterEggs()
  const triggerRef = useRef(triggerBubblePop)
  triggerRef.current = triggerBubblePop
  const [reducedMotion, setReducedMotion] = useState(false)

  const spawnBubble = useCallback((w: number, h: number) => {
    if (bubblesRef.current.length >= MAX_BUBBLES) return
    const radius = 8 + Math.random() * 22 // 8-30px, much smaller
    const maxOp = 0.35 + Math.random() * 0.25
    bubblesRef.current.push({
      x: radius + Math.random() * (w - radius * 2),
      y: h + radius + Math.random() * 60,
      radius,
      vy: -(0.15 + Math.random() * 0.35), // slow gentle rise
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: 1 + Math.random() * 1,
      driftPhase: Math.random() * Math.PI * 2,
      driftAmp: 0.15 + Math.random() * 0.3,
      driftSpeed: 0.2 + Math.random() * 0.3,
      hue: HUES[Math.floor(Math.random() * HUES.length)],
      opacity: 0,
      maxOpacity: maxOp,
      born: performance.now(),
      popping: false,
      popFrame: 0,
    })
  }, [])

  const popBubble = useCallback((index: number) => {
    const b = bubblesRef.current[index]
    if (!b || b.popping) return
    b.popping = true
    b.popFrame = 0
    triggerRef.current()
    const count = 5 + Math.floor(Math.random() * 3)
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5
      const speed = 0.8 + Math.random() * 1.2
      dropletsRef.current.push({
        x: b.x + Math.cos(angle) * b.radius * 0.7,
        y: b.y + Math.sin(angle) * b.radius * 0.7,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.3,
        radius: 1 + Math.random() * 2,
        life: 1,
        hue: b.hue,
      })
    }
  }, [])

  useEffect(() => {
    if (skip) return

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReducedMotion(mq.matches)
    if (mq.matches) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d", { alpha: true })
    if (!ctx) return

    let w = 0
    let h = 0

    function resize() {
      const dpr = window.devicePixelRatio || 1
      w = window.innerWidth
      h = window.innerHeight
      canvas!.width = w * dpr
      canvas!.height = h * dpr
      canvas!.style.width = `${w}px`
      canvas!.style.height = `${h}px`
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener("resize", resize)

    // Seed a few bubbles at random heights
    for (let i = 0; i < 4; i++) {
      const radius = 8 + Math.random() * 22
      bubblesRef.current.push({
        x: radius + Math.random() * (Math.max(w, 200) - radius * 2),
        y: h * (0.25 + Math.random() * 0.6),
        radius,
        vy: -(0.15 + Math.random() * 0.35),
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 1 + Math.random() * 1,
        driftPhase: Math.random() * Math.PI * 2,
        driftAmp: 0.15 + Math.random() * 0.3,
        driftSpeed: 0.2 + Math.random() * 0.3,
        hue: HUES[Math.floor(Math.random() * HUES.length)],
        opacity: 0.3 + Math.random() * 0.2,
        maxOpacity: 0.35 + Math.random() * 0.25,
        born: performance.now() - 4000,
        popping: false,
        popFrame: 0,
      })
    }

    function drawBubble(b: Bubble, time: number): boolean {
      const ageSec = (time - b.born) / 1000

      // Gentle fade in
      if (!b.popping && b.opacity < b.maxOpacity) {
        b.opacity = Math.min(b.maxOpacity, ageSec * 0.5)
      }

      // Smooth wobble via sin: slight squash/stretch
      const wobble = Math.sin(ageSec * b.wobbleSpeed + b.wobblePhase) * 0.04
      const rx = b.radius * (1 + wobble)
      const ry = b.radius * (1 - wobble)

      // Smooth horizontal drift
      const drift = Math.sin(ageSec * b.driftSpeed + b.driftPhase) * b.driftAmp
      const cx = b.x + drift
      const cy = b.y

      ctx!.save()

      if (b.popping) {
        b.popFrame++
        const p = b.popFrame / 14
        if (p >= 1) { ctx!.restore(); return false }
        ctx!.globalAlpha = b.opacity * (1 - p)
        const s = 1 + p * 0.4
        ctx!.translate(cx, cy)
        ctx!.scale(s, s)
        ctx!.translate(-cx, -cy)
      } else {
        ctx!.globalAlpha = b.opacity
      }

      // Soft outer glow
      const glow = ctx!.createRadialGradient(cx, cy, rx * 0.4, cx, cy, rx * 1.5)
      glow.addColorStop(0, `oklch(0.65 0.10 ${b.hue} / 0.05)`)
      glow.addColorStop(1, `oklch(0.65 0.10 ${b.hue} / 0)`)
      ctx!.fillStyle = glow
      ctx!.beginPath()
      ctx!.ellipse(cx, cy, rx * 1.5, ry * 1.5, 0, 0, Math.PI * 2)
      ctx!.fill()

      // Thin iridescent shell body
      const body = ctx!.createRadialGradient(cx - rx * 0.15, cy - ry * 0.15, rx * 0.1, cx, cy, rx)
      body.addColorStop(0, `oklch(0.85 0.05 ${b.hue} / 0.06)`)
      body.addColorStop(0.6, `oklch(0.72 0.07 ${b.hue} / 0.03)`)
      body.addColorStop(1, `oklch(0.60 0.08 ${b.hue} / 0.01)`)
      ctx!.fillStyle = body
      ctx!.beginPath()
      ctx!.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
      ctx!.fill()

      // Iridescent rim
      const rim = ctx!.createRadialGradient(cx, cy, rx * 0.82, cx, cy, rx)
      rim.addColorStop(0, `oklch(0.78 0.08 ${b.hue} / 0)`)
      rim.addColorStop(0.5, `oklch(0.78 0.12 ${b.hue} / 0.12)`)
      rim.addColorStop(0.8, `oklch(0.72 0.14 ${(b.hue + 40) % 360} / 0.16)`)
      rim.addColorStop(1, `oklch(0.68 0.10 ${b.hue} / 0.06)`)
      ctx!.fillStyle = rim
      ctx!.beginPath()
      ctx!.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
      ctx!.fill()

      // Primary highlight
      const hlX = cx - rx * 0.28
      const hlY = cy - ry * 0.32
      const hlR = rx * 0.24
      const hl = ctx!.createRadialGradient(hlX, hlY, 0, hlX, hlY, hlR)
      hl.addColorStop(0, "oklch(0.97 0.01 80 / 0.45)")
      hl.addColorStop(0.5, "oklch(0.94 0.02 80 / 0.15)")
      hl.addColorStop(1, "oklch(0.90 0.02 80 / 0)")
      ctx!.fillStyle = hl
      ctx!.beginPath()
      ctx!.ellipse(hlX, hlY, hlR, hlR * 0.55, -0.5, 0, Math.PI * 2)
      ctx!.fill()

      // Small secondary highlight
      const h2X = cx + rx * 0.18
      const h2Y = cy + ry * 0.22
      const h2R = rx * 0.09
      const h2 = ctx!.createRadialGradient(h2X, h2Y, 0, h2X, h2Y, h2R)
      h2.addColorStop(0, "oklch(0.95 0.01 80 / 0.25)")
      h2.addColorStop(1, "oklch(0.90 0.01 80 / 0)")
      ctx!.fillStyle = h2
      ctx!.beginPath()
      ctx!.arc(h2X, h2Y, h2R, 0, Math.PI * 2)
      ctx!.fill()

      ctx!.restore()

      // Physics update (after drawing to keep stable)
      if (!b.popping) {
        b.y += b.vy
        // Fade near top
        if (b.y < h * 0.1) {
          b.opacity = Math.max(0, b.opacity - 0.002)
        }
      }

      return !b.popping || b.popFrame < 14
    }

    let lastFrameTime = 0

    function frame(time: number) {
      // Cap at ~30fps — this is just background decoration
      if (time - lastFrameTime < 33) {
        animRef.current = requestAnimationFrame(frame)
        return
      }
      lastFrameTime = time

      ctx!.clearRect(0, 0, w, h)

      // Draw and filter bubbles
      bubblesRef.current = bubblesRef.current.filter((b) => {
        if (b.y < -b.radius * 2 || b.opacity <= 0) return false
        return drawBubble(b, time)
      })

      // Draw and filter droplets
      dropletsRef.current = dropletsRef.current.filter((d) => {
        d.x += d.vx
        d.y += d.vy
        d.vy += 0.04
        d.vx *= 0.98
        d.life -= 0.025
        if (d.life <= 0) return false
        ctx!.save()
        ctx!.globalAlpha = d.life * 0.5
        const g = ctx!.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.radius)
        g.addColorStop(0, `oklch(0.82 0.10 ${d.hue} / 0.4)`)
        g.addColorStop(1, `oklch(0.70 0.08 ${d.hue} / 0)`)
        ctx!.fillStyle = g
        ctx!.beginPath()
        ctx!.arc(d.x, d.y, d.radius, 0, Math.PI * 2)
        ctx!.fill()
        ctx!.restore()
        return true
      })

      // Spawn
      spawnTimer.current++
      if (spawnTimer.current >= SPAWN_INTERVAL) {
        spawnTimer.current = 0
        spawnBubble(w, h)
      }

      animRef.current = requestAnimationFrame(frame)
    }

    animRef.current = requestAnimationFrame(frame)

    // Pause when tab hidden
    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(animRef.current)
      } else {
        lastFrameTime = 0
        animRef.current = requestAnimationFrame(frame)
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener("resize", resize)
      document.removeEventListener("visibilitychange", handleVisibility)
      bubblesRef.current = []
      dropletsRef.current = []
    }
  }, [spawnBubble, reducedMotion, skip])

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      for (let i = bubblesRef.current.length - 1; i >= 0; i--) {
        const b = bubblesRef.current[i]
        if (b.popping) continue
        const dx = mx - b.x
        const dy = my - b.y
        if (dx * dx + dy * dy < b.radius * b.radius * 1.5) {
          popBubble(i)
          return
        }
      }
    },
    [popBubble]
  )

  if (reducedMotion || skip) return null

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
      aria-hidden="true"
    />
  )
}
