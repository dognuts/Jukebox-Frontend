"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Zap } from "lucide-react"
import type { NeonTubeState } from "@/hooks/use-room-websocket"

/* ─── Level palette ──────────────────────────────────────────────── */

const LEVELS: Record<
  number,
  {
    css: string
    bright: string
    glowRgb: string
    canvasRgb: [number, number, number]
    label: string
  }
> = {
  1: { css: "oklch(0.72 0.18 195)", bright: "oklch(0.88 0.10 195)", glowRgb: "0,186,217", canvasRgb: [0, 186, 217], label: "Cyan" },
  2: { css: "oklch(0.65 0.24 330)", bright: "oklch(0.80 0.16 330)", glowRgb: "210,70,190", canvasRgb: [210, 70, 190], label: "Magenta" },
  3: { css: "oklch(0.82 0.18 80)", bright: "oklch(0.93 0.10 80)", glowRgb: "232,154,60", canvasRgb: [232, 154, 60], label: "Amber" },
  4: { css: "oklch(0.75 0.20 300)", bright: "oklch(0.88 0.14 300)", glowRgb: "180,100,255", canvasRgb: [180, 100, 255], label: "Rainbow" },
  5: { css: "oklch(0.95 0.03 80)", bright: "oklch(0.99 0.01 0)", glowRgb: "255,245,220", canvasRgb: [255, 245, 220], label: "Supernova" },
}

/* ─── Dimensions ─────────────────────────────────────────────────── */

const TUBE_W = 44
const TUBE_H = 148
const CAP_H = 11
const WALL = 3
const INNER_W = TUBE_W - WALL * 2
const INNER_H = TUBE_H - WALL * 2

/* ─── Bubble type ────────────────────────────────────────────────── */

interface Bubble {
  x: number       // 0‒1 horizontal position within liquid
  y: number       // 0 = bottom of liquid, 1 = surface
  r: number       // radius in px
  speed: number   // rise speed per frame (fraction of height)
  phase: number   // wobble phase
  amp: number     // wobble amplitude
  opacity: number
}

const MAX_BUBBLES = 8
const SPAWN_CHANCE = 0.06 // per frame

/* ─── Component ──────────────────────────────────────────────────── */

interface NeonTubeProps {
  tube: NeonTubeState | null
  powerUp: { newLevel: number; color: string } | null
  onSendNeon?: () => void
}

