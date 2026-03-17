"use client"

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react"
import type { AudioPlayerHandle } from "./youtube-player"

interface HTML5AudioPlayerProps {
  src: string
  onReady?: () => void
  onStateChange?: (state: "playing" | "paused" | "ended" | "buffering") => void
  onDuration?: (seconds: number) => void
  onTimeUpdate?: (seconds: number) => void
}

export const HTML5AudioPlayer = forwardRef<AudioPlayerHandle, HTML5AudioPlayerProps>(
  function HTML5AudioPlayer({ src, onReady, onStateChange, onDuration, onTimeUpdate }, ref) {
    const audioRef = useRef<HTMLAudioElement | null>(null)

    useImperativeHandle(ref, () => ({
      play: () => audioRef.current?.play(),
      pause: () => audioRef.current?.pause(),
      seekTo: (s: number) => {
        if (audioRef.current) audioRef.current.currentTime = s
      },
      setVolume: (v: number) => {
        if (audioRef.current) audioRef.current.volume = v / 100
      },
      getCurrentTime: () => audioRef.current?.currentTime ?? 0,
      getDuration: () => audioRef.current?.duration ?? 0,
    }))

    const handleLoadedMetadata = useCallback(() => {
      const a = audioRef.current
      if (a && a.duration && isFinite(a.duration)) {
        onDuration?.(a.duration)
      }
      onReady?.()
    }, [onReady, onDuration])

    const handleTimeUpdate = useCallback(() => {
      if (audioRef.current) {
        onTimeUpdate?.(audioRef.current.currentTime)
      }
    }, [onTimeUpdate])

    const handlePlay = useCallback(() => onStateChange?.("playing"), [onStateChange])
    const handlePause = useCallback(() => onStateChange?.("paused"), [onStateChange])
    const handleEnded = useCallback(() => onStateChange?.("ended"), [onStateChange])
    const handleWaiting = useCallback(() => onStateChange?.("buffering"), [onStateChange])

    // Update source
    useEffect(() => {
      if (audioRef.current && src) {
        audioRef.current.src = src
        audioRef.current.load()
      }
    }, [src])

    return (
      <audio
        ref={audioRef}
        preload="auto"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onWaiting={handleWaiting}
        className="hidden"
      />
    )
  }
)
