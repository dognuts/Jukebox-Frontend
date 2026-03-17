"use client"

import { useEffect, useState, useRef } from "react"
import { Zap } from "lucide-react"
import type { NeonTubeState } from "@/hooks/use-room-websocket"

const TUBE_COLORS: Record<number, { primary: string; glow: string; label: string }> = {
  1: { primary: "oklch(0.72 0.18 195)", glow: "oklch(0.72 0.18 195 / 0.5)", label: "Cyan" },
  2: { primary: "oklch(0.65 0.24 330)", glow: "oklch(0.65 0.24 330 / 0.5)", label: "Magenta" },
  3: { primary: "oklch(0.82 0.18 80)", glow: "oklch(0.82 0.18 80 / 0.5)", label: "Amber" },
  4: { primary: "oklch(0.90 0.05 0)", glow: "oklch(0.90 0.05 0 / 0.6)", label: "Rainbow" },
}

interface NeonTubeProps {
  tube: NeonTubeState | null
  powerUp: { newLevel: number; color: string } | null
}

export function NeonTubeViz({ tube, powerUp }: NeonTubeProps) {
  const [showPowerUp, setShowPowerUp] = useState(false)
  const prevFill = useRef(0)

  useEffect(() => {
    if (powerUp) {
      setShowPowerUp(true)
      const t = setTimeout(() => setShowPowerUp(false), 3500)
      return () => clearTimeout(t)
    }
  }, [powerUp])

  const level = tube?.level ?? 1
  const fillAmount = tube?.fillAmount ?? 0
  const fillTarget = tube?.fillTarget ?? 100
  const fillPct = Math.min(100, Math.round((fillAmount / fillTarget) * 100))
  const colors = TUBE_COLORS[level] ?? TUBE_COLORS[1]

  // Track fill for smooth animation
  useEffect(() => {
    prevFill.current = fillPct
  }, [fillPct])

  const isRainbow = level === 4

  return (
    <div className="relative flex flex-col items-center gap-1.5">
      {/* Power-up burst overlay */}
      {showPowerUp && (
        <div className="absolute inset-0 z-50 flex items-center justify-center animate-in zoom-in-50 duration-300">
          <div
            className="flex flex-col items-center gap-1 rounded-xl px-4 py-3"
            style={{
              background: "oklch(0.10 0.02 280 / 0.9)",
              border: `2px solid ${colors.primary}`,
              boxShadow: `0 0 30px ${colors.glow}, 0 0 60px ${colors.glow}`,
              animation: "power-up-flash 0.6s ease-out",
            }}
          >
            <Zap className="h-6 w-6" style={{ color: colors.primary, filter: `drop-shadow(0 0 8px ${colors.glow})` }} />
            <span className="font-sans text-xs font-bold" style={{ color: colors.primary }}>
              POWER UP!
            </span>
            <span className="font-sans text-[10px] text-muted-foreground">
              Level {level} — {colors.label}
            </span>
          </div>
        </div>
      )}

      {/* Tube label */}
      <div className="flex items-center gap-1.5">
        <Zap className="h-3 w-3" style={{ color: colors.primary }} />
        <span className="font-sans text-[10px] font-semibold" style={{ color: colors.primary }}>
          Lv.{level} {colors.label}
        </span>
      </div>

      {/* Tube container */}
      <div
        className="relative w-full overflow-hidden rounded-full"
        style={{
          height: "10px",
          background: "oklch(0.15 0.02 280)",
          border: `1px solid oklch(0.30 0.04 280 / 0.5)`,
          boxShadow: fillPct > 0 ? `inset 0 0 8px ${colors.glow}` : "none",
        }}
      >
        {/* Fill bar */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${fillPct}%`,
            background: isRainbow
              ? "linear-gradient(90deg, oklch(0.72 0.18 195), oklch(0.65 0.24 330), oklch(0.82 0.18 80), oklch(0.72 0.18 195))"
              : colors.primary,
            boxShadow: `0 0 8px ${colors.glow}, 0 0 16px ${colors.glow}`,
            backgroundSize: isRainbow ? "200% 100%" : undefined,
            animation: isRainbow ? "rainbow-shift 3s linear infinite" : undefined,
          }}
        />
      </div>

      {/* Fill text */}
      <span className="font-mono text-[9px] text-muted-foreground">
        {fillAmount} / {fillTarget} Neon
      </span>
    </div>
  )
}
