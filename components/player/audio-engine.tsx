"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { YouTubePlayer, type AudioPlayerHandle } from "./youtube-player"
import { HTML5AudioPlayer } from "./html5-audio-player"
import { SoundCloudPlayer } from "./soundcloud-player"
import type { PlaybackState } from "@/lib/api"

export interface AudioEngineTrack {
  id: string
  source: "youtube" | "soundcloud" | "mp3"
  sourceUrl: string
  videoId?: string // YouTube only
}

interface AudioEngineProps {
  track: AudioEngineTrack | null
  playbackState: PlaybackState | null
  volume: number // 0-100
  muted: boolean
  isDJ: boolean
  visible?: boolean
  forcePaused?: boolean // DJ mic pause — temporarily pauses audio
  onTimeUpdate?: (seconds: number) => void
  onDuration?: (seconds: number) => void
  onTrackEnd?: () => void
  onPlayStateChange?: (playing: boolean) => void
  onArtwork?: (url: string | null) => void // SoundCloud only
  // When set, YouTube tracks render their iframe via React portal into
  // this element instead of using the inline or fixed-corner fallback.
  // Used by the listener room view to place the video where the
  // album-art slot normally lives. Mini-player leaves this null so it
  // keeps the fixed-corner render.
  inlineTarget?: HTMLDivElement | null
}

/**
 * AudioEngine is an invisible component that manages the actual audio playback.
 * It renders the appropriate player (YouTube, SoundCloud, or HTML5 audio) based
 * on the track source, and syncs playback position to the server's playback state.
 * 
 * On initial load, audio is muted until the first sync seek completes to prevent
 * the "plays from 0 then jumps" artifact.
 */
