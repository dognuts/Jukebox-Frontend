"use client"

import { useEffect, useRef, useCallback } from "react"

interface SupernovaSparksCascadeProps {
  active: boolean
  fillPct: number
  tubeRef?: React.RefObject<HTMLDivElement | null>
}

interface Spark {
  x: number
  y: number // relative to canvas (which may start above parent)
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  brightness: number
  trail: { x: number; y: number; alpha: number }[]
}

export function SupernovaSparksCascade({ active, fillPct, tubeRef }: SupernovaSparksCascadeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sparksRef = useRef<Spark[]>([])
  const frameRef = useRef<number>(0)
  const topExtension = useRef(0)
  const mobileScaleRef = useRef(1)

  const measureLayout = useCallback(() => {
    const canvas = canvasRef.current
    const parent = canvas?.parentElement
    const tube = tubeRef?.current
    if (!canvas || !parent) return

    const parentRect = parent.getBoundingClientRect()
    let canvasTop = parentRect.top
    let canvasHeight = parentRect.height

    if (tube) {
      const tubeRect = tube.getBoundingClientRect()
      const tubeCenter = tubeRect.top + tubeRect.height / 2
      if (tubeCenter < parentRect.top) {
        // Tube is above parent — extend canvas upward
        topExtension.current = parentRect.top - tubeCenter
        canvasTop = tubeCenter
        canvasHeight = parentRect.height + topExtension.current
      } else {
        topExtension.current = 0
      }
    } else {
      topExtension.current = 0
    }

    const dpr = window.devicePixelRatio
    canvas.width = parentRect.width * dpr
    canvas.height = canvasHeight * dpr

    // Position canvas to extend above parent
    canvas.style.top = `-${topExtension.current}px`
    canvas.style.height = `${canvasHeight}px`
    canvas.style.width = `${parentRect.width}px`

    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
  }, [tubeRef])

  const spawnSpark = useCallback((canvasW: number) => {
    // Scale down on mobile — sparks should be proportional to screen width
    const mobileScale = Math.min(1, canvasW / 400)
    mobileScaleRef.current = mobileScale
    const spawnX = Math.random() * (canvasW * fillPct / 100)
    const spark: Spark = {
      x: spawnX,
      y: 2 + Math.random() * 4,
      vx: (Math.random() - 0.5) * 3.5 * mobileScale,
      vy: (1.5 + Math.random() * 3.5) * mobileScale,
      life: 1,
      maxLife: 70 + Math.random() * 90,
      size: (0.8 + Math.random() * 1.5) * mobileScale,
      brightness: 0.8 + Math.random() * 0.2,
      trail: [],
    }
    sparksRef.current.push(spark)
  }, [fillPct])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !active) {
      sparksRef.current = []
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      return
    }

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    measureLayout()
    window.addEventListener("resize", measureLayout)

    const displayWidth = () => canvas.width / window.devicePixelRatio
    const displayHeight = () => canvas.height / window.devicePixelRatio

    let spawnTimer = 0
    let lastFrameTime = 0

    const animate = (timestamp: number) => {
      if (timestamp - lastFrameTime < 33) {
        frameRef.current = requestAnimationFrame(animate)
        return
      }
      lastFrameTime = timestamp
      measureLayout()

      const w = displayWidth()
      const h = displayHeight()
      ctx.clearRect(0, 0, w, h)

      spawnTimer++
      if (spawnTimer % 6 === 0 && sparksRef.current.length < 25) {
        spawnSpark(w)
      }

      const floorY = h - 4
      let floorGlow = 0

      sparksRef.current = sparksRef.current.filter((spark) => {
        // Physics
        spark.vy += 0.08
        spark.vx *= 0.99
        spark.x += spark.vx
        spark.y += spark.vy

        // Trail
        spark.trail.push({ x: spark.x, y: spark.y, alpha: spark.life })
        if (spark.trail.length > 8) spark.trail.shift()

        // Floor bounce
        if (spark.y >= floorY) {
          spark.y = floorY
          spark.vy *= -0.3
          spark.vx += (Math.random() - 0.5) * 2
          floorGlow += spark.brightness * spark.life * 0.3

          if (spark.vy < -0.5 && sparksRef.current.length < 50) {
            const ms = mobileScaleRef.current
            for (let i = 0; i < 2; i++) {
              sparksRef.current.push({
                x: spark.x + (Math.random() - 0.5) * 6 * ms,
                y: floorY - 1,
                vx: (Math.random() - 0.5) * 4 * ms,
                vy: -(1 + Math.random() * 2) * ms,
                life: 1,
                maxLife: 15 + Math.random() * 15,
                size: (0.4 + Math.random() * 0.6) * ms,
                brightness: 0.9,
                trail: [],
              })
            }
          }
        }

        // Wall bounce
        if (spark.x < 0 || spark.x > w) spark.vx *= -0.5

        // Age
        spark.life -= 1 / spark.maxLife
        if (spark.life <= 0) return false

        // Draw trail
        if (spark.trail.length > 1) {
          for (let i = 1; i < spark.trail.length; i++) {
            const t = spark.trail[i]
            const prev = spark.trail[i - 1]
            const trailAlpha = (i / spark.trail.length) * spark.life * 0.4
            ctx.beginPath()
            ctx.moveTo(prev.x, prev.y)
            ctx.lineTo(t.x, t.y)
            ctx.strokeStyle = `rgba(255, 250, 240, ${trailAlpha})`
            ctx.lineWidth = spark.size * 0.5
            ctx.stroke()
          }
        }

        // Draw spark core
        const alpha = spark.life * spark.brightness
        const coreSize = spark.size * (0.5 + spark.life * 0.5)

        // Outer glow
        const gradient = ctx.createRadialGradient(
          spark.x, spark.y, 0,
          spark.x, spark.y, coreSize * 4
        )
        gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.9})`)
        gradient.addColorStop(0.2, `rgba(255, 248, 220, ${alpha * 0.6})`)
        gradient.addColorStop(0.5, `rgba(255, 200, 100, ${alpha * 0.2})`)
        gradient.addColorStop(1, `rgba(255, 150, 50, 0)`)

        ctx.beginPath()
        ctx.arc(spark.x, spark.y, coreSize * 4, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()

        // Hot white core
        ctx.beginPath()
        ctx.arc(spark.x, spark.y, coreSize, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
        ctx.fill()

        return true
      })

      // Floor glow
      if (floorGlow > 0) {
        const floorGradient = ctx.createLinearGradient(0, floorY - 8, 0, floorY + 2)
        floorGradient.addColorStop(0, `rgba(255, 240, 200, 0)`)
        floorGradient.addColorStop(0.7, `rgba(255, 240, 200, ${Math.min(floorGlow, 0.15)})`)
        floorGradient.addColorStop(1, `rgba(255, 220, 150, ${Math.min(floorGlow, 0.1)})`)
        ctx.fillStyle = floorGradient
        ctx.fillRect(0, floorY - 8, w, 10)
      }

      // Subtle floor line
      ctx.beginPath()
      ctx.moveTo(0, floorY)
      ctx.lineTo(w, floorY)
      ctx.strokeStyle = "rgba(255, 240, 220, 0.04)"
      ctx.lineWidth = 1
      ctx.stroke()

      frameRef.current = requestAnimationFrame(animate)
    }

    frameRef.current = requestAnimationFrame(animate)

    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frameRef.current)
      } else {
        lastFrameTime = 0
        frameRef.current = requestAnimationFrame(animate)
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener("resize", measureLayout)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [active, spawnSpark, measureLayout])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      className="absolute left-0 right-0 pointer-events-none"
      style={{ zIndex: 5, top: 0 }}
    />
  )
}
