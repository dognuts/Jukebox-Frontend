"use client"

import { useState, useEffect, useMemo } from "react"
import { Flame, TrendingUp, Zap } from "lucide-react"

interface HypeMeterProps {
  recentTips: number // neon tips in last 60s
  recentChats: number // chat messages in last 60s
  recentReactions: number // reactions in last 60s
}

export function HypeMeter({ recentTips, recentChats, recentReactions }: HypeMeterProps) {
  // Calculate hype score (0-100)
  const hypeScore = useMemo(() => {
    // Weighted formula: tips are worth more
    const tipWeight = recentTips * 2
    const chatWeight = recentChats * 0.5
    const reactionWeight = recentReactions * 1
    const raw = tipWeight + chatWeight + reactionWeight
    // Normalize to 0-100 (assuming 50 activity = 100% hype)
    return Math.min(100, Math.round((raw / 50) * 100))
  }, [recentTips, recentChats, recentReactions])

  // Determine hype level for color/label
  const hypeLevel = useMemo(() => {
    if (hypeScore >= 80) return { label: "ON FIRE", color: "oklch(0.65 0.26 30)", bgColor: "oklch(0.65 0.26 30 / 0.15)" }
    if (hypeScore >= 50) return { label: "HYPED", color: "oklch(0.82 0.18 80)", bgColor: "oklch(0.82 0.18 80 / 0.12)" }
    if (hypeScore >= 25) return { label: "WARMING UP", color: "oklch(0.72 0.15 200)", bgColor: "oklch(0.72 0.15 200 / 0.10)" }
    return { label: "CHILL", color: "oklch(0.55 0.05 280)", bgColor: "oklch(0.55 0.05 280 / 0.08)" }
  }, [hypeScore])

  // Animated bar fill
  const [displayScore, setDisplayScore] = useState(0)
  useEffect(() => {
    const timer = setTimeout(() => setDisplayScore(hypeScore), 50)
    return () => clearTimeout(timer)
  }, [hypeScore])

  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: hypeLevel.bgColor,
        border: `1px solid ${hypeLevel.color}40`,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {hypeScore >= 80 ? (
            <Flame className="h-3.5 w-3.5 animate-pulse" style={{ color: hypeLevel.color }} />
          ) : hypeScore >= 50 ? (
            <TrendingUp className="h-3.5 w-3.5" style={{ color: hypeLevel.color }} />
          ) : (
            <Zap className="h-3.5 w-3.5" style={{ color: hypeLevel.color }} />
          )}
          <span
            className="font-sans text-[10px] font-bold tracking-wider"
            style={{ color: hypeLevel.color }}
          >
            {hypeLevel.label}
          </span>
        </div>
        <span
          className="font-mono text-xs font-bold"
          style={{ color: hypeLevel.color }}
        >
          {hypeScore}%
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="h-1.5 w-full rounded-full overflow-hidden"
        style={{ background: "oklch(0.15 0.01 280)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${displayScore}%`,
            background: `linear-gradient(90deg, ${hypeLevel.color}80, ${hypeLevel.color})`,
            boxShadow: hypeScore >= 50 ? `0 0 8px ${hypeLevel.color}60` : "none",
          }}
        />
      </div>

      {/* Activity breakdown */}
      <div className="flex items-center justify-between mt-2">
        <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
          <Zap className="h-2.5 w-2.5" style={{ color: "oklch(0.72 0.18 195)" }} />
          <span className="font-mono font-bold" style={{ color: "oklch(0.72 0.18 195)" }}>{recentTips}</span> neon
        </span>
        <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
          <span className="font-mono font-bold">{recentChats}</span> chats
        </span>
        <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
          <span className="font-mono font-bold">{recentReactions}</span> reactions
        </span>
        <span className="text-[9px] text-muted-foreground/50">/ 60s</span>
      </div>
    </div>
  )
}

// Hook to track activity over a rolling window
export function useHypeTracking() {
  const [tips, setTips] = useState<number[]>([])
  const [chats, setChats] = useState<number[]>([])
  const [reactions, setReactions] = useState<number[]>([])

  // Clean up old entries every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const cutoff = now - 60000 // 60 second window
      setTips((prev) => prev.filter((t) => t > cutoff))
      setChats((prev) => prev.filter((t) => t > cutoff))
      setReactions((prev) => prev.filter((t) => t > cutoff))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const recordTip = () => setTips((prev) => [...prev, Date.now()])
  const recordChat = () => setChats((prev) => [...prev, Date.now()])
  const recordReaction = () => setReactions((prev) => [...prev, Date.now()])

  return {
    recentTips: tips.length,
    recentChats: chats.length,
    recentReactions: reactions.length,
    recordTip,
    recordChat,
    recordReaction,
  }
}
