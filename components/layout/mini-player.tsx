"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Play, Pause, Volume2, VolumeX, X, Radio, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { usePlayer } from "@/lib/player-context"
import { SaveTrackMenu } from "@/components/room/save-track-menu"
import { getRoom } from "@/lib/api"
import { AudioEngine, type AudioEngineTrack } from "@/components/player/audio-engine"
import { parseTrackUrl } from "@/lib/track-utils"

export function MiniPlayer() {
  const { player, togglePlay, toggleMute, setVolume, close } = usePlayer()
  const pathname = usePathname()
  const [validated, setValidated] = useState(false)

  // Build the audio track for the AudioEngine
  const audioTrack: AudioEngineTrack | null = useMemo(() => {
    if (!player?.track?.sourceUrl) return null
    const parsed = parseTrackUrl(player.track.sourceUrl)
    return {
      id: player.track.id,
      source: (player.track.source || parsed?.source || "mp3") as "youtube" | "soundcloud" | "mp3",
      sourceUrl: player.track.sourceUrl,
      videoId: parsed?.videoId,
    }
  }, [player?.track?.id, player?.track?.sourceUrl, player?.track?.source])

  // Build a playback state that tells AudioEngine to play from current position
  const playbackState = useMemo(() => {
    if (!player?.isPlaying) return null
    return {
      roomId: "",
      trackId: player.track.id,
      startedAtUnix: Date.now(), // start from beginning (server doesn't track mini player position)
      isPlaying: player.isPlaying,
      pausePosition: 0,
    }
  }, [player?.isPlaying, player?.track?.id])

  // Don't render audio on room pages — the room's own AudioEngine handles it there
  const isOnRoomPage = pathname.startsWith("/room/")

  // Validate the room still exists when mini player loads from storage
  useEffect(() => {
    if (!player) {
      setValidated(true)
      return
    }
    let cancelled = false
    getRoom(player.roomSlug)
      .then((detail) => {
        if (cancelled) return
        // If room is no longer live or has no track playing, clear mini player
        if (!detail.room.isLive && !detail.nowPlaying) {
          close()
        }
        setValidated(true)
      })
      .catch(() => {
        // Room doesn't exist — clear stale player
        if (!cancelled) {
          close()
          setValidated(true)
        }
      })
    return () => { cancelled = true }
  }, [player?.roomSlug]) // eslint-disable-line react-hooks/exhaustive-deps

  // Don't show mini-player if nothing is playing or not yet validated
  if (!player || !validated) return null

  // Hide on any room page -- the full player is visible there
  if (isOnRoomPage) return null

  return (
    <>
    {/* Audio engine for continuous playback when not on room page */}
    {audioTrack && (
      <AudioEngine
        track={audioTrack}
        playbackState={playbackState}
        volume={player.volume}
        muted={player.muted}
        isDJ={false}
      />
    )}

    {/* Spacer so page content isn't hidden behind the fixed bar */}
    <div className="h-14" />
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Glow line at top */}
      <div
        className="h-px w-full"
        style={{
          background:
            "linear-gradient(90deg, transparent, oklch(0.82 0.18 80 / 0.5), oklch(0.70 0.22 350 / 0.3), oklch(0.82 0.18 80 / 0.5), transparent)",
        }}
      />

      <div
        className="flex items-center gap-3 px-4 py-2.5 sm:px-6"
        style={{
          background: "oklch(0.10 0.01 280 / 0.95)",
          backdropFilter: "blur(16px) saturate(1.3)",
          WebkitBackdropFilter: "blur(16px) saturate(1.3)",
        }}
      >
        {/* Room info - links back to the room */}
        <Link
          href={`/room/${player.roomSlug}`}
          className="flex min-w-0 flex-1 items-center gap-3 group"
        >
          {/* Pulsing radio icon */}
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{
              background: "oklch(0.18 0.02 280)",
              border: "1px solid oklch(0.30 0.04 60 / 0.3)",
            }}
          >
            <Radio
              className="h-4 w-4"
              style={{
                color: player.isPlaying
                  ? "oklch(0.82 0.18 80)"
                  : "oklch(0.50 0.02 280)",
              }}
            />
          </div>

          <div className="flex min-w-0 flex-col">
            <p className="truncate font-sans text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              {player.track.title}
              <span className="text-muted-foreground font-normal">
                {" "}&middot; {player.track.artist}
              </span>
            </p>
            <p className="truncate font-sans text-[11px] text-muted-foreground">
              {player.roomName}
              <span className="text-muted-foreground/60">
                {" "}hosted by {player.djName}
              </span>
            </p>
          </div>
        </Link>

        {/* Save track */}
        <SaveTrackMenu track={player.track} size={15} />

        {/* Controls */}
        <div className="flex shrink-0 items-center gap-1.5">
          {/* Play/Pause */}
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePlay}
            className="h-8 w-8 rounded-full text-foreground hover:bg-muted/50 hover:text-primary"
            aria-label={player.isPlaying ? "Pause" : "Play"}
          >
            {player.isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          {/* Return to Room */}
          <Link href={`/room/${player.roomSlug}`}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-primary hover:bg-primary/20 hover:text-primary"
              aria-label="Return to room"
              title="Return to room"
            >
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </Link>

          {/* Volume - hidden on mobile */}
          <div className="hidden items-center gap-1 sm:flex">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="h-7 w-7 rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              aria-label={player.muted ? "Unmute" : "Mute"}
            >
              {player.muted ? (
                <VolumeX className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
            </Button>
            <Slider
              value={[player.muted ? 0 : player.volume]}
              onValueChange={([v]) => setVolume(v)}
              max={100}
              step={1}
              className="w-20"
              aria-label="Volume"
            />
          </div>

          {/* Close */}
          <Button
            variant="ghost"
            size="icon"
            onClick={close}
            className="h-7 w-7 rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            aria-label="Close player"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
    </>
  )
}
