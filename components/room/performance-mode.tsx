"use client"

import { useState, useEffect } from "react"
import { X, Users, Flame, SkipForward, Mic, MicOff } from "lucide-react"
import { VinylSpinner } from "./vinyl-spinner"
import { AudioVisualizer } from "./audio-visualizer"
import type { Track } from "@/lib/mock-data"

interface PerformanceModeProps {
  isOpen: boolean
  onClose: () => void
  track: Track | null
  isPlaying: boolean
  listenerCount: number
  hypeScore: number
  micActive: boolean
  onSkip?: () => void
  onToggleMic?: () => void
}

export function PerformanceMode({
  isOpen,
  onClose,
  track,
  isPlaying,
  listenerCount,
  hypeScore,
  micActive,
  onSkip,
  onToggleMic,
}: PerformanceModeProps) {
  const [showControls, setShowControls] = useState(true)

  // Auto-hide controls after 3 seconds of no interaction
  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(() => setShowControls(false), 3000)
    return () => clearTimeout(timer)
  }, [isOpen, showControls])

  // Show controls on mouse move
  const handleMouseMove = () => {
    setShowControls(true)
  }

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const hypeColor =
    hypeScore >= 80
      ? "oklch(0.65 0.26 30)"
      : hypeScore >= 50
      ? "oklch(0.82 0.18 80)"
      : "oklch(0.72 0.15 200)"

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{
        background: "linear-gradient(180deg, oklch(0.08 0.02 280), oklch(0.05 0.01 280))",
      }}
      onMouseMove={handleMouseMove}
      onClick={() => setShowControls(true)}
    >
      {/* Close button - always visible on hover */}
      <button
        onClick={onClose}
        className={`absolute top-6 right-6 p-2 rounded-full transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        } hover:bg-white/10`}
        aria-label="Exit performance mode"
      >
        <X className="h-6 w-6 text-white/70" />
      </button>

      {/* Top stats bar */}
      <div
        className={`absolute top-6 left-6 flex items-center gap-6 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-30"
        }`}
      >
        {/* Listener count */}
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-white/60" />
          <span className="font-mono text-2xl font-bold text-white">
            {listenerCount.toLocaleString()}
          </span>
        </div>

        {/* Hype meter */}
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5" style={{ color: hypeColor }} />
          <div className="w-32 h-2 rounded-full overflow-hidden" style={{ background: "oklch(0.20 0.02 280)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${hypeScore}%`,
                background: hypeColor,
                boxShadow: `0 0 12px ${hypeColor}`,
              }}
            />
          </div>
          <span className="font-mono text-sm font-bold" style={{ color: hypeColor }}>
            {hypeScore}%
          </span>
        </div>
      </div>

      {/* Main content - centered */}
      <div className="flex flex-col items-center gap-8">
        {/* Large vinyl */}
        <div className="relative">
          <VinylSpinner
            albumGradient={track?.albumGradient || "oklch(0.30 0.10 280)"}
            isPlaying={isPlaying}
            size={320}
          />
          {/* Mic indicator overlay */}
          {micActive && (
            <div
              className="absolute inset-0 flex items-center justify-center rounded-full"
              style={{
                background: "oklch(0.50 0.24 30 / 0.3)",
                border: "3px solid oklch(0.58 0.26 30)",
                boxShadow: "0 0 40px oklch(0.58 0.26 30 / 0.5)",
              }}
            >
              <Mic className="h-16 w-16 text-white animate-pulse" />
            </div>
          )}
        </div>

        {/* Track info */}
        {track && (
          <div className="text-center">
            <h1 className="font-sans text-4xl font-bold text-white tracking-tight">
              {track.title}
            </h1>
            <p className="mt-2 font-sans text-xl text-white/60">
              {track.artist}
            </p>
          </div>
        )}

        {/* Visualizer */}
        <div className="w-96 h-16">
          <AudioVisualizer isPlaying={isPlaying && !micActive} />
        </div>
      </div>

      {/* Bottom controls */}
      <div
        className={`absolute bottom-8 flex items-center gap-4 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        <button
          onClick={onToggleMic}
          className="flex items-center gap-2 px-6 py-3 rounded-full font-sans text-sm font-semibold transition-all hover:scale-105"
          style={{
            background: micActive ? "oklch(0.50 0.24 30 / 0.8)" : "oklch(0.20 0.02 280 / 0.8)",
            border: micActive ? "1px solid oklch(0.58 0.26 30)" : "1px solid oklch(0.35 0.02 280)",
            color: micActive ? "white" : "oklch(0.70 0.02 280)",
          }}
        >
          {micActive ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {micActive ? "End Mic" : "Go Live"}
        </button>

        <button
          onClick={onSkip}
          className="flex items-center gap-2 px-6 py-3 rounded-full font-sans text-sm font-semibold transition-all hover:scale-105"
          style={{
            background: "oklch(0.20 0.02 280 / 0.8)",
            border: "1px solid oklch(0.35 0.02 280)",
            color: "oklch(0.70 0.02 280)",
          }}
        >
          <SkipForward className="h-4 w-4" />
          Skip Track
        </button>
      </div>

      {/* Keyboard hint */}
      <p
        className={`absolute bottom-4 font-sans text-xs text-white/30 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        Press ESC to exit
      </p>
    </div>
  )
}
