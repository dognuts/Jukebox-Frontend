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
  isAdPlaying?: () => boolean
  // True while the player is still in a pre-playback initialization
  // state (YouTube: unstarted/cued — the states its state map doesn't
  // propagate; SoundCloud: before the current track's first PLAY
  // event). Lets the AudioEngine's autoplay watchdog grant slow loads
  // extra grace before declaring an autoplay-policy block.
  isInitializing?: () => boolean
}

interface YouTubePlayerProps {
  videoId: string
  // Consulted before the track-change self-play (loadVideoById and its
  // timed playVideo retries). When it returns false the new video is
  // cued instead of played, so a pause the AudioEngine is honoring
  // (media key, headphone unplug, DJ mic) survives the track advance —
  // the engine starts playback itself once the pause is over.
  shouldAutoplay?: () => boolean
  onReady?: () => void
  onStateChange?: (state: "playing" | "paused" | "ended" | "buffering") => void
  onDuration?: (seconds: number) => void
  onTimeUpdate?: (seconds: number) => void
  onAdStateChange?: (adPlaying: boolean) => void
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
  function YouTubePlayer({ videoId, shouldAutoplay, onReady, onStateChange, onDuration, onTimeUpdate, onAdStateChange }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const playerRef = useRef<any>(null)
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const currentVideoId = useRef(videoId)
    const adPlayingRef = useRef(false)

    // Ad detection: YouTube's IFrame API doesn't fire explicit ad events,
    // but during an ad `getVideoData().video_id` returns the ad's id
    // rather than the requested track's id. Poll while playing.
    const checkAdState = useCallback(() => {
      const p = playerRef.current
      if (!p?.getVideoData) return
      let data: any
      try {
        data = p.getVideoData()
      } catch {
        return
      }
      const playingId = data?.video_id
      if (!playingId) return
      const isAd = playingId !== currentVideoId.current
      if (isAd !== adPlayingRef.current) {
        adPlayingRef.current = isAd
        onAdStateChange?.(isAd)
      }
    }, [onAdStateChange])

    // Expose imperative handle
    useImperativeHandle(ref, () => ({
      play: () => playerRef.current?.playVideo?.(),
      pause: () => playerRef.current?.pauseVideo?.(),
      seekTo: (s: number) => playerRef.current?.seekTo?.(s, true),
      setVolume: (v: number) => playerRef.current?.setVolume?.(v),
      getCurrentTime: () => playerRef.current?.getCurrentTime?.() ?? 0,
      getDuration: () => playerRef.current?.getDuration?.() ?? 0,
      isAdPlaying: () => adPlayingRef.current,
      isInitializing: () => {
        // -1 = unstarted, 5 = cued — where a still-loading video sits
        // before its first buffering/playing transition.
        const s = playerRef.current?.getPlayerState?.()
        return s === -1 || s === 5
      },
    }))

    const startTimeUpdates = useCallback(() => {
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        const p = playerRef.current
        if (p && p.getCurrentTime) {
          checkAdState()
          // Suppress time updates during ads so the server's drift
          // correction doesn't fire while an ad is playing.
          if (!adPlayingRef.current) {
            onTimeUpdate?.(p.getCurrentTime())
          }
        }
      }, 500)
    }, [onTimeUpdate, checkAdState])

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
                if (state === "playing") {
                  // Check ad state BEFORE propagating playback state so
                  // the AudioEngine can suspend sync before its first
                  // syncToServer fires.
                  checkAdState()
                  onStateChange?.(state)
                  startTimeUpdates()
                  const dur = playerRef.current?.getDuration?.() ?? 0
                  if (dur > 0) onDuration?.(dur)
                } else {
                  onStateChange?.(state)
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
        adPlayingRef.current = false
        if (shouldAutoplay?.() ?? true) {
          playerRef.current.loadVideoById(videoId)
        } else {
          // The engine is honoring a user/mic pause — cue the new video
          // without playing so the pause survives the track advance.
          // syncToServer (or a media-key "play") starts it once the
          // pause is actually over.
          playerRef.current.cueVideoById?.(videoId)
        }
        // Explicitly play after loading — loadVideoById can be blocked
        // by autoplay policies. Re-checked at fire time so a pause
        // registered in the meantime isn't steamrolled by a stale retry.
        setTimeout(() => {
          if (shouldAutoplay?.() ?? true) playerRef.current?.playVideo?.()
        }, 300)
        // Re-fire onReady since the player is already initialized but has a new video
        setTimeout(() => {
          onReady?.()
          // Also report duration of the new video
          const dur = playerRef.current?.getDuration?.() ?? 0
          if (dur > 0) onDuration?.(dur)
        }, 800)
        // Retry play and duration report
        setTimeout(() => {
          if (shouldAutoplay?.() ?? true) playerRef.current?.playVideo?.()
          const dur = playerRef.current?.getDuration?.() ?? 0
          if (dur > 0) onDuration?.(dur)
        }, 2000)
      }
    }, [videoId, onReady, onDuration, shouldAutoplay])

    return (
      <div ref={containerRef} className="yt-embed-container w-full aspect-video rounded-xl overflow-hidden" aria-label="YouTube player" />
    )
  }
)