export function NeonTube({ tube, powerUp, onSendNeon }: NeonTubeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bubblesRef = useRef<Bubble[]>([])
  const animRef = useRef(0)
  const [showPowerUp, setShowPowerUp] = useState(false)
  const [prevFill, setPrevFill] = useState(0)
  const [isSplashing, setIsSplashing] = useState(false)

  const level = tube?.level ?? 1
  const fillAmount = tube?.fillAmount ?? 0
  const fillTarget = tube?.fillTarget ?? 100
  const fillPct = Math.min(100, fillTarget > 0 ? (fillAmount / fillTarget) * 100 : 0)
  const totalNeon = tube?.totalNeon ?? 0
  const prestigeCount = tube?.prestigeCount ?? 0
  const lv = LEVELS[level] ?? LEVELS[1]
  const isRainbow = level === 4
  const isSupernova = level === 5

  // Prestige tier determines cap styling
  const prestigeTier = prestigeCount >= 10 ? 3 : prestigeCount >= 5 ? 2 : prestigeCount >= 1 ? 1 : 0
  const capStyle = prestigeTier >= 3
    ? { bg: "linear-gradient(180deg, oklch(0.55 0.02 280), oklch(0.75 0.03 0), oklch(0.55 0.02 280))", border: "0.5px solid oklch(0.80 0.04 0 / 0.6)" }
    : prestigeTier >= 2
    ? { bg: "linear-gradient(180deg, oklch(0.50 0.10 80), oklch(0.35 0.08 80), oklch(0.50 0.10 80))", border: "0.5px solid oklch(0.70 0.15 80 / 0.6)", anim: "neon-tube-cap-shimmer 3s linear infinite" }
    : prestigeTier >= 1
    ? { bg: "linear-gradient(180deg, oklch(0.45 0.08 80), oklch(0.28 0.04 80), oklch(0.40 0.06 80))", border: "0.5px solid oklch(0.60 0.12 80 / 0.5)" }
    : { bg: "linear-gradient(180deg, oklch(0.38 0.01 280), oklch(0.22 0.01 280) 40%, oklch(0.30 0.01 280) 80%, oklch(0.20 0.01 280))", border: "0.5px solid oklch(0.45 0.01 280 / 0.5)" }

  // Detect fill increase → splash effect
  useEffect(() => {
    if (fillAmount > prevFill && prevFill > 0) {
      setIsSplashing(true)
      const t = setTimeout(() => setIsSplashing(false), 800)
      return () => clearTimeout(t)
    }
    setPrevFill(fillAmount)
  }, [fillAmount]) // eslint-disable-line react-hooks/exhaustive-deps

  // Power-up state
  useEffect(() => {
    if (powerUp) {
      setShowPowerUp(true)
      const t = setTimeout(() => setShowPowerUp(false), 3000)
      return () => clearTimeout(t)
    }
  }, [powerUp])

  /* ─── Canvas bubble animation ─────────────────────────────────── */

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d", { alpha: true })
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = INNER_W * dpr
    canvas.height = INNER_H * dpr
    canvas.style.width = `${INNER_W}px`
    canvas.style.height = `${INNER_H}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // Check reduced motion
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReduced) return

    let lastFrame = 0

    function frame(time: number) {
      // Cap at ~30fps
      if (time - lastFrame < 33) {
        animRef.current = requestAnimationFrame(frame)
        return
      }
      lastFrame = time

      ctx!.clearRect(0, 0, INNER_W, INNER_H)

      const currentFillPct = fillTarget > 0 ? (fillAmount / fillTarget) : 0
      const liquidH = INNER_H * Math.min(1, currentFillPct)
      if (liquidH < 2) {
        animRef.current = requestAnimationFrame(frame)
        return
      }

      const [r, g, b] = lv.canvasRgb
      const timeSec = time / 1000

      // Rainbow hue shift for level 4
      let hueShift = 0
      if (isRainbow) hueShift = (timeSec * 60) % 360
      if (isSupernova) hueShift = (timeSec * 120) % 360

      // Maybe spawn a bubble
      if (bubblesRef.current.length < MAX_BUBBLES && Math.random() < SPAWN_CHANCE) {
        bubblesRef.current.push({
          x: 0.15 + Math.random() * 0.7,
          y: 0,
          r: 0.8 + Math.random() * 1.8,
          speed: 0.003 + Math.random() * 0.006,
          phase: Math.random() * Math.PI * 2,
          amp: 0.02 + Math.random() * 0.04,
          opacity: 0.25 + Math.random() * 0.4,
        })
      }

      // Draw + update bubbles
      bubblesRef.current = bubblesRef.current.filter((bub) => {
        bub.y += bub.speed
        if (bub.y > 1) return false

        const wobble = Math.sin(timeSec * 2 + bub.phase) * bub.amp
        const px = (bub.x + wobble) * INNER_W
        const py = INNER_H - bub.y * liquidH

        // Fade out near surface
        const surfaceFade = bub.y > 0.85 ? (1 - bub.y) / 0.15 : 1
        const alpha = bub.opacity * surfaceFade

        ctx!.save()
        if (isRainbow || isSupernova) {
          ctx!.filter = `hue-rotate(${hueShift}deg)`
        }
        // Bubble glow
        const grad = ctx!.createRadialGradient(px, py, 0, px, py, bub.r * 2.5)
        grad.addColorStop(0, `rgba(${r},${g},${b},${alpha * 0.6})`)
        grad.addColorStop(0.4, `rgba(${r},${g},${b},${alpha * 0.3})`)
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
        ctx!.fillStyle = grad
        ctx!.beginPath()
        ctx!.arc(px, py, bub.r * 2.5, 0, Math.PI * 2)
        ctx!.fill()

        // Bubble core
        ctx!.globalAlpha = alpha
        ctx!.fillStyle = `rgba(${Math.min(255, r + 80)},${Math.min(255, g + 80)},${Math.min(255, b + 80)},1)`
        ctx!.beginPath()
        ctx!.arc(px, py, bub.r, 0, Math.PI * 2)
        ctx!.fill()

        // Tiny highlight
        ctx!.globalAlpha = alpha * 0.8
        ctx!.fillStyle = "rgba(255,255,255,0.7)"
        ctx!.beginPath()
        ctx!.arc(px - bub.r * 0.3, py - bub.r * 0.3, bub.r * 0.35, 0, Math.PI * 2)
        ctx!.fill()
        ctx!.restore()

        return true
      })

      // Surface shimmer — faint sparkle at the liquid surface
      if (currentFillPct > 0.05 && currentFillPct < 1) {
        const surfaceY = INNER_H - liquidH
        const shimmerX = (Math.sin(timeSec * 1.5) * 0.3 + 0.5) * INNER_W
        const shimmerAlpha = 0.15 + Math.sin(timeSec * 3) * 0.1
        ctx!.save()
        if (isRainbow || isSupernova) ctx!.filter = `hue-rotate(${hueShift}deg)`
        const sg = ctx!.createRadialGradient(shimmerX, surfaceY, 0, shimmerX, surfaceY, 8)
        sg.addColorStop(0, `rgba(${Math.min(255, r + 100)},${Math.min(255, g + 100)},${Math.min(255, b + 100)},${shimmerAlpha})`)
        sg.addColorStop(1, `rgba(${r},${g},${b},0)`)
        ctx!.fillStyle = sg
        ctx!.beginPath()
        ctx!.ellipse(shimmerX, surfaceY, 10, 4, 0, 0, Math.PI * 2)
        ctx!.fill()
        ctx!.restore()
      }

      animRef.current = requestAnimationFrame(frame)
    }

    animRef.current = requestAnimationFrame(frame)

    // Pause when hidden
    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(animRef.current)
      } else {
        lastFrame = 0
        animRef.current = requestAnimationFrame(frame)
      }
    }
    document.addEventListener("visibilitychange", onVis)

    return () => {
      cancelAnimationFrame(animRef.current)
      document.removeEventListener("visibilitychange", onVis)
      bubblesRef.current = []
    }
  }, [fillAmount, fillTarget, level]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── Derived styles ──────────────────────────────────────────── */

  const glowIntensity = 0.15 + (fillPct / 100) * 0.55
  const glowSpread = 8 + (fillPct / 100) * 22

  // Liquid background
  const liquidBg = isSupernova
    ? `linear-gradient(0deg, oklch(0.88 0.04 80), oklch(0.97 0.01 0) 60%, oklch(0.99 0.005 0))`
    : isRainbow
    ? `linear-gradient(0deg, oklch(0.72 0.18 195), oklch(0.65 0.24 330) 33%, oklch(0.82 0.18 80) 66%, oklch(0.72 0.18 195))`
    : `linear-gradient(0deg, ${lv.css}, ${lv.bright})`

  const liquidBgSize = isRainbow ? "100% 300%" : isSupernova ? "100% 200%" : "100% 100%"
  const liquidAnim = isRainbow
    ? "neon-tube-liquid-cycle 4s linear infinite"
    : isSupernova
    ? "neon-tube-liquid-cycle 2s linear infinite"
    : "none"

  /* ─── Render ──────────────────────────────────────────────────── */

  return (
    <div
      style={{
        paddingInline: "var(--space-lg)",
        paddingBlock: "var(--space-md)",
      }}
    >
      <div
        className="relative overflow-hidden"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-lg)",
          paddingInline: "var(--space-lg)",
          paddingBlock: "var(--space-md)",
          background: "rgba(255,255,255,0.015)",
          border: "0.5px solid rgba(255,255,255,0.06)",
          borderRadius: "16px",
        }}
      >
        {/* Ambient glow behind the tube — bleeds into the card */}
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            left: "calc(var(--space-lg) + 10px)",
            top: "50%",
            transform: "translateY(-50%)",
            width: `${TUBE_W + 40}px`,
            height: `${TUBE_H + 40}px`,
            borderRadius: "50%",
            background: `radial-gradient(ellipse, rgba(${lv.glowRgb},${glowIntensity}) 0%, transparent 70%)`,
            filter: `blur(${glowSpread}px)`,
            animation: "neon-tube-breathe 4s ease-in-out infinite",
            transition: "all 1.2s ease",
          }}
        />

        {/* ─── Tube assembly ─────────────────────────────────────── */}
        <div
          className="relative shrink-0 flex flex-col items-center"
          style={{
            animation: showPowerUp ? "neon-tube-powerup-shake 0.5s ease-out" : undefined,
          }}
          role="button"
          tabIndex={0}
          onClick={onSendNeon}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSendNeon?.() }}
          aria-label={`Neon tube level ${level} — ${fillAmount} of ${fillTarget} neon. Click to send neon.`}
          title="Send Neon"
        >
          {/* Top cap */}
          <div
            style={{
              width: `${TUBE_W + 6}px`,
              height: `${CAP_H}px`,
              borderRadius: "4px 4px 2px 2px",
              background: capStyle.bg,
              border: capStyle.border,
              animation: capStyle.anim,
              backgroundSize: capStyle.anim ? "200% 100%" : undefined,
              position: "relative",
              zIndex: 3,
            }}
          >
            {/* Cap screws */}
            <div style={{ position: "absolute", top: "50%", left: "6px", transform: "translateY(-50%)", width: "3px", height: "3px", borderRadius: "50%", background: "oklch(0.50 0.01 280)", boxShadow: "inset 0 0.5px 1px oklch(0 0 0 / 0.5)" }} />
            <div style={{ position: "absolute", top: "50%", right: "6px", transform: "translateY(-50%)", width: "3px", height: "3px", borderRadius: "50%", background: "oklch(0.50 0.01 280)", boxShadow: "inset 0 0.5px 1px oklch(0 0 0 / 0.5)" }} />
          </div>

          {/* Glass tube body */}
          <div
            className="relative overflow-hidden"
            style={{
              width: `${TUBE_W}px`,
              height: `${TUBE_H}px`,
              borderRadius: "6px",
              background: "linear-gradient(135deg, oklch(0.07 0.01 280), oklch(0.10 0.015 280) 50%, oklch(0.06 0.01 280))",
              border: "1.5px solid oklch(0.28 0.02 280 / 0.5)",
              boxShadow: `
                inset 0 0 12px oklch(0 0 0 / 0.7),
                inset 0 2px 3px oklch(1 0 0 / 0.02),
                0 0 ${glowSpread}px rgba(${lv.glowRgb},${glowIntensity * 0.6}),
                0 0 ${glowSpread * 2}px rgba(${lv.glowRgb},${glowIntensity * 0.3})
              `,
              transition: "box-shadow 1.2s ease",
              cursor: onSendNeon ? "pointer" : undefined,
            }}
          >
            {/* Liquid fill — rises from bottom */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: WALL,
                right: WALL,
                height: `${fillPct}%`,
                borderRadius: "0 0 3px 3px",
                backgroundImage: liquidBg,
                backgroundSize: liquidBgSize,
                animation: liquidAnim,
                boxShadow: `inset 0 0 14px rgba(${lv.glowRgb},0.3)`,
                transition: "height 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            >
              {/* Liquid surface — wobbling meniscus */}
              {fillPct > 0 && fillPct < 100 && (
                <div
                  style={{
                    position: "absolute",
                    top: "-3px",
                    left: "-1px",
                    right: "-1px",
                    height: "7px",
                    borderRadius: "50%",
                    background: `radial-gradient(ellipse at 50% 80%, rgba(${lv.glowRgb},0.5), rgba(${lv.glowRgb},0.15) 60%, transparent)`,
                    animation: "neon-tube-surface-wobble 3s ease-in-out infinite",
                  }}
                />
              )}

              {/* Splash burst when neon arrives */}
              {isSplashing && (
                <div
                  style={{
                    position: "absolute",
                    top: "-8px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "20px",
                    height: "16px",
                    borderRadius: "50%",
                    background: `radial-gradient(ellipse, rgba(${lv.glowRgb},0.7), transparent 70%)`,
                    animation: "neon-tube-splash 0.8s ease-out forwards",
                  }}
                />
              )}
            </div>

            {/* Level tick marks */}
            {[25, 50, 75].map((pct) => (
              <div
                key={pct}
                style={{
                  position: "absolute",
                  bottom: `${pct}%`,
                  left: 0,
                  width: "5px",
                  height: "1px",
                  background: "oklch(0.35 0.02 280 / 0.4)",
                }}
              />
            ))}

            {/* Glass highlight reflection — left side */}
            <div
              aria-hidden
              className="pointer-events-none"
              style={{
                position: "absolute",
                top: "4px",
                left: "4px",
                width: "8px",
                bottom: "4px",
                borderRadius: "4px",
                background: "linear-gradient(180deg, oklch(1 0 0 / 0.08), oklch(1 0 0 / 0.04) 30%, oklch(1 0 0 / 0.01) 60%, oklch(1 0 0 / 0.06))",
                zIndex: 2,
              }}
            />

            {/* Secondary edge highlight — right side, fainter */}
            <div
              aria-hidden
              className="pointer-events-none"
              style={{
                position: "absolute",
                top: "10px",
                right: "5px",
                width: "3px",
                bottom: "10px",
                borderRadius: "2px",
                background: "linear-gradient(180deg, transparent, oklch(1 0 0 / 0.03), transparent)",
                zIndex: 2,
              }}
            />

            {/* Bubble canvas — overlays the inner tube area */}
            <canvas
              ref={canvasRef}
              aria-hidden
              className="pointer-events-none"
              style={{
                position: "absolute",
                top: WALL,
                left: WALL,
                width: INNER_W,
                height: INNER_H,
                zIndex: 1,
              }}
            />

            {/* Power-up white flash overlay */}
            {showPowerUp && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "white",
                  borderRadius: "4px",
                  animation: "neon-tube-flash 0.6s ease-out forwards",
                  zIndex: 5,
                }}
              />
            )}
          </div>

          {/* Bottom cap */}
          <div
            style={{
              width: `${TUBE_W + 6}px`,
              height: `${CAP_H}px`,
              borderRadius: "2px 2px 4px 4px",
              background: capStyle.bg,
              border: capStyle.border,
              animation: capStyle.anim,
              backgroundSize: capStyle.anim ? "200% 100%" : undefined,
              position: "relative",
              zIndex: 3,
            }}
          >
            <div style={{ position: "absolute", top: "50%", left: "6px", transform: "translateY(-50%)", width: "3px", height: "3px", borderRadius: "50%", background: "oklch(0.50 0.01 280)", boxShadow: "inset 0 0.5px 1px oklch(0 0 0 / 0.5)" }} />
            <div style={{ position: "absolute", top: "50%", right: "6px", transform: "translateY(-50%)", width: "3px", height: "3px", borderRadius: "50%", background: "oklch(0.50 0.01 280)", boxShadow: "inset 0 0.5px 1px oklch(0 0 0 / 0.5)" }} />
          </div>

          {/* Power-up expanding ring */}
          {showPowerUp && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                border: `2px solid ${lv.css}`,
                transform: "translate(-50%, -50%)",
                animation: "neon-tube-ring-burst 1s ease-out forwards",
                zIndex: 10,
                pointerEvents: "none",
              }}
            />
          )}
        </div>

        {/* ─── Info panel ──────────────────────────────────────────── */}
        <div className="relative z-[1] flex flex-1 flex-col" style={{ gap: "var(--space-sm)" }}>
          {/* Level header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center" style={{ gap: "var(--space-2xs)" }}>
              <Zap
                className="h-3.5 w-3.5"
                style={{
                  color: lv.css,
                  filter: `drop-shadow(0 0 4px rgba(${lv.glowRgb},0.5))`,
                }}
              />
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: lv.css }}
              >
                Lv.{level}
              </span>
              <span
                className="text-xs font-semibold"
                style={{ color: "rgba(232,230,234,0.5)" }}
              >
                {lv.label}
              </span>
            </div>

            {/* Power-up badge */}
            {showPowerUp && (
              <span
                className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{
                  background: `rgba(${lv.glowRgb},0.15)`,
                  border: `1px solid rgba(${lv.glowRgb},0.4)`,
                  color: lv.css,
                  animation: "neon-tube-badge-pulse 0.5s ease-out",
                  boxShadow: `0 0 12px rgba(${lv.glowRgb},0.3)`,
                }}
              >
                {isSupernova ? "Supernova!" : "Level up!"}
              </span>
            )}
          </div>

          {/* Prestige stars */}
          {prestigeCount > 0 && (
            <div className="flex items-center" style={{ gap: "3px" }}>
              {Array.from({ length: Math.min(prestigeCount, 10) }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: "10px",
                    lineHeight: 1,
                    filter: prestigeTier >= 3
                      ? "drop-shadow(0 0 3px oklch(0.90 0.04 0 / 0.8))"
                      : "drop-shadow(0 0 2px rgba(232,154,60,0.5))",
                    animation: `neon-tube-star-pop 0.4s ease-out ${i * 0.06}s both`,
                  }}
                >
                  {prestigeTier >= 3 ? "💎" : "⭐"}
                </span>
              ))}
              {prestigeCount > 10 && (
                <span
                  className="tabular-nums font-bold"
                  style={{ fontSize: "var(--fs-meta)", color: "rgba(232,154,60,0.6)" }}
                >
                  +{prestigeCount - 10}
                </span>
              )}
            </div>
          )}

          {/* Room energy label */}
          <div
            className="uppercase tracking-[0.14em]"
            style={{
              fontSize: "var(--fs-meta)",
              color: "rgba(232,230,234,0.3)",
            }}
          >
            Room energy
          </div>

          {/* Fill progress bar */}
          <div>
            <div
              className="relative overflow-hidden rounded-full"
              style={{
                height: "6px",
                background: "oklch(0.14 0.02 280)",
                border: "0.5px solid oklch(0.25 0.02 280 / 0.5)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  right: `${100 - fillPct}%`,
                  borderRadius: "inherit",
                  backgroundImage: isRainbow
                    ? "linear-gradient(90deg, oklch(0.72 0.18 195), oklch(0.65 0.24 330), oklch(0.82 0.18 80), oklch(0.72 0.18 195))"
                    : isSupernova
                    ? "linear-gradient(90deg, oklch(0.90 0.04 80), oklch(0.98 0.01 0), oklch(0.90 0.04 270))"
                    : `linear-gradient(90deg, ${lv.css}, ${lv.bright})`,
                  backgroundSize: isRainbow || isSupernova ? "200% 100%" : "100% 100%",
                  animation: isRainbow
                    ? "rainbow-shift 3s linear infinite"
                    : isSupernova
                    ? "rainbow-shift 1.5s linear infinite"
                    : undefined,
                  boxShadow: `0 0 8px rgba(${lv.glowRgb},0.4)`,
                  transition: "right 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              />
              {/* Bar highlight */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0"
                style={{
                  height: "2px",
                  borderRadius: "inherit",
                  background: "linear-gradient(90deg, transparent, oklch(1 0 0 / 0.08), transparent)",
                }}
              />
            </div>

            {/* Fill counter */}
            <div
              className="mt-1 flex items-baseline justify-between"
              style={{ fontSize: "var(--fs-meta)" }}
            >
              <span className="tabular-nums font-semibold" style={{ color: "rgba(232,230,234,0.55)" }}>
                {fillAmount}
                <span style={{ color: "rgba(232,230,234,0.25)" }}> / {fillTarget}</span>
              </span>
              <span
                className="tabular-nums"
                style={{ color: "rgba(232,230,234,0.25)" }}
              >
                {totalNeon > 0 && `${totalNeon.toLocaleString()} total`}
              </span>
            </div>
          </div>

          {/* Send Neon CTA */}
          {onSendNeon && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSendNeon()
              }}
              className="mt-1 flex items-center justify-center gap-1.5 rounded-full font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                paddingBlock: "var(--space-sm)",
                fontSize: "var(--fs-small)",
                background: `rgba(${lv.glowRgb},0.1)`,
                border: `0.5px solid rgba(${lv.glowRgb},0.3)`,
                color: lv.css,
                boxShadow: `0 0 12px rgba(${lv.glowRgb},0.08)`,
              }}
            >
              <Zap className="h-3.5 w-3.5" />
              Send Neon
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Legacy export for backwards compatibility ─────────────────── */

export { NeonTube as NeonTubeViz }
