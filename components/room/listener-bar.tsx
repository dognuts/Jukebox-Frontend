"use client"

import { useState, useEffect, useRef } from "react"
import { Headphones, Radio } from "lucide-react"
import { formatListenerCount } from "@/lib/mock-data"

interface ListenerBarProps {
  initialCount: number
  isLive: boolean
  djName: string
  isDJ: boolean
  minimal?: boolean
}

export function ListenerBar({
  initialCount,
  isLive,
  djName,
  isDJ,
  minimal = false,
}: ListenerBarProps) {
  const [count, setCount] = useState(initialCount)
  const [bouncing, setBouncing] = useState(false)

  useEffect(() => {
    setCount(initialCount)
  }, [initialCount])

  // Minimal mode: just show DJ label if DJ
  if (minimal) {
    return isDJ ? (
      <span className="font-sans text-[10px] font-medium" style={{ color: "oklch(0.82 0.18 80)" }}>
        DJ View
      </span>
    ) : null
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/30 px-4 py-3 glass-panel">
      <div className="flex items-center gap-4">
        {/* ON AIR indicator */}
        {isLive && (
          <div
            className="flex items-center gap-1 rounded px-2 py-0.5"
            style={{
              background: "oklch(0.08 0.01 280 / 0.9)",
              border: "1.5px solid oklch(0.50 0.24 30)",
              boxShadow: "0 0 6px oklch(0.50 0.24 30 / 0.6), 0 0 12px oklch(0.50 0.24 30 / 0.3), inset 0 0 8px oklch(0.50 0.24 30 / 0.15)",
            }}
          >
            <span
              className="font-sans text-[10px] font-bold tracking-wide"
              style={{
                color: "oklch(0.58 0.26 30)",
                textShadow: "0 0 4px oklch(0.58 0.26 30 / 0.8), 0 0 8px oklch(0.58 0.26 30 / 0.4)",
              }}
            >
              ON AIR
            </span>
          </div>
        )}

        {/* Listener count */}
        <div className="flex items-center gap-1.5">
          <Headphones className="h-4 w-4 text-muted-foreground" />
          <span
            className={`font-mono text-sm font-semibold text-foreground ${bouncing ? "animate-count-bounce" : ""}`}
          >
            {formatListenerCount(count)}
          </span>
          <span className="font-sans text-xs text-muted-foreground">listening</span>
        </div>

        {/* DJ name */}
        <div className="flex items-center gap-1.5">
          <Radio className="h-3.5 w-3.5 text-primary" />
          <span className="font-sans text-xs text-primary font-medium">{djName}</span>
        </div>
      </div>
    </div>
  )
}
