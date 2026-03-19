"use client"

import { useEffect, useState } from "react"
import { Zap } from "lucide-react"
import type { NeonTubeState } from "@/hooks/use-room-websocket"

const TUBE_COLORS: Record<number, { primary: string; glow: string; label: string }> = {
  1: { primary: "oklch(0.72 0.18 195)", glow: "oklch(0.72 0.18 195 / 0.5)", label: "Cyan" },
  2: { primary: "oklch(0.65 0.24 330)", glow: "oklch(0.65 0.24 330 / 0.5)", label: "Magenta" },
  3: { primary: "oklch(0.82 0.18 80)", glow: "oklch(0.82 0.18 80 / 0.5)", label: "Amber" },
  4: { primary: "oklch(0.90 0.05 0)", glow: "oklch(0.90 0.05 0 / 0.6)", label: "Rainbow" },
  5: { primary: "oklch(0.97 0.01 0)", glow: "oklch(0.97 0.02 0 / 0.8)", label: "Supernova" },
}

interface NeonTubeProps {
  tube: NeonTubeState | null
  powerUp: { newLevel: number; color: string } | null
}

export function NeonTubeViz({ tube, powerUp }: NeonTubeProps) {
  const [showPowerUp, setShowPowerUp] = useState(false)

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
  const fillPct = Math.min(100, fillTarget > 0 ? Math.round((fillAmount / fillTarget) * 100) : 0)
  const colors = TUBE_COLORS[level] ?? TUBE_COLORS[1]
  const isRainbow = level === 4
  const isSupernova = level === 5

  const fillBackground = isSupernova
    ? "linear-gradient(90deg, oklch(0.92 0.02 0), oklch(0.99 0.005 0), oklch(0.92 0.02 270), oklch(0.99 0.005 0), oklch(0.92 0.02 0))"
    : isRainbow
    ? "linear-gradient(90deg, oklch(0.72 0.18 195), oklch(0.65 0.24 330), oklch(0.82 0.18 80), oklch(0.72 0.18 195))"
    : `linear-gradient(180deg, ${colors.primary}, ${colors.primary})`

  const fillBgSize = isSupernova || isRainbow ? "200% 100%" : "100% 100%"
  const fillAnimation = isSupernova ? "rainbow-shift 1.5s linear infinite" : isRainbow ? "rainbow-shift 3s linear infinite" : "none"

  return (
    <div className="relative flex flex-col items-center gap-1.5">
      {/* Power-up burst overlay */}
      {showPowerUp && (
        <div className="absolute inset-0 z-50 flex items-center justify-center animate-in zoom-in-50 duration-300">
          <div
            className="flex flex-col items-center gap-1 rounded-xl px-4 py-3"
            style={{
              backgroundColor: "oklch(0.10 0.02 280 / 0.9)",
              border: `2px solid ${colors.primary}`,
              boxShadow: `0 0 30px ${colors.glow}, 0 0 60px ${colors.glow}`,
              animation: "power-up-flash 0.6s ease-out",
            }}
          >
            <Zap className="h-6 w-6" style={{ color: colors.primary, filter: `drop-shadow(0 0 8px ${colors.glow})` }} />
            <span className="font-sans text-xs font-bold" style={{ color: colors.primary }}>
              {isSupernova ? "⚡ SUPERNOVA ⚡" : "POWER UP!"}
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
          height: "12px",
          backgroundColor: "oklch(0.14 0.02 280)",
          border: "1px solid oklch(0.28 0.03 280 / 0.6)",
          boxShadow: fillPct > 0
            ? `inset 0 0 10px ${colors.glow}, 0 0 8px oklch(0 0 0 / 0.5)`
            : "inset 0 2px 4px oklch(0 0 0 / 0.3)",
        }}
      >
        {/* Fill bar */}
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${fillPct}%`,
            backgroundImage: fillBackground,
            backgroundSize: fillBgSize,
            boxShadow: isSupernova
              ? `0 0 12px ${colors.glow}, 0 0 25px ${colors.glow}, 0 0 40px oklch(0.95 0.02 0 / 0.4), inset 0 1px 2px oklch(1 0 0 / 0.4)`
              : `0 0 10px ${colors.glow}, 0 0 20px ${colors.glow}, inset 0 1px 2px oklch(1 0 0 / 0.2)`,
            animation: fillAnimation,
            transition: "width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        />

        {/* Highlight reflection */}
        <div
          className="absolute inset-x-0 top-0 h-[3px] rounded-t-full pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(90deg, transparent, oklch(1 0 0 / 0.08), transparent)",
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
