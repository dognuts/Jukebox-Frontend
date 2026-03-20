"use client"

import { useEffect, useRef, useCallback } from "react"

/* Two subtle neon tubes -- warm amber and soft magenta */
const TUBES = [
  {
    inset: 6,
    color: [220, 160, 40] as [number, number, number],
    coreColor: [255, 210, 120] as [number, number, number],
    width: 4,
    glowRadius: 16,
    breatheSpeed: 0.6,
    baseAlpha: 0.3,
  },
  {
    inset: 18,
    color: [200, 60, 120] as [number, number, number],
    coreColor: [255, 140, 175] as [number, number, number],
    width: 3,
    glowRadius: 12,
    breatheSpeed: 0.9,
    baseAlpha: 0.2,
  },
]

/* Card CSS has rounded-t-[2.5rem]=40px top, rounded-b-2xl=16px bottom */
const TOP_RADIUS = 40
const BOTTOM_RADIUS = 16

/**
 * Build a U-shaped arch path (left side up, across top, right side down)
 * using proper quadratic arcs that match the card's CSS border-radius.
 */
function buildArchPath(
  w: number,
  h: number,
  inset: number
): { x: number; y: number }[] {
  const rTop = Math.max(TOP_RADIUS - inset, 4)
  const rBot = Math.max(BOTTOM_RADIUS - inset, 4)
  const left = inset
  const right = w - inset
  const top = inset
  const bottom = h - inset

  const rawPts: { x: number; y: number }[] = []
  const arcSteps = 60 // steps per quarter arc

  // Start: bottom-left (above bottom-left arc)
  rawPts.push({ x: left, y: bottom - rBot })

  // Left side going up
  const leftStraightTop = top + rTop
  const leftStraightBot = bottom - rBot
  const leftSteps = 80
  for (let i = 1; i <= leftSteps; i++) {
    const t = i / leftSteps
    rawPts.push({ x: left, y: leftStraightBot - t * (leftStraightBot - leftStraightTop) })
  }

  // Top-left arc: center is at (left + rTop, top + rTop)
  // Sweep from PI (left) to 3PI/2 (up)
  for (let i = 1; i <= arcSteps; i++) {
    const angle = Math.PI + (Math.PI / 2) * (i / arcSteps)
    rawPts.push({
      x: left + rTop + rTop * Math.cos(angle),
      y: top + rTop + rTop * Math.sin(angle),
    })
  }

  // Top side going right
  const topStraightLeft = left + rTop
  const topStraightRight = right - rTop
  const topSteps = 100
  for (let i = 1; i <= topSteps; i++) {
    const t = i / topSteps
    rawPts.push({ x: topStraightLeft + t * (topStraightRight - topStraightLeft), y: top })
  }

  // Top-right arc: center is at (right - rTop, top + rTop)
  // Sweep from 3PI/2 (up) to 2PI (right)
  for (let i = 1; i <= arcSteps; i++) {
    const angle = (3 * Math.PI / 2) + (Math.PI / 2) * (i / arcSteps)
    rawPts.push({
      x: right - rTop + rTop * Math.cos(angle),
      y: top + rTop + rTop * Math.sin(angle),
    })
  }

  // Right side going down
  const rightStraightTop = top + rTop
  const rightStraightBot = bottom - rBot
  const rightSteps = 80
  for (let i = 1; i <= rightSteps; i++) {
    const t = i / rightSteps
    rawPts.push({ x: right, y: rightStraightTop + t * (rightStraightBot - rightStraightTop) })
  }

  // End: bottom-right (above bottom-right arc)
  rawPts.push({ x: right, y: bottom - rBot })

  return rawPts
}

function buildPath2D(pts: { x: number; y: number }[]): Path2D {
  const p = new Path2D()
  if (pts.length === 0) return p
  p.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) p.lineTo(pts[i].x, pts[i].y)
  return p
}

export function NeonArches({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const reducedMotion = useRef(false)
  const cachedW = useRef(0)
  const cachedH = useRef(0)
  const lastFrameTime = useRef(0)
  const cachedPaths = useRef<
    { pts: { x: number; y: number }[]; path2d: Path2D }[]
  >([])

  const draw = useCallback((timestamp: number) => {
    // Cap at ~30fps
    if (timestamp - lastFrameTime.current < 33) {
      animRef.current = requestAnimationFrame(draw)
      return
    }
    lastFrameTime.current = timestamp

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    const w = rect.width
    const h = rect.height

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    // Rebuild paths on resize
    if (w !== cachedW.current || h !== cachedH.current) {
      cachedW.current = w
      cachedH.current = h
      cachedPaths.current = TUBES.map((tube) => {
        const pts = buildArchPath(w, h, tube.inset)
        return { pts, path2d: buildPath2D(pts) }
      })
    }

    const timeSec = timestamp / 1000

    for (let ti = 0; ti < TUBES.length; ti++) {
      const tube = TUBES[ti]
      const { path2d } = cachedPaths.current[ti]
      const [cr, cg, cb] = tube.color
      const [lr, lg, lb] = tube.coreColor
      const breathe = reducedMotion.current
        ? 1
        : 0.9 + 0.1 * Math.sin(timeSec * tube.breatheSpeed)

      // Layer 1: Soft outer glow
      ctx.save()
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.lineWidth = tube.width + tube.glowRadius
      ctx.strokeStyle = `rgba(${cr},${cg},${cb}, 0.06)`
      ctx.shadowColor = `rgba(${cr},${cg},${cb}, 0.2)`
      ctx.shadowBlur = 24
      ctx.globalAlpha = tube.baseAlpha * breathe
      ctx.stroke(path2d)
      ctx.restore()

      // Layer 2: Main tube body
      ctx.save()
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.lineWidth = tube.width
      ctx.strokeStyle = `rgba(${cr},${cg},${cb}, 0.5)`
      ctx.shadowColor = `rgba(${cr},${cg},${cb}, 0.25)`
      ctx.shadowBlur = 8
      ctx.globalAlpha = tube.baseAlpha * breathe
      ctx.stroke(path2d)
      ctx.restore()

      // Layer 3: Bright inner core
      ctx.save()
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.lineWidth = tube.width * 0.3
      ctx.strokeStyle = `rgba(${lr},${lg},${lb}, 0.45)`
      ctx.shadowColor = `rgba(${lr},${lg},${lb}, 0.15)`
      ctx.shadowBlur = 3
      ctx.globalAlpha = tube.baseAlpha * breathe * 0.85
      ctx.stroke(path2d)
      ctx.restore()

      // Layer 4: Fine white filament
      ctx.save()
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.lineWidth = 0.75
      ctx.strokeStyle = "rgba(255,255,255,0.12)"
      ctx.globalAlpha = tube.baseAlpha * breathe
      ctx.stroke(path2d)
      ctx.restore()
    }

    animRef.current = requestAnimationFrame(draw)
  }, [])

  useEffect(() => {
    reducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    animRef.current = requestAnimationFrame(draw)

    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(animRef.current)
      } else {
        lastFrameTime.current = 0
        animRef.current = requestAnimationFrame(draw)
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      cancelAnimationFrame(animRef.current)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [draw])

  return (
    <div
      className={`absolute inset-0 pointer-events-none z-30 ${className}`}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ mixBlendMode: "screen" }}
      />
    </div>
  )
}
