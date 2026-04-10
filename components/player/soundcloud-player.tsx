"use client"

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react"
import type { AudioPlayerHandle } from "./youtube-player"

declare global {
  interface Window {
    SC: any
  }
}

interface SoundCloudPlayerProps {
  trackUrl: string
  onReady?: () => void
  onStateChange?: (state: "playing" | "paused" | "ended" | "buffering") => void
  onDuration?: (seconds: number) => void
  onTimeUpdate?: (seconds: number) => void
  onArtwork?: (url: string | null) => void
}

// SoundCloud artwork URLs are returned at -large size (~100x100). Swap to
// t500x500 for a sharper image suitable for the vinyl label.
function upscaleArtwork(url: string | null | undefined): string | null {
  if (!url) return null
  return url.replace(/-large(\.\w+)$/, "-t500x500$1")
}

// Robust SC Widget API loader with retry
let scApiPromise: Promise<void> | null = null

function loadSCApi(): Promise<void> {
  if (window.SC?.Widget) return Promise.resolve()
  if (scApiPromise) return scApiPromise

  scApiPromise = new Promise((resolve, reject) => {
    // Remove any stale script tags
    const existing = document.querySelector('script[src*="w.soundcloud.com/player/api.js"]')
    if (existing) existing.remove()

    const tag = document.createElement("script")
    tag.src = "https://w.soundcloud.com/player/api.js"
    tag.async = true

    tag.onload = () => {
      // The script may set window.SC slightly after onload in some browsers
      // Poll briefly to make sure it's available
      let attempts = 0
      const check = () => {
        if (window.SC?.Widget) {
          resolve()
        } else if (attempts < 20) {
          attempts++
          setTimeout(check, 100)
        } else {
          reject(new Error("SC Widget API failed to initialize"))
        }
      }
      check()
    }

    tag.onerror = () => {
      scApiPromise = null
      reject(new Error("Failed to load SoundCloud Widget API"))
    }

    document.head.appendChild(tag)
  })

  // Reset on failure so it can be retried
  scApiPromise.catch(() => {
    scApiPromise = null
  })

  return scApiPromise
}

export const SoundCloudPlayer = forwardRef<AudioPlayerHandle, SoundCloudPlayerProps>(
  function SoundCloudPlayer({ trackUrl, onReady, onStateChange, onDuration, onTimeUpdate, onArtwork }, ref) {
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const widgetRef = useRef<any>(null)
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const durationRef = useRef(0)
    const positionRef = useRef(0)

    useImperativeHandle(ref, () => ({
      play: () => widgetRef.current?.play?.(),
      pause: () => widgetRef.current?.pause?.(),
      seekTo: (s: number) => widgetRef.current?.seekTo?.(s * 1000),
      setVolume: (v: number) => widgetRef.current?.setVolume?.(v),
      getCurrentTime: () => positionRef.current,
      getDuration: () => durationRef.current,
    }))

    const startTimeUpdates = useCallback(() => {
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        widgetRef.current?.getPosition?.((pos: number) => {
          positionRef.current = pos / 1000
          onTimeUpdate?.(pos / 1000)
        })
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

      // Wait for both: iframe to exist AND SC API to load
      loadSCApi()
        .then(() => {
          if (destroyed || !iframeRef.current) return

          const widget = window.SC.Widget(iframeRef.current)
          widgetRef.current = widget

          widget.bind(window.SC.Widget.Events.READY, () => {
            if (destroyed) return
            widget.getDuration((dur: number) => {
              durationRef.current = dur / 1000
              onDuration?.(dur / 1000)
            })
            widget.getCurrentSound?.((sound: any) => {
              if (destroyed) return
              onArtwork?.(upscaleArtwork(sound?.artwork_url))
            })
            onReady?.()
          })

          widget.bind(window.SC.Widget.Events.PLAY, () => {
            if (!destroyed) {
              onStateChange?.("playing")
              startTimeUpdates()
            }
          })

          widget.bind(window.SC.Widget.Events.PAUSE, () => {
            if (!destroyed) {
              onStateChange?.("paused")
              stopTimeUpdates()
            }
          })

          widget.bind(window.SC.Widget.Events.FINISH, () => {
            if (!destroyed) {
              onStateChange?.("ended")
              stopTimeUpdates()
            }
          })
        })
        .catch((err) => {
          console.error("[soundcloud-player] Failed to load SC API:", err)
        })

      return () => {
        destroyed = true
        stopTimeUpdates()
      }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Handle track URL changes — load the new track into the existing widget
    const currentUrlRef = useRef(trackUrl)
    useEffect(() => {
      if (trackUrl !== currentUrlRef.current && widgetRef.current) {
        currentUrlRef.current = trackUrl
        durationRef.current = 0
        positionRef.current = 0
        // Reset artwork while the new track loads so stale art doesn't linger
        onArtwork?.(null)
        widgetRef.current.load(trackUrl, {
          auto_play: true,
          show_artwork: false,
          callback: () => {
            // Get duration of new track
            widgetRef.current?.getDuration?.((dur: number) => {
              durationRef.current = dur / 1000
              onDuration?.(dur / 1000)
            })
            widgetRef.current?.getCurrentSound?.((sound: any) => {
              onArtwork?.(upscaleArtwork(sound?.artwork_url))
            })
            onReady?.()
            // Ensure playback starts
            setTimeout(() => {
              widgetRef.current?.play?.()
            }, 300)
          },
        })
      }
    }, [trackUrl, onReady, onDuration, onArtwork])

    // Hidden iframe — audio only, no visible widget
    const embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(trackUrl)}&auto_play=false&show_artwork=false&visual=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false`

    return (
      <iframe
        ref={iframeRef}
        src={embedUrl}
        width="0"
        height="0"
        allow="autoplay"
        className="hidden"
        aria-hidden="true"
      />
    )
  }
)
