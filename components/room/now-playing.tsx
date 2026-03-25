"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Volume2, VolumeX, SkipForward, Pause, Play, Mic } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { type Track, formatDuration } from "@/lib/mock-data"
import { VinylSpinner } from "@/components/effects/vinyl-spinner"
import { AudioVisualizer } from "./audio-visualizer"
import { SaveTrackMenu } from "./save-track-menu"
import { BPMDisplay } from "./bpm-display"

interface NowPlayingProps {
  track: Track
  isDJ: boolean
  genre?: string
  onSkip?: () => void
  onTogglePlay?: () => void
  micActive?: boolean
  micPausesMusic?: boolean
  currentTime?: number
  externalPlaying?: boolean
  soundCloudUrl?: string
  volume?: number
  muted?: boolean
  onVolumeChange?: (v: number) => void
  onMutedChange?: (m: boolean) => void
}

export function NowPlaying({
  track,
  isDJ,
  genre = "Electronic",
  onSkip,
  onTogglePlay,
  micActive = false,
  micPausesMusic = true,
  currentTime,
  externalPlaying,
  soundCloudUrl,
  volume: volumeProp,
  muted: mutedProp,
  onVolumeChange,
  onMutedChange,
}: NowPlayingProps) {
  const useExternal = currentTime !== undefined
  const [isPlaying, setIsPlaying] = useState(true)
  const [progress, setProgress] = useState(0)
  const [localVolume, setLocalVolume] = useState(75)
  const [localMuted, setLocalMuted] = useState(false)

  // Use lifted state if provided, otherwise use local state
  const volume = volumeProp ?? localVolume
  const muted = mutedProp ?? localMuted
  const setVolume = useCallback((v: number) => {
    if (onVolumeChange) onVolumeChange(v)
    else setLocalVolume(v)
  }, [onVolumeChange])
  const setMuted = useCallback((m: boolean) => {
    if (onMutedChange) onMutedChange(m)
    else setLocalMuted(m)
  }, [onMutedChange])

  // Sync from external audio engine when available
  useEffect(() => {
    if (useExternal && currentTime !== undefined) {
      setProgress(Math.floor(currentTime))
    }
  }, [useExternal, currentTime])

  useEffect(() => {
    if (useExternal && externalPlaying !== undefined) {
      setIsPlaying(externalPlaying)
    }
  }, [useExternal, externalPlaying])

  // Track whether music was playing before mic went live so we can restore it
  const wasPlayingRef = useRef(true)


  // When mic activates with pause mode, stop playback; restore when mic ends
  useEffect(() => {
    if (micActive && micPausesMusic) {
      wasPlayingRef.current = isPlaying
      setIsPlaying(false)
    } else if (!micActive && micPausesMusic) {
      setIsPlaying(wasPlayingRef.current)
    }
    // Voice-over mode: don't touch isPlaying
  }, [micActive, micPausesMusic]) // eslint-disable-line react-hooks/exhaustive-deps

  // Effective playing: paused when DJ mics in with pause mode
  const effectivePlaying = isPlaying && !(micActive && micPausesMusic)

  // Track whether the progress timer should auto-skip
  const shouldSkipRef = useRef(false)

  // Simulated progress — only when NOT using external audio engine
  useEffect(() => {
    if (useExternal) return // real audio engine drives progress
    if (!effectivePlaying) return
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= track.duration) return prev // freeze at end, skip handled below
        return prev + 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [effectivePlaying, track.duration])

  // Detect when track finishes and schedule skip after render
  useEffect(() => {
    // Don't auto-skip if duration is 0 (unknown) — let the audio engine handle it via onTrackEnd
    if (track.duration > 0 && progress >= track.duration && progress > 0) {
      shouldSkipRef.current = true
    }
  }, [progress, track.duration])

  // Execute skip in a separate effect so we never call parent setState during render
  useEffect(() => {
    if (shouldSkipRef.current) {
      shouldSkipRef.current = false
      setProgress(0)
      onSkip?.()
    }
  })

  // Reset progress on track change
  useEffect(() => {
    shouldSkipRef.current = false
    setProgress(0)
    setIsPlaying(true)
  }, [track.id])

  const togglePlay = useCallback(() => {
    // Don't allow manual play while mic is pausing music
    if (micActive && micPausesMusic) return
    if (onTogglePlay) {
      onTogglePlay()
    } else {
      setIsPlaying((p) => !p)
    }
  }, [micActive, micPausesMusic, onTogglePlay])

  const toggleMute = useCallback(() => setMuted(!muted), [muted, setMuted])

  const progressPercent = track.duration > 0 ? (progress / track.duration) * 100 : 0

  return (
    <div className="flex flex-col gap-6">
      {/* Vinyl + track info */}
      <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:gap-8">
        {/* Vinyl spinner */}
        <div className="flex shrink-0 justify-center">
          <VinylSpinner
            albumGradient={track.albumGradient}
            isPlaying={effectivePlaying}
            size={180}
          />
        </div>

        {/* Track info + visualizer */}
        <div className="flex flex-1 flex-col items-center gap-4 lg:items-start">
          <div className="text-center lg:text-left">
            <div className="flex items-start justify-center gap-1.5 lg:justify-start">
              <h2 className="font-sans text-2xl font-bold tracking-tight text-foreground sm:text-3xl text-balance leading-tight">
                {track.title}
              </h2>
              <SaveTrackMenu track={track} size={18} />
            </div>
            <p
              className="mt-2 font-sans text-base font-medium"
              style={{ color: "oklch(0.82 0.16 80)" }}
            >
              {track.artist}
            </p>
            <p className="mt-1 font-sans text-xs text-muted-foreground">
              Queued by{" "}
              <span className="font-medium" style={{ color: "oklch(0.72 0.12 250)" }}>
                {track.submittedBy}
              </span>
            </p>
            {soundCloudUrl && (
              <a
                href={soundCloudUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-sans text-[11px] font-semibold transition-all hover:scale-105"
                style={{
                  background: "oklch(0.15 0.02 40 / 0.6)",
                  border: "1px solid oklch(0.40 0.12 40 / 0.4)",
                  color: "oklch(0.80 0.12 40)",
                }}
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                  <path d="M11.56 8.87V17h8.76c1.85-.13 2.68-1.27 2.68-2.5 0-1.62-1.13-2.5-2.56-2.5-.33 0-.56.05-.83.16C19.3 10.09 17.58 8.5 15.5 8.5c-.71 0-1.39.17-1.98.5-.16.08-.25.18-.25.38v-.01H13v.03c-.15-.07-.39-.13-.6-.13-.63 0-1.14.47-1.14 1.09v.28c-.34-.55-.93-.87-1.6-.87H11.56zm-1.59 1.5V17H8.89v-5.3c0-.37.3-.65.63-.65.36 0 .64.28.64.65v-.33h.01zm-2.13.74V17H6.75v-4.8c0-.35.28-.66.56-.66.31 0 .53.3.53.66v-.09zm-2.13.74V17H4.62v-3.76c0-.31.26-.54.5-.54.27 0 .59.23.59.54v-.17zm-2.13.62V17h-1.1v-3.14c0-.27.22-.5.55-.5.31 0 .55.22.55.5v-.03zM1.45 13.3V17H.34v-2.4c0-.53.48-.6.48-.6s.42.03.63.3z" />
                </svg>
                Listen on SoundCloud
              </a>
            )}
          </div>

          {/* Mic live banner -- visible to everyone in the room */}
          {micActive && (
            <div
              className="flex w-full max-w-xs items-center justify-center gap-2 rounded-lg px-3 py-2"
              style={{
                background: "oklch(0.13 0.03 30 / 0.6)",
                border: "1px solid oklch(0.50 0.24 30 / 0.5)",
              }}
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                  style={{ background: "oklch(0.58 0.26 30)" }}
                />
                <span
                  className="relative inline-flex h-2 w-2 rounded-full"
                  style={{ background: "oklch(0.58 0.26 30)" }}
                />
              </span>
              <Mic className="h-3.5 w-3.5 shrink-0" style={{ color: "oklch(0.68 0.22 30)" }} />
              <span
                className="font-sans text-xs font-semibold"
                style={{ color: "oklch(0.68 0.22 30)" }}
              >
                {micPausesMusic ? "DJ speaking — music paused" : "DJ speaking over music"}
              </span>
            </div>
          )}

          {/* Visualizer */}
          <div className="h-8 w-full max-w-xs">
            <AudioVisualizer isPlaying={effectivePlaying} />
          </div>

          {/* Source badge */}
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2.5 py-0.5 font-sans text-[10px] font-semibold uppercase"
              style={{
                background: "oklch(0.22 0.01 280)",
                color: "oklch(0.55 0.02 280)",
              }}
            >
              {track.source}
            </span>
          </div>
        </div>
      </div>

      {/* BPM detector — auto-estimates for YouTube/SoundCloud, live-detects for MP3 */}
      <BPMDisplay
        isPlaying={effectivePlaying}
        source={track.source}
        trackTitle={track.title}
        trackArtist={track.artist}
        genre={genre}
      />

      {/* Progress bar */}
      <div className="flex flex-col gap-2">
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all duration-1000 ease-linear"
            style={{
              width: `${progressPercent}%`,
              boxShadow:
                "0 0 8px oklch(0.82 0.18 80 / 0.5), 0 0 16px oklch(0.82 0.18 80 / 0.3)",
            }}
          />
          {/* Playhead glow */}
          <div
            className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-primary"
            style={{
              left: `calc(${progressPercent}% - 6px)`,
              boxShadow:
                "0 0 10px oklch(0.82 0.18 80 / 0.6), 0 0 20px oklch(0.82 0.18 80 / 0.3)",
              transition: "left 1s linear",
            }}
          />
        </div>
        <div className="flex justify-between">
          <span className="font-mono text-xs text-muted-foreground">
            {formatDuration(progress)}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {track.duration > 0 ? formatDuration(track.duration) : "Live"}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isDJ && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlay}
                disabled={micActive && micPausesMusic}
                className="h-10 w-10 rounded-full text-foreground hover:bg-muted/50 hover:text-primary disabled:opacity-40"
                aria-label={effectivePlaying ? "Pause" : "Play"}
              >
                {effectivePlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onSkip}
                className="h-10 w-10 rounded-full text-foreground hover:bg-muted/50 hover:text-primary"
                aria-label="Skip track"
              >
                <SkipForward className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Slider
            value={[muted ? 0 : volume]}
            onValueChange={([v]) => {
              setVolume(v)
              if (v > 0) setMuted(false)
            }}
            max={100}
            step={1}
            className="w-24"
            aria-label="Volume"
          />
        </div>
      </div>
    </div>
  )
}
