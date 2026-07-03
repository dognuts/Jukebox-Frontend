"use client"

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react"
import type { AudioPlayerHandle } from "./youtube-player"

interface HTML5AudioPlayerProps {
  src: string
  onReady?: () => void
  onStateChange?: (state: "playing" | "paused" | "ended" | "buffering") => void
  onDuration?: (seconds: number) => void
  onTimeUpdate?: (seconds: number) => void
  // Fired when play() is rejected by the browser's autoplay policy
  // (NotAllowedError) — i.e. playback needs a user gesture.
  onPlayBlocked?: () => void
}

export const HTML5AudioPlayer = forwardRef<AudioPlayerHandle, HTML5AudioPlayerProps>(
  function HTML5AudioPlayer({ src, onReady, onStateChange, onDuration, onTimeUpdate, onPlayBlocked }, ref) {
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const onPlayBlockedRef = useRef(onPlayBlocked)
    onPlayBlockedRef.current = onPlayBlocked

    useImperativeHandle(ref, () => ({
      play: () => {
        // Don't discard the play() promise: a NotAllowedError rejection
        // means the autoplay policy blocked us and the engine must show
        // its tap-to-listen gate. AbortError (a load/pause interrupting
        // the play) is expected churn and stays silent.
        audioRef.current?.play()?.catch((err: unknown) => {
          if ((err as DOMException | null)?.name === "NotAllowedError") {
            onPlayBlockedRef.current?.()
          }
        })
      },
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
