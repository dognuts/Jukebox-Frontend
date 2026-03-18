"use client"

import { useState, useEffect, useCallback } from "react"
import { Clock, Mic, Play, X, Plus, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface IntermissionSchedulerProps {
  onIntermissionStart?: () => void
  onIntermissionEnd?: () => void
}

export function IntermissionScheduler({ onIntermissionStart, onIntermissionEnd }: IntermissionSchedulerProps) {
  const [tracksUntilBreak, setTracksUntilBreak] = useState<number | null>(null)
  const [breakDuration, setBreakDuration] = useState(5) // minutes
  const [isOnBreak, setIsOnBreak] = useState(false)
  const [breakTimeLeft, setBreakTimeLeft] = useState(0)
  const [showSettings, setShowSettings] = useState(false)

  // Countdown timer during break
  useEffect(() => {
    if (!isOnBreak || breakTimeLeft <= 0) return
    const timer = setInterval(() => {
      setBreakTimeLeft((prev) => {
        if (prev <= 1) {
          setIsOnBreak(false)
          onIntermissionEnd?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isOnBreak, breakTimeLeft, onIntermissionEnd])

  const startBreak = useCallback(() => {
    setIsOnBreak(true)
    setBreakTimeLeft(breakDuration * 60)
    onIntermissionStart?.()
  }, [breakDuration, onIntermissionStart])

  const endBreakEarly = useCallback(() => {
    setIsOnBreak(false)
    setBreakTimeLeft(0)
    onIntermissionEnd?.()
  }, [onIntermissionEnd])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  if (isOnBreak) {
    return (
      <div
        className="rounded-xl p-3"
        style={{
          background: "linear-gradient(135deg, oklch(0.55 0.20 270 / 0.15), oklch(0.48 0.24 300 / 0.10))",
          border: "1px solid oklch(0.55 0.20 270 / 0.3)",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Mic className="h-4 w-4" style={{ color: "oklch(0.65 0.20 270)" }} />
              <span
                className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full animate-pulse"
                style={{ background: "oklch(0.65 0.20 270)" }}
              />
            </div>
            <span className="font-sans text-xs font-semibold" style={{ color: "oklch(0.72 0.18 270)" }}>
              INTERMISSION
            </span>
          </div>
          <span className="font-mono text-lg font-bold" style={{ color: "oklch(0.72 0.18 270)" }}>
            {formatTime(breakTimeLeft)}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground mb-2">
          Talk break in progress. Music will resume automatically.
        </p>
        <Button
          size="sm"
          onClick={endBreakEarly}
          className="w-full gap-1.5 rounded-lg text-xs"
          style={{
            background: "oklch(0.55 0.20 270 / 0.3)",
            color: "oklch(0.80 0.15 270)",
            border: "1px solid oklch(0.55 0.20 270 / 0.4)",
          }}
        >
          <Play className="h-3 w-3" />
          Resume Music
        </Button>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: "oklch(0.14 0.01 280 / 0.5)",
        border: "1px solid oklch(0.26 0.02 280 / 0.4)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-sans text-xs font-medium text-foreground">Talk Breaks</span>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {showSettings ? "Done" : "Settings"}
        </button>
      </div>

      {showSettings ? (
        <div className="space-y-3">
          {/* Break duration setting */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Break duration</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBreakDuration((d) => Math.max(1, d - 1))}
                className="h-5 w-5 flex items-center justify-center rounded bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <Minus className="h-3 w-3 text-muted-foreground" />
              </button>
              <span className="font-mono text-xs w-8 text-center">{breakDuration}m</span>
              <button
                onClick={() => setBreakDuration((d) => Math.min(15, d + 1))}
                className="h-5 w-5 flex items-center justify-center rounded bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <Plus className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Auto break setting */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Auto-break every</span>
            <div className="flex items-center gap-2">
              {tracksUntilBreak !== null && (
                <button
                  onClick={() => setTracksUntilBreak(null)}
                  className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted/30 transition-colors"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
              <select
                value={tracksUntilBreak ?? ""}
                onChange={(e) => setTracksUntilBreak(e.target.value ? Number(e.target.value) : null)}
                className="h-6 rounded bg-muted/30 border-none text-xs px-2"
              >
                <option value="">Off</option>
                <option value="5">5 tracks</option>
                <option value="10">10 tracks</option>
                <option value="15">15 tracks</option>
              </select>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={startBreak}
            className="flex-1 gap-1.5 rounded-lg text-xs"
            style={{
              background: "oklch(0.55 0.20 270 / 0.2)",
              color: "oklch(0.72 0.15 270)",
              border: "1px solid oklch(0.55 0.20 270 / 0.3)",
            }}
          >
            <Mic className="h-3 w-3" />
            Start {breakDuration}m Break
          </Button>
        </div>
      )}

      {tracksUntilBreak !== null && !showSettings && (
        <p className="mt-2 text-[9px] text-muted-foreground text-center">
          Auto-break in {tracksUntilBreak} tracks
        </p>
      )}
    </div>
  )
}
