"use client"

import { useState, useEffect } from "react"
import { Music, Disc } from "lucide-react"
import type { Track } from "@/lib/mock-data"

interface TrackCountdownProps {
  nextTrack: Track | null
  currentTime: number // seconds into current track
  currentDuration: number // total duration of current track
  showThreshold?: number // seconds remaining to show countdown
}

export function TrackCountdown({
  nextTrack,
  currentTime,
  currentDuration,
  showThreshold = 15,
}: TrackCountdownProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const remainingSeconds = Math.max(0, Math.ceil(currentDuration - currentTime))

  useEffect(() => {
    if (remainingSeconds <= showThreshold && remainingSeconds > 0 && nextTrack) {
      setIsVisible(true)
      setIsExiting(false)
    } else if (remainingSeconds === 0 || !nextTrack) {
      if (isVisible) {
        setIsExiting(true)
        setTimeout(() => {
          setIsVisible(false)
          setIsExiting(false)
        }, 500)
      }
    }
  }, [remainingSeconds, showThreshold, nextTrack, isVisible])

  if (!isVisible || !nextTrack) return null

  const urgency = remainingSeconds <= 5 ? "high" : remainingSeconds <= 10 ? "medium" : "low"
  
  const urgencyStyles = {
    high: {
      glow: "0 0 30px oklch(0.65 0.28 30 / 0.6), 0 0 60px oklch(0.65 0.28 30 / 0.3)",
      border: "oklch(0.65 0.28 30)",
      text: "oklch(0.65 0.28 30)",
      pulse: true,
    },
    medium: {
      glow: "0 0 20px oklch(0.82 0.18 80 / 0.5), 0 0 40px oklch(0.82 0.18 80 / 0.2)",
      border: "oklch(0.82 0.18 80)",
      text: "oklch(0.82 0.18 80)",
      pulse: true,
    },
    low: {
      glow: "0 0 15px oklch(0.72 0.18 250 / 0.4)",
      border: "oklch(0.72 0.18 250 / 0.6)",
      text: "oklch(0.72 0.18 250)",
      pulse: false,
    },
  }

  const style = urgencyStyles[urgency]

  return (
    <div
      className={`fixed bottom-24 left-1/2 z-50 -translate-x-1/2 transition-all duration-500 ${
        isExiting ? "translate-y-10 opacity-0" : "translate-y-0 opacity-100"
      }`}
    >
      <div
        className={`flex items-center gap-4 rounded-2xl px-5 py-3 backdrop-blur-xl ${
          style.pulse ? "animate-pulse" : ""
        }`}
        style={{
          background: "oklch(0.12 0.02 280 / 0.9)",
          border: `2px solid ${style.border}`,
          boxShadow: style.glow,
        }}
      >
        {/* Countdown number */}
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full font-sans text-2xl font-black"
          style={{
            background: `linear-gradient(135deg, ${style.border}, oklch(0.15 0.02 280))`,
            color: "oklch(0.95 0 0)",
            boxShadow: `inset 0 0 10px oklch(0 0 0 / 0.3)`,
          }}
        >
          {remainingSeconds}
        </div>

        {/* Next track info */}
        <div className="flex flex-col gap-0.5">
          <span className="font-sans text-[10px] font-bold uppercase tracking-wider" style={{ color: style.text }}>
            Up Next
          </span>
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-8 shrink-0 rounded overflow-hidden flex items-center justify-center"
              style={{ background: nextTrack.albumGradient }}
            >
              <Music className="h-4 w-4 text-white/60" />
            </div>
            <div className="max-w-[180px]">
              <p className="truncate font-sans text-sm font-semibold text-foreground">
                {nextTrack.title}
              </p>
              <p className="truncate font-sans text-xs text-muted-foreground">
                {nextTrack.artist}
              </p>
            </div>
          </div>
        </div>

        {/* Spinning disc animation */}
        <Disc
          className="h-6 w-6 animate-spin"
          style={{
            color: style.text,
            animationDuration: urgency === "high" ? "0.5s" : urgency === "medium" ? "1s" : "2s",
          }}
        />
      </div>
    </div>
  )
}
