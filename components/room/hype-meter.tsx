"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
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
            <Flame className="h-3.5 w-3.5 animate-pulse motion-reduce:animate-none" style={{ color: hypeLevel.color }} />
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

// Rolling activity window in ms.
const HYPE_WINDOW_MS = 60000

// Drop timestamps that have aged out of the window. Entries are pushed
// in order, so trimming from the front is enough.
function pruneWindow(arr: number[], cutoff: number) {
  while (arr.length > 0 && arr[0] <= cutoff) arr.shift()
}

// Hook to track activity over a rolling window.
//
// Bookkeeping lives in refs — timestamps are pushed/pruned without any
// React state — and counts are published via a single setState that
// returns the previous object when nothing changed, so React bails out.
// The old implementation called three filter()-based setStates every
// second, which re-rendered every subscriber (the whole room page) at
// 1Hz forever, even for idle listeners.
//
// `enabled` gates the pruning interval and count publishing entirely:
// only the DJ view consumes these counts, so listeners pass false and
// do zero per-second work.
export function useHypeTracking(enabled = true) {
  const tipsRef = useRef<number[]>([])
  const chatsRef = useRef<number[]>([])
  const reactionsRef = useRef<number[]>([])
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  const [counts, setCounts] = useState({ tips: 0, chats: 0, reactions: 0 })

  const publish = useCallback(() => {
    const cutoff = Date.now() - HYPE_WINDOW_MS
    pruneWindow(tipsRef.current, cutoff)
    pruneWindow(chatsRef.current, cutoff)
    pruneWindow(reactionsRef.current, cutoff)
    const tips = tipsRef.current.length
    const chats = chatsRef.current.length
    const reactions = reactionsRef.current.length
    setCounts((prev) =>
      prev.tips === tips && prev.chats === chats && prev.reactions === reactions
        ? prev
        : { tips, chats, reactions }
    )
  }, [])

  // Prune + republish once a second — but only while enabled, and the
  // bail-out above means an idle room still never re-renders.
  useEffect(() => {
    if (!enabled) return
    publish()
    const interval = setInterval(publish, 1000)
    return () => clearInterval(interval)
  }, [enabled, publish])

  const record = useCallback(
    (arr: number[]) => {
      // Prune on write too so a disabled (listener) hook can't grow
      // its arrays unboundedly over a long session.
      pruneWindow(arr, Date.now() - HYPE_WINDOW_MS)
      arr.push(Date.now())
      if (enabledRef.current) publish()
    },
    [publish]
  )

  const recordTip = useCallback(() => record(tipsRef.current), [record])
  const recordChat = useCallback(() => record(chatsRef.current), [record])
  const recordReaction = useCallback(() => record(reactionsRef.current), [record])

  return {
    recentTips: counts.tips,
    recentChats: counts.chats,
    recentReactions: counts.reactions,
    recordTip,
    recordChat,
    recordReaction,
  }
}
