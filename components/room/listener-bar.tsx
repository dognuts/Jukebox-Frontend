"use client"

import { useState, useEffect, useRef } from "react"
import { Headphones, Radio, Eye, EyeOff } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatListenerCount } from "@/lib/mock-data"

interface ListenerBarProps {
  initialCount: number
  isLive: boolean
  djName: string
  isDJ: boolean
  onToggleDJ: () => void
  minimal?: boolean
}

export function ListenerBar({
  initialCount,
  isLive,
  djName,
  isDJ,
  onToggleDJ,
  minimal = false,
}: ListenerBarProps) {
  const [count, setCount] = useState(initialCount)
  const [bouncing, setBouncing] = useState(false)
  const prevCount = useRef(initialCount)

  // Fluctuate listener count
  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => {
        const delta = Math.floor(Math.random() * 5) - 2
        const next = Math.max(1, prev + delta)
        if (next !== prev) {
          setBouncing(true)
          setTimeout(() => setBouncing(false), 300)
        }
        prevCount.current = next
        return next
      })
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  // Minimal mode: just the DJ view toggle
  if (minimal) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleDJ}
        className="gap-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30"
      >
        {isDJ ? (
          <>
            <EyeOff className="h-3.5 w-3.5" />
            Listener View
          </>
        ) : (
          <>
            <Eye className="h-3.5 w-3.5" />
            DJ View
          </>
        )}
      </Button>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/30 px-4 py-3 glass-panel">
      <div className="flex items-center gap-4">
        {/* ON AIR indicator - classic red neon style */}
        {isLive && (
          <div 
            className="flex items-center gap-1 rounded px-2 py-0.5" 
            style={{ 
              background: "oklch(0.08 0.01 280 / 0.9)", 
              border: "1.5px solid oklch(0.50 0.24 30)",
              boxShadow: "0 0 6px oklch(0.50 0.24 30 / 0.6), 0 0 12px oklch(0.50 0.24 30 / 0.3), inset 0 0 8px oklch(0.50 0.24 30 / 0.15)"
            }}
          >
            <span className="font-sans text-[10px] font-bold tracking-wide" style={{ color: "oklch(0.58 0.26 30)", textShadow: "0 0 4px oklch(0.58 0.26 30 / 0.8), 0 0 8px oklch(0.58 0.26 30 / 0.4)" }}>
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
          <span className="font-sans text-xs text-muted-foreground">
            listening
          </span>
        </div>

        {/* DJ name */}
        <div className="flex items-center gap-1.5">
          <Radio className="h-3.5 w-3.5 text-primary" />
          <span className="font-sans text-xs text-primary font-medium">
            {djName}
          </span>
        </div>
      </div>

      {/* DJ mode toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleDJ}
        className="gap-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30"
      >
        {isDJ ? (
          <>
            <EyeOff className="h-3.5 w-3.5" />
            Listener View
          </>
        ) : (
          <>
            <Eye className="h-3.5 w-3.5" />
            DJ View
          </>
        )}
      </Button>
    </div>
  )
}
