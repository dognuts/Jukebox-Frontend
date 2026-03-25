"use client"

import { useState, useEffect, useRef, useCallback, useTransition } from "react"
import { Activity } from "lucide-react"
import { BPMDetector, TapTempo } from "@/lib/bpm-detector"
import { estimateBpm } from "@/lib/estimate-bpm"

interface BPMDisplayProps {
  /** Whether audio is currently playing */
  isPlaying: boolean
  /** The audio element to analyze (only works for HTML5 audio, not YouTube iframes) */
  audioElement?: HTMLAudioElement | null
  /** Audio source type — detection only works for "mp3" / direct audio */
  source?: string
  /** Track info for automatic estimation when audio analysis isn't available */
  trackTitle?: string
  trackArtist?: string
  genre?: string
}

export function BPMDisplay({ isPlaying, audioElement, source, trackTitle, trackArtist, genre }: BPMDisplayProps) {
  const canAutoDetect = source === "mp3" || source === "direct"

  const [bpm, setBpm] = useState<number | null>(null)
  const [mode, setMode] = useState<"auto" | "tap" | "estimate">("auto")
  const [tapBpm, setTapBpm] = useState<number | null>(null)
  const [tapCount, setTapCount] = useState(0)
  const [confidence, setConfidence] = useState<"low" | "medium" | "high" | null>(null)
  const detectorRef = useRef<BPMDetector | null>(null)
  const tapTempoRef = useRef(new TapTempo())
  const lastEstimateKey = useRef("")

  // Auto-detection for HTML5 audio elements (MP3s)
  useEffect(() => {
    if (!canAutoDetect || !audioElement || !isPlaying || mode !== "auto") {
      return
    }

    const detector = new BPMDetector()
    detectorRef.current = detector

    detector.attach(audioElement, (detectedBpm) => {
      setBpm(detectedBpm)
      setConfidence("high")
    })

    return () => {
      detector.detach()
      detectorRef.current = null
    }
  }, [audioElement, isPlaying, canAutoDetect, mode])

  // Automatic BPM estimation for YouTube/SoundCloud tracks
  // Uses the local heuristic estimator based on title, artist, and genre
  useEffect(() => {
    if (canAutoDetect) return // MP3s use audio analysis, not estimation
    if (!isPlaying || !trackTitle) return
    if (mode === "tap" && tapBpm) return // don't override active tap tempo

    const key = `${trackTitle}::${trackArtist}::${genre}`
    if (key === lastEstimateKey.current) return // already estimated this track
    lastEstimateKey.current = key

    // Run local estimate immediately
    const result = estimateBpm(trackTitle || "", trackArtist || "", genre || "")
    setBpm(result.bpm)
    setConfidence(result.confidence)
    setMode("estimate")

    // Try AI estimator for better accuracy (non-blocking)
    // This uses a server action that may or may not have an API key configured
    import("@/app/actions/estimate-bpm").then(({ estimateBpmAI }) => {
      estimateBpmAI(trackTitle || "", trackArtist || "", genre || "")
        .then((aiResult) => {
          // Only update if we're still on the same track and not in tap mode
          if (lastEstimateKey.current === key) {
            setBpm(aiResult.bpm)
            setConfidence(aiResult.confidence as "low" | "medium" | "high")
          }
        })
        .catch(() => {
          // AI estimator failed (no API key, network error, etc.) — keep local estimate
        })
    }).catch(() => {
      // Module import failed — keep local estimate
    })
  }, [isPlaying, trackTitle, trackArtist, genre, canAutoDetect, mode, tapBpm])

  // Reset when track changes
  useEffect(() => {
    lastEstimateKey.current = ""
    setBpm(null)
    setConfidence(null)
    setTapBpm(null)
    setTapCount(0)
    tapTempoRef.current.reset()
    if (canAutoDetect) {
      setMode("auto")
    }
    // Don't reset mode to "auto" for non-MP3 — the estimate effect will set it
  }, [trackTitle, trackArtist, canAutoDetect])

  // Reset BPM when playback stops
  useEffect(() => {
    if (!isPlaying) {
      setBpm(null)
      setConfidence(null)
    }
  }, [isPlaying])

  // Tap tempo handler
  const handleTap = useCallback(() => {
    setMode("tap")
    const result = tapTempoRef.current.tap()
    setTapCount((c) => c + 1)
    if (result) {
      setTapBpm(result)
      setBpm(result)
      setConfidence("high")
    }
  }, [])

  // Switch modes
  const toggleMode = useCallback(() => {
    setMode((m) => {
      if (m === "tap") {
        // Switch back to auto/estimate
        tapTempoRef.current.reset()
        setTapBpm(null)
        setTapCount(0)
        lastEstimateKey.current = "" // force re-estimate
        return canAutoDetect ? "auto" : "estimate"
      } else {
        // Switch to tap
        return "tap"
      }
    })
  }, [canAutoDetect])

  // Reset tap on double-click
  const handleReset = useCallback(() => {
    tapTempoRef.current.reset()
    setTapBpm(null)
    setTapCount(0)
    setBpm(null)
    setConfidence(null)
    lastEstimateKey.current = "" // force re-estimate on next render
  }, [])

  const displayBpm = bpm
  const tempo = displayBpm
    ? displayBpm >= 130 ? "fast" : displayBpm >= 90 ? "moderate" : "slow"
    : null
  const tempoLabel = displayBpm
    ? displayBpm >= 130 ? "Fast" : displayBpm >= 90 ? "Moderate" : "Slow"
    : null

  const colors = {
    slow: {
      text: "oklch(0.55 0.18 300)",
      textBright: "oklch(0.65 0.22 300)",
      border: "oklch(0.45 0.15 300 / 0.35)",
      bg: "oklch(0.18 0.04 300 / 0.5)",
      label: "oklch(0.50 0.12 300)",
    },
    moderate: {
      text: "oklch(0.60 0.18 155)",
      textBright: "oklch(0.70 0.22 155)",
      border: "oklch(0.50 0.15 155 / 0.35)",
      bg: "oklch(0.18 0.04 155 / 0.5)",
      label: "oklch(0.55 0.12 155)",
    },
    fast: {
      text: "oklch(0.68 0.25 30)",
      textBright: "oklch(0.75 0.28 30)",
      border: "oklch(0.55 0.20 30 / 0.4)",
      bg: "oklch(0.20 0.05 30 / 0.5)",
      label: "oklch(0.60 0.18 30)",
    },
  }

  const c = tempo ? colors[tempo] : null
  const pulseDuration = displayBpm ? 60 / displayBpm : 1

  // Mode label for the badge
  const modeLabel = mode === "auto" ? "Live" : mode === "estimate" ? (confidence === "high" ? "Match" : "Est") : "Tap"

  return (
    <div className="flex items-center justify-center gap-2">
      {/* BPM pill */}
      <div
        className="flex items-center gap-2 rounded-full px-3 py-1 cursor-pointer select-none"
        onClick={mode === "tap" ? handleTap : toggleMode}
        onDoubleClick={mode === "tap" ? handleReset : undefined}
        title={
          mode === "auto"
            ? canAutoDetect
              ? "Auto-detecting BPM from audio · Click to switch to tap tempo"
              : "Click to tap along with the beat"
            : mode === "estimate"
            ? `Estimated from track info (${confidence} confidence) · Click to switch to tap tempo`
            : "Tap along with the beat · Double-click to reset"
        }
        style={
          c
            ? {
                background: c.bg,
                border: `1px solid ${c.border}`,
              }
            : {
                background: "oklch(0.14 0.01 280 / 0.6)",
                border: "1px solid oklch(0.28 0.02 280 / 0.4)",
              }
        }
      >
        <Activity
          className="h-3.5 w-3.5 transition-transform"
          style={
            c && isPlaying
              ? {
                  color: c.text,
                  animation: `bpm-icon-pulse ${pulseDuration}s ease-in-out infinite`,
                }
              : { color: "oklch(0.45 0.02 280)" }
          }
        />

        {displayBpm ? (
          <>
            <span
              className="font-mono text-sm font-bold"
              style={{
                color: c!.textBright,
              }}
            >
              {displayBpm}
            </span>
            <span className="font-sans text-[10px]" style={{ color: c!.label }}>
              BPM
            </span>
            <span
              className="rounded-full px-1.5 py-px font-sans text-[8px]"
              style={{
                background: c!.border,
                color: c!.textBright,
              }}
            >
              {tempoLabel}
            </span>
          </>
        ) : mode === "tap" ? (
          <span className="font-sans text-xs text-muted-foreground">
            {tapCount === 0 ? "Tap to detect" : tapCount < 3 ? `Tap... (${tapCount})` : "Listening..."}
          </span>
        ) : canAutoDetect && isPlaying ? (
          <span className="font-mono text-xs text-muted-foreground animate-pulse">
            Detecting...
          </span>
        ) : isPlaying ? (
          <span className="font-mono text-xs text-muted-foreground animate-pulse">
            Estimating...
          </span>
        ) : (
          <span className="font-sans text-xs text-muted-foreground">
            Tap to detect
          </span>
        )}
      </div>

      {/* Mode indicator */}
      {displayBpm && (
        <button
          onClick={toggleMode}
          className="rounded-full px-2 py-0.5 font-sans text-[9px] text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
          style={{
            background: "oklch(0.14 0.01 280 / 0.4)",
            border: "1px solid oklch(0.25 0.02 280 / 0.3)",
          }}
        >
          {modeLabel}
        </button>
      )}
    </div>
  )
}