export function AudioEngine({
  track,
  playbackState,
  volume,
  muted,
  isDJ,
  visible = false,
  forcePaused = false,
  onTimeUpdate,
  onDuration,
  onTrackEnd,
  onPlayStateChange,
  onArtwork,
  inlineTarget,
}: AudioEngineProps) {
  const playerRef = useRef<AudioPlayerHandle>(null)
  const [ready, setReady] = useState(false)
  const [synced, setSynced] = useState(false)
  const [playerState, setPlayerState] = useState<"playing" | "paused" | "ended" | "buffering">("paused")
  const lastSyncRef = useRef(0)
  const syncTimeoutsRef = useRef<NodeJS.Timeout[]>([])
  const signaledEndRef = useRef("")  // trackID for which we've already signaled end

  // Persistent YouTube host — a single fixed-position div appended to
  // document.body that always hosts the portal-rendered YouTubePlayer.
  // Its position/size is updated via CSS to either match inlineTarget's
  // bounding rect (when set) or sit at the corner fallback position.
  // Because the host is stable across all inlineTarget changes, the
  // YouTubePlayer mounts exactly once per track and never gets torn
  // down and rebuilt when the target moves — which was the bug that
  // made the iframe disappear on state transitions.
  const [ytHost, setYtHost] = useState<HTMLDivElement | null>(null)

  // Create the stable host on mount.
  useEffect(() => {
    if (typeof document === "undefined") return
    const host = document.createElement("div")
    host.setAttribute("data-yt-host", "")
    host.style.position = "fixed"
    host.style.zIndex = "40"
    host.style.overflow = "hidden"
    host.style.pointerEvents = "auto"
    // Default corner position until inlineTarget is wired up.
    host.style.bottom = "80px"
    host.style.right = "12px"
    host.style.width = "200px"
    host.style.height = "112px"
    host.style.borderRadius = "10px"
    host.style.border = "1px solid oklch(0.30 0.04 280 / 0.5)"
    host.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)"
    document.body.appendChild(host)
    setYtHost(host)
    return () => {
      if (host.parentNode) host.parentNode.removeChild(host)
    }
  }, [])

  // Track inlineTarget's bounding rect and update the host's fixed
  // position to overlay it. Rebinds its observers whenever either
  // inlineTarget or ytHost changes.
  useEffect(() => {
    const host = ytHost
    if (!host) return

    // Corner fallback when there's no target.
    const cornerPosition = () => {
      host.style.top = ""
      host.style.left = ""
      host.style.bottom = "80px"
      host.style.right = "12px"
      host.style.width = "200px"
      host.style.height = "112px"
      host.style.borderRadius = "10px"
      host.style.border = "1px solid oklch(0.30 0.04 280 / 0.5)"
      host.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)"
    }

    if (!inlineTarget) {
      cornerPosition()
      return
    }

    // Overlay mode — track the inlineTarget's position on the page
    // and keep the fixed host aligned to it as the user scrolls or
    // the viewport resizes.
    const overlayPosition = () => {
      if (!inlineTarget || !inlineTarget.isConnected) {
        cornerPosition()
        return
      }
      const rect = inlineTarget.getBoundingClientRect()
      host.style.top = `${rect.top}px`
      host.style.left = `${rect.left}px`
      host.style.right = ""
      host.style.bottom = ""
      host.style.width = `${rect.width}px`
      host.style.height = `${rect.height}px`
      // Inherit the target's border radius so the overlay looks
      // glued to its slot.
      const styles = window.getComputedStyle(inlineTarget)
      host.style.borderRadius = styles.borderRadius || "10px"
      host.style.border = "0px"
      host.style.boxShadow = "none"
    }

    overlayPosition()

    // Use requestAnimationFrame-throttled scroll/resize updates so
    // the overlay tracks smoothly without flooding the main thread.
    let frame = 0
    const schedule = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        overlayPosition()
      })
    }

    const ro = new ResizeObserver(schedule)
    ro.observe(inlineTarget)

    window.addEventListener("scroll", schedule, { passive: true, capture: true })
    window.addEventListener("resize", schedule, { passive: true })

    return () => {
      ro.disconnect()
      window.removeEventListener("scroll", schedule, { capture: true } as any)
      window.removeEventListener("resize", schedule)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [inlineTarget, ytHost])

  // Helper to clear all pending sync timeouts
  const clearSyncTimeouts = useCallback(() => {
    for (const t of syncTimeoutsRef.current) clearTimeout(t)
    syncTimeoutsRef.current = []
  }, [])

  // Volume control — suppress volume until synced to prevent hearing audio at position 0
  useEffect(() => {
    if (ready && playerRef.current) {
      if (!synced) {
        playerRef.current.setVolume(0)
      } else {
        playerRef.current.setVolume(muted ? 0 : volume)
      }
    }
  }, [volume, muted, ready, synced])

  // Sync to server playback state
  const syncToServer = useCallback(() => {
    if (!playbackState || !ready || !playerRef.current) return
    if (forcePaused) return // DJ mic is active — don't resume

    const now = Date.now()
    // Don't sync more than once per second
    if (now - lastSyncRef.current < 1000) return
    lastSyncRef.current = now

    if (!playbackState.isPlaying) {
      // Server says paused — pause at the pause position
      playerRef.current.pause()
      if (playbackState.pausePosition > 0) {
        playerRef.current.seekTo(playbackState.pausePosition)
      }
      setSynced(true)
      onPlayStateChange?.(false)
      return
    }

    // Server says playing — calculate where we should be
    const serverStartMs = playbackState.startedAt
    const elapsedMs = Date.now() - serverStartMs
    const targetSeconds = Math.max(0, elapsedMs / 1000)

    // Check the player's actual duration
    const playerDuration = playerRef.current.getDuration?.() || 0

    // If we know the real duration and server time has passed it, the track is over
    // Tell the server to advance rather than playing from a wrong position
    if (playerDuration > 30 && targetSeconds > playerDuration + 2) {
      // Track should have ended — trigger onTrackEnd to notify server (only once per track)
      if (hasPlayedRef.current && signaledEndRef.current !== playbackState.trackId) {
        signaledEndRef.current = playbackState.trackId || ""
        onTrackEnd?.()
      }
      // Still play from current position while waiting for server to advance
      playerRef.current.play()
      if (!synced) setTimeout(() => setSynced(true), 600)
      else onPlayStateChange?.(true)
      return
    }

    // If player doesn't know duration yet and target is very far ahead, start from current position
    if (playerDuration <= 0 && targetSeconds > 600) {
      playerRef.current.play()
      if (!synced) setTimeout(() => setSynced(true), 600)
      else onPlayStateChange?.(true)
      return
    }

    // Check current position
    const currentPos = playerRef.current.getCurrentTime()
    const drift = Math.abs(currentPos - targetSeconds)

    // Seek if drift > 2 seconds
    if (drift > 2) {
      playerRef.current.seekTo(targetSeconds)
    }

    playerRef.current.play()

    // Restore volume after a short delay to let the seek take effect
    if (!synced) {
      setTimeout(() => {
        setSynced(true)
      }, 300)
    } else {
      onPlayStateChange?.(true)
    }
  }, [playbackState, ready, synced, forcePaused, onPlayStateChange, onTrackEnd])

  // Sync when playback state changes
  useEffect(() => {
    syncToServer()
  }, [syncToServer])

  // Also sync when player becomes ready
  const handleReady = useCallback(() => {
    setReady(true)
    clearSyncTimeouts()
    // Sync with staggered retries to ensure player is truly ready to seek
    syncTimeoutsRef.current.push(
      setTimeout(() => syncToServer(), 200),
      setTimeout(() => { lastSyncRef.current = 0; syncToServer() }, 1200),
      setTimeout(() => { lastSyncRef.current = 0; syncToServer() }, 2500),
    )
  }, [syncToServer, clearSyncTimeouts])

  // Clean up sync timeouts on unmount
  useEffect(() => {
    return () => clearSyncTimeouts()
  }, [clearSyncTimeouts])

  // DJ mic pause — temporarily pause audio when forcePaused is true, resume when false
  useEffect(() => {
    if (!ready || !playerRef.current) return
    if (forcePaused) {
      playerRef.current.pause()
      onPlayStateChange?.(false)
    } else if (playbackState?.isPlaying) {
      // Resume — re-sync to server position since time has passed
      syncToServer()
    }
  }, [forcePaused]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-sync periodically to correct any drift (every 10s)
  useEffect(() => {
    if (!ready || !playbackState?.isPlaying) return
    const interval = setInterval(syncToServer, 10000)
    return () => clearInterval(interval)
  }, [ready, playbackState?.isPlaying, syncToServer])

  // Reset ready state when track changes
  useEffect(() => {
    clearSyncTimeouts()
    setReady(false)
    setSynced(false)
    lastSyncRef.current = 0
    hasPlayedRef.current = false
    signaledEndRef.current = ""
  }, [track?.id, clearSyncTimeouts])

  // Track whether the player has actually started playing
  const hasPlayedRef = useRef(false)

  const handleStateChange = useCallback((state: "playing" | "paused" | "ended" | "buffering") => {
    setPlayerState(state)
    
    if (state === "playing") {
      hasPlayedRef.current = true
      onPlayStateChange?.(true)
    } else if (state === "paused") {
      onPlayStateChange?.(false)
    } else if (state === "ended") {
      // Only trigger track end if the player has actually played something
      // YouTube IFrame API can fire "ended" (state 0) during initialization
      if (hasPlayedRef.current) {
        onTrackEnd?.()
      }
    }
  }, [onTrackEnd, onPlayStateChange])

  if (!track) return null

  // Render the appropriate player
  switch (track.source) {
    case "youtube": {
      if (!track.videoId) return null
      // The YouTubePlayer ALWAYS portals into the stable ytHost div
      // (see the top of the component for how that host is created).
      // Changing the position of the visible video only changes the
      // host's CSS — the React tree position of the YouTubePlayer is
      // constant, which is what keeps the YT.Player instance alive
      // across inlineTarget transitions.
      if (!ytHost) return null
      return createPortal(
        <YouTubePlayer
          ref={playerRef}
          videoId={track.videoId}
          onReady={handleReady}
          onStateChange={handleStateChange}
          onDuration={onDuration}
          onTimeUpdate={onTimeUpdate}
        />,
        ytHost
      )
    }

    case "soundcloud":
      // SoundCloud: always hidden iframe — Jukebox controls handle UI
      return (
        <SoundCloudPlayer
          ref={playerRef}
          trackUrl={track.sourceUrl}
          onReady={handleReady}
          onStateChange={handleStateChange}
          onDuration={onDuration}
          onTimeUpdate={onTimeUpdate}
          onArtwork={onArtwork}
        />
      )

    case "mp3":
      return (
        <HTML5AudioPlayer
          ref={playerRef}
          src={track.sourceUrl}
          onReady={handleReady}
          onStateChange={handleStateChange}
          onDuration={onDuration}
          onTimeUpdate={onTimeUpdate}
        />
      )

    default:
      return null
  }
}
