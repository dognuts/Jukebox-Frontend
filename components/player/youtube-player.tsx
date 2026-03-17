"use client"

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react"

// YouTube IFrame API types
declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

export interface AudioPlayerHandle {
  play: () => void
  pause: () => void
  seekTo: (seconds: number) => void
  setVolume: (volume: number) => void // 0-100
  getCurrentTime: () => number
  getDuration: () => number
}

interface YouTubePlayerProps {
  videoId: string
  onReady?: () => void
  onStateChange?: (state: "playing" | "paused" | "ended" | "buffering") => void
  onDuration?: (seconds: number) => void
  onTimeUpdate?: (seconds: number) => void
}

let ytApiLoaded = false
let ytApiLoading = false
const ytReadyCallbacks: (() => void)[] = []

function loadYTApi(): Promise<void> {
  if (ytApiLoaded) return Promise.resolve()
  if (ytApiLoading) {
    return new Promise((resolve) => ytReadyCallbacks.push(resolve))
  }
  ytApiLoading = true
  return new Promise((resolve) => {
    ytReadyCallbacks.push(resolve)
    const tag = document.createElement("script")
    tag.src = "https://www.youtube.com/iframe_api"
    document.head.appendChild(tag)
    window.onYouTubeIframeAPIReady = () => {
      ytApiLoaded = true
      ytApiLoading = false
      ytReadyCallbacks.forEach((cb) => cb())
      ytReadyCallbacks.length = 0
    }
  })
}

export const YouTubePlayer = forwardRef<AudioPlayerHandle, YouTubePlayerProps>(
  function YouTubePlayer({ videoId, onReady, onStateChange, onDuration, onTimeUpdate }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const playerRef = useRef<any>(null)
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const currentVideoId = useRef(videoId)

    // Expose imperative handle
    useImperativeHandle(ref, () => ({
      play: () => playerRef.current?.playVideo?.(),
      pause: () => playerRef.current?.pauseVideo?.(),
      seekTo: (s: number) => playerRef.current?.seekTo?.(s, true),
      setVolume: (v: number) => playerRef.current?.setVolume?.(v),
      getCurrentTime: () => playerRef.current?.getCurrentTime?.() ?? 0,
      getDuration: () => playerRef.current?.getDuration?.() ?? 0,
    }))

    const startTimeUpdates = useCallback(() => {
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        const p = playerRef.current
        if (p && p.getCurrentTime) {
          onTimeUpdate?.(p.getCurrentTime())
        }
      }, 500)
    }, [onTimeUpdate])

    const stopTimeUpdates = useCallback(() => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }, [])

    useEffect(() => {
      let destroyed = false

      loadYTApi().then(() => {
        if (destroyed || !containerRef.current) return

        // Create a div for the player
        const el = document.createElement("div")
        el.id = `yt-player-${Date.now()}`
        containerRef.current.innerHTML = ""
        containerRef.current.appendChild(el)

        playerRef.current = new window.YT.Player(el.id, {
          videoId,
          height: "100%",
          width: "100%",
          playerVars: {
            autoplay: 0,
            controls: 1,
            disablekb: 0,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              if (!destroyed) {
                const dur = playerRef.current?.getDuration?.() ?? 0
                if (dur > 0) onDuration?.(dur)
                onReady?.()
              }
            },
            onStateChange: (event: any) => {
              if (destroyed) return
              // YT states: -1=unstarted, 0=ended, 1=playing, 2=paused, 3=buffering, 5=cued
              // Don't map -1 (unstarted) or 5 (cued) — they're initialization states
              const stateMap: Record<number, "playing" | "paused" | "ended" | "buffering"> = {
                [0]: "ended",
                [1]: "playing",
                [2]: "paused",
                [3]: "buffering",
              }
              const state = stateMap[event.data]
              if (state) {
                onStateChange?.(state)
                if (state === "playing") {
                  startTimeUpdates()
                  const dur = playerRef.current?.getDuration?.() ?? 0
                  if (dur > 0) onDuration?.(dur)
                } else {
                  stopTimeUpdates()
                }
              }
            },
          },
        })
      })

      return () => {
        destroyed = true
        stopTimeUpdates()
        playerRef.current?.destroy?.()
        playerRef.current = null
      }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Handle video ID changes
    useEffect(() => {
      if (videoId !== currentVideoId.current && playerRef.current?.loadVideoById) {
        currentVideoId.current = videoId
        playerRef.current.loadVideoById(videoId)
      }
    }, [videoId])

    return (
      <div ref={containerRef} className="yt-embed-container w-full aspect-video rounded-xl overflow-hidden" aria-label="YouTube player" />
    )
  }
)
