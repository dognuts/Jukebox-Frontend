"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  r: number
  g: number
  b: number
  life: number
  maxLife: number
  type: "burst" | "confetti"
  rotation: number
  rotSpeed: number
  gravity: number
  drag: number
}

// Neon level palette for confetti
const PALETTE: [number, number, number][] = [
  [0, 186, 217],     // cyan
  [210, 70, 190],    // magenta
  [232, 154, 60],    // amber
  [180, 100, 255],   // purple
  [255, 245, 220],   // white/gold
  [93, 202, 135],    // green
]

interface SupernovaExplosionProps {
  active: boolean
  activatedBy?: string
}

export function SupernovaExplosion({ active, activatedBy }: SupernovaExplosionProps) {
  const [mounted, setMounted] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef(0)
  const particlesRef = useRef<Particle[]>([])
  const phaseRef = useRef(0) // elapsed time in ms
  const flashRef = useRef(0)

  // Mount portal on activation
  useEffect(() => {
    if (active) {
      setMounted(true)
      phaseRef.current = 0
      flashRef.current = 1
      particlesRef.current = []
    }
  }, [active])

  // Canvas animation
  useEffect(() => {
    if (!mounted) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d", { alpha: true })
    if (!ctx) return

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReduced) {
      // Still show the flash but skip particles
      setTimeout(() => setMounted(false), 1500)
      return
    }

    const dpr = window.devicePixelRatio || 1
    let w = window.innerWidth
    let h = window.innerHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const cx = w / 2
    const cy = h / 2
    let spawned = false

    function spawnParticles() {
      if (spawned) return
      spawned = true
      const particles = particlesRef.current

      // Central burst — 150 particles radiating outward
      for (let i = 0; i < 150; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 3 + Math.random() * 12
        const color = PALETTE[Math.floor(Math.random() * PALETTE.length)]
        // Bias toward warm colors (white/gold/amber)
        const warmBias = Math.random() < 0.4
        const [r, g, b] = warmBias ? [255, 240 + Math.random() * 15, 200 + Math.random() * 40] : color
        particles.push({
          x: cx + (Math.random() - 0.5) * 20,
          y: cy + (Math.random() - 0.5) * 20,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 1.5 + Math.random() * 3.5,
          r, g, b,
          life: 1,
          maxLife: 1,
          type: "burst",
          rotation: 0,
          rotSpeed: 0,
          gravity: 0.02,
          drag: 0.97,
        })
      }

      // Confetti rain — spawned from top with gravity
      for (let i = 0; i < 120; i++) {
        const color = PALETTE[Math.floor(Math.random() * PALETTE.length)]
        particles.push({
          x: Math.random() * w,
          y: -10 - Math.random() * h * 0.3,
          vx: (Math.random() - 0.5) * 2,
          vy: 1.5 + Math.random() * 3,
          size: 2 + Math.random() * 4,
          r: color[0], g: color[1], b: color[2],
          life: 1,
          maxLife: 1,
          type: "confetti",
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.15,
          gravity: 0.04 + Math.random() * 0.03,
          drag: 0.995,
        })
      }
    }

    let lastFrame = 0
    const startTime = performance.now()

    function frame(time: number) {
      const elapsed = time - startTime
      phaseRef.current = elapsed

      // Cap at ~45fps for smooth explosion
      if (time - lastFrame < 22) {
        animRef.current = requestAnimationFrame(frame)
        return
      }
      lastFrame = time

      ctx!.clearRect(0, 0, w, h)

      // White flash overlay (first 400ms)
      if (flashRef.current > 0) {
        flashRef.current = Math.max(0, 1 - elapsed / 400)
        ctx!.save()
        ctx!.globalAlpha = flashRef.current * 0.35
        ctx!.fillStyle = "#fff"
        ctx!.fillRect(0, 0, w, h)
        ctx!.restore()
      }

      // Spawn particles on first frame
      if (elapsed > 50) spawnParticles()

      // Draw + update particles
      const dt = 1 // fixed timestep
      const alive: Particle[] = []

      for (const p of particlesRef.current) {
        // Physics
        p.vx *= p.drag
        p.vy *= p.drag
        p.vy += p.gravity * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.rotation += p.rotSpeed

        // Decay
        if (p.type === "burst") {
          p.life -= 0.008
        } else {
          // Confetti starts fading after 2s
          if (elapsed > 2000) p.life -= 0.006
          // Remove if off-screen
          if (p.y > h + 20) p.life = 0
        }

        if (p.life <= 0) continue
        alive.push(p)

        const alpha = Math.max(0, p.life)

        ctx!.save()
        ctx!.globalAlpha = alpha

        if (p.type === "confetti") {
          // Tumbling rectangle
          ctx!.translate(p.x, p.y)
          ctx!.rotate(p.rotation)
          const halfW = p.size * 0.6
          const halfH = p.size * 0.3
          ctx!.fillStyle = `rgb(${p.r},${p.g},${p.b})`
          ctx!.fillRect(-halfW, -halfH, halfW * 2, halfH * 2)
          // Slight highlight on one side
          ctx!.globalAlpha = alpha * 0.4
          ctx!.fillStyle = "#fff"
          ctx!.fillRect(-halfW, -halfH, halfW, halfH * 2)
        } else {
          // Glowing circle
          const grad = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2)
          grad.addColorStop(0, `rgba(${p.r},${p.g},${p.b},${alpha})`)
          grad.addColorStop(0.4, `rgba(${p.r},${p.g},${p.b},${alpha * 0.5})`)
          grad.addColorStop(1, `rgba(${p.r},${p.g},${p.b},0)`)
          ctx!.fillStyle = grad
          ctx!.beginPath()
          ctx!.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2)
          ctx!.fill()

          // Bright core
          ctx!.globalAlpha = alpha * 0.9
          ctx!.fillStyle = `rgb(${Math.min(255, p.r + 60)},${Math.min(255, p.g + 60)},${Math.min(255, p.b + 60)})`
          ctx!.beginPath()
          ctx!.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2)
          ctx!.fill()
        }

        ctx!.restore()
      }

      particlesRef.current = alive

      // Unmount after all particles are dead and flash is done (min 3s)
      if (alive.length === 0 && elapsed > 3000) {
        setMounted(false)
        return
      }

      // Hard cutoff at 7s
      if (elapsed > 7000) {
        setMounted(false)
        return
      }

      animRef.current = requestAnimationFrame(frame)
    }

    animRef.current = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(animRef.current)
      particlesRef.current = []
    }
  }, [mounted])

  if (!mounted || typeof document === "undefined") return null

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 9998 }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        aria-hidden
      />
      {/* "SUPERNOVA" text announcement */}
      {activatedBy && (
        <div
          className="absolute inset-x-0 top-[20%] flex flex-col items-center gap-2"
          style={{ animation: "neon-tube-supernova-text 3s ease-out forwards" }}
        >
          <div
            className="font-bold uppercase tracking-[0.3em]"
            style={{
              fontSize: "clamp(1.5rem, 4vw, 3rem)",
              color: "oklch(0.95 0.03 80)",
              textShadow: "0 0 20px rgba(255,245,220,0.6), 0 0 40px rgba(232,154,60,0.4), 0 0 80px rgba(232,154,60,0.2)",
            }}
          >
            Supernova
          </div>
          <div
            className="text-sm font-semibold"
            style={{
              color: "rgba(232,230,234,0.7)",
              textShadow: "0 0 10px rgba(0,0,0,0.8)",
            }}
          >
            {activatedBy} unlocked a room effect!
          </div>
        </div>
      )}
    </div>,
    document.body
  )
}
