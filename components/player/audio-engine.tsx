"use client"

import { useRef, useState, useEffect, useCallback } from "react"
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
  onTimeUpdate?: (seconds: number) => void
  onDuration?: (seconds: number) => void
  onTrackEnd?: () => void
  onPlayStateChange?: (playing: boolean) => void
}

/**
 * AudioEngine is an invisible component that manages the actual audio playback.
 * It renders the appropriate player (YouTube, SoundCloud, or HTML5 audio) based
 * on the track source, and syncs playback position to the server's playback state.
 */
export function AudioEngine({
  track,
  playbackState,
  volume,
  muted,
  isDJ,
  visible = false,
  onTimeUpdate,
  onDuration,
  onTrackEnd,
  onPlayStateChange,
}: AudioEngineProps) {
  const playerRef = useRef<AudioPlayerHandle>(null)
  const [ready, setReady] = useState(false)
  const [playerState, setPlayerState] = useState<"playing" | "paused" | "ended" | "buffering">("paused")
  const lastSyncRef = useRef(0)
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Volume control
  useEffect(() => {
    if (ready && playerRef.current) {
      playerRef.current.setVolume(muted ? 0 : volume)
    }
  }, [volume, muted, ready])

  // Sync to server playback state
  const syncToServer = useCallback(() => {
    if (!playbackState || !ready || !playerRef.current) return

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
      onPlayStateChange?.(false)
      return
    }

    // Server says playing — calculate where we should be
    const serverStartMs = playbackState.startedAt
    const elapsedMs = Date.now() - serverStartMs
    const targetSeconds = Math.max(0, elapsedMs / 1000)

    // Check current position
    const currentPos = playerRef.current.getCurrentTime()
    const drift = Math.abs(currentPos - targetSeconds)

    // Only seek if drift > 2 seconds (our sync tolerance)
    if (drift > 2) {
      console.log(`[audio-engine] sync: drift ${drift.toFixed(1)}s, seeking to ${targetSeconds.toFixed(1)}s`)
      playerRef.current.seekTo(targetSeconds)
    }

    playerRef.current.play()
    onPlayStateChange?.(true)
  }, [playbackState, ready, onPlayStateChange])

  // Sync when playback state changes
  useEffect(() => {
    syncToServer()
  }, [syncToServer])

  // Also sync when player becomes ready
  const handleReady = useCallback(() => {
    setReady(true)
    // Small delay to let player fully initialize
    syncTimeoutRef.current = setTimeout(() => {
      syncToServer()
    }, 300)
  }, [syncToServer])

  // Clean up sync timeout
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
    }
  }, [])

  // Re-sync periodically to correct any drift (every 10s)
  useEffect(() => {
    if (!ready || !playbackState?.isPlaying) return
    const interval = setInterval(syncToServer, 10000)
    return () => clearInterval(interval)
  }, [ready, playbackState?.isPlaying, syncToServer])

  // Reset ready state when track changes
  useEffect(() => {
    setReady(false)
    lastSyncRef.current = 0
    hasPlayedRef.current = false
  }, [track?.id])

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
    case "youtube":
      if (!track.videoId) return null
      // YouTube: show the official embed when visible=true
      return visible ? (
        <div className="w-full">
          <YouTubePlayer
            ref={playerRef}
            videoId={track.videoId}
            onReady={handleReady}
            onStateChange={handleStateChange}
            onDuration={onDuration}
            onTimeUpdate={onTimeUpdate}
          />
        </div>
      ) : (
        <div className="hidden">
          <YouTubePlayer
            ref={playerRef}
            videoId={track.videoId}
            onReady={handleReady}
            onStateChange={handleStateChange}
            onDuration={onDuration}
            onTimeUpdate={onTimeUpdate}
          />
        </div>
      )

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
