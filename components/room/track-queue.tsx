"use client"

import { useState, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Music, Youtube, Cloud, FileAudio, GripVertical, Plus, Loader2, AlertCircle } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { type Track, formatDuration } from "@/lib/mock-data"
import { SaveTrackMenu } from "./save-track-menu"
import { parseTrackUrl, guessTitleFromUrl, randomAlbumGradient } from "@/lib/track-utils"

const sourceIcons = {
  youtube: Youtube,
  soundcloud: Cloud,
  mp3: FileAudio,
}

interface TrackQueueProps {
  tracks: Track[]
  isDJ: boolean
  requestPolicy?: "open" | "closed" | "approval"
  onSubmitTrack?: (track: { title: string; artist: string; duration: number; source: string; sourceUrl: string }) => void
}

export function TrackQueue({ tracks, isDJ, requestPolicy = "open", onSubmitTrack }: TrackQueueProps) {
  const [trackUrl, setTrackUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const canAdd = isDJ || requestPolicy === "open" || requestPolicy === "approval"

  const handleAddTrack = useCallback(async () => {
    if (!trackUrl.trim()) return
    setError("")

    const parsed = parseTrackUrl(trackUrl)
    if (!parsed) {
      setError("Unrecognized URL. Paste a YouTube, SoundCloud, or direct audio link.")
      return
    }

    setLoading(true)

    try {
      // For YouTube, try to fetch video info from oembed
      let title = guessTitleFromUrl(trackUrl)
      let artist = "Unknown Artist"
      let duration = 0

      if (parsed.source === "youtube" && parsed.videoId) {
        try {
          const res = await fetch(
            `https://noembed.com/embed?url=${encodeURIComponent(parsed.sourceUrl)}`
          )
          if (res.ok) {
            const data = await res.json()
            if (data.title) {
              // Try to split "Artist - Title" format
              const parts = data.title.split(" - ")
              if (parts.length >= 2) {
                artist = parts[0].trim()
                title = parts.slice(1).join(" - ").trim()
              } else {
                title = data.title
                artist = data.author_name || "Unknown Artist"
              }
            }
          }
        } catch {
          // noembed failed, use fallback
        }
      }

      if (parsed.source === "soundcloud") {
        try {
          const res = await fetch(
            `https://noembed.com/embed?url=${encodeURIComponent(parsed.sourceUrl)}`
          )
          if (res.ok) {
            const data = await res.json()
            if (data.title) {
              const parts = data.title.split(" - ")
              if (parts.length >= 2) {
                artist = parts[0].trim()
                title = parts.slice(1).join(" - ").trim()
              } else {
                title = data.title
                artist = data.author_name || "Unknown Artist"
              }
            }
          }
        } catch {
          // fallback
        }
      }

      if (onSubmitTrack) {
        onSubmitTrack({
          title,
          artist,
          duration,
          source: parsed.source,
          sourceUrl: parsed.sourceUrl,
        })
      }

      setTrackUrl("")
    } catch (err: any) {
      setError(err.message || "Failed to add track")
    } finally {
      setLoading(false)
    }
  }, [trackUrl, onSubmitTrack])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleAddTrack()
      }
    },
    [handleAddTrack]
  )

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Up Next
        </h3>
        <span
          className="rounded-full px-2 py-0.5 font-sans text-[10px] font-medium"
          style={{
            background: "oklch(0.72 0.18 250 / 0.15)",
            color: "oklch(0.72 0.18 250)",
          }}
        >
          {tracks.length} track{tracks.length !== 1 ? "s" : ""}
        </span>
      </div>

      <ScrollArea className="flex-1 max-h-64 pr-2">
        <AnimatePresence mode="popLayout">
          {tracks.map((track, index) => {
            const SourceIcon = sourceIcons[track.source] || FileAudio
            return (
              <motion.div
                key={track.id}
                layout
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25, delay: index * 0.05 }}
                className="group mb-2 flex items-center gap-3 rounded-xl p-3 transition-all hover:scale-[1.01]"
                style={{
                  background: index === 0
                    ? "linear-gradient(135deg, oklch(0.18 0.02 280 / 0.8), oklch(0.15 0.015 280 / 0.6))"
                    : "oklch(0.14 0.01 280 / 0.5)",
                  border: index === 0
                    ? "1px solid oklch(0.72 0.18 250 / 0.25)"
                    : "1px solid oklch(0.25 0.015 280 / 0.3)",
                  backdropFilter: "blur(8px)",
                }}
              >
                {isDJ && (
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50 cursor-grab" />
                )}

                {/* Position badge */}
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-sans text-[10px] font-bold"
                  style={{
                    background: index === 0 ? "oklch(0.72 0.18 250)" : "oklch(0.25 0.02 280)",
                    color: index === 0 ? "oklch(0.12 0.02 280)" : "oklch(0.55 0.02 280)",
                  }}
                >
                  {index + 1}
                </span>

                {/* Album art placeholder */}
                <div
                  className="h-10 w-10 shrink-0 rounded-lg shadow-md"
                  style={{ background: track.albumGradient }}
                />

                {/* Track info */}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-sans text-sm font-medium text-foreground">
                    {track.title}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-sans text-xs text-muted-foreground">
                      {track.artist}
                    </span>
                    {track.submittedBy && (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <span
                          className="truncate font-sans text-[10px]"
                          style={{ color: "oklch(0.65 0.12 250)" }}
                        >
                          {track.submittedBy}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Meta + Save */}
                <div className="flex shrink-0 items-center gap-1.5">
                  <SaveTrackMenu track={track} size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  <SourceIcon className="h-3.5 w-3.5 text-muted-foreground/40" />
                  {track.duration > 0 && (
                    <span className="font-mono text-[10px] text-muted-foreground/60">
                      {formatDuration(track.duration)}
                    </span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {tracks.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8">
            <Music className="h-8 w-8 text-muted-foreground/30" />
            <p className="font-sans text-sm text-muted-foreground">
              Queue is empty
            </p>
          </div>
        )}
      </ScrollArea>

      {/* Add track input — only for listeners (DJ adds from DJ Controls) */}
      {canAdd && !isDJ && (
        <div className="border-t border-border/30 pt-3">
          {error && (
            <div className="mb-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs" style={{ background: "oklch(0.30 0.12 25 / 0.3)", border: "1px solid oklch(0.50 0.18 25 / 0.4)", color: "oklch(0.75 0.12 25)" }}>
              <AlertCircle className="h-3 w-3 shrink-0" />
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={trackUrl}
              onChange={(e) => { setTrackUrl(e.target.value); setError("") }}
              onKeyDown={handleKeyDown}
              placeholder="Paste YouTube, SoundCloud, or MP3 URL..."
              className="flex-1 rounded-full border-border/30 bg-muted/30 font-sans text-sm text-foreground placeholder:text-muted-foreground"
              disabled={loading}
            />
            <Button
              size="icon"
              onClick={handleAddTrack}
              disabled={!trackUrl.trim() || loading}
              className="h-9 w-9 shrink-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30"
              aria-label="Add track to queue"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
          <p className="mt-1.5 text-center font-sans text-[10px] text-muted-foreground/60">
            {isDJ ? "Paste a track link to add it to the queue" : requestPolicy === "approval" ? "Submit a request — the DJ will approve or skip it" : "Paste a track link to request it"}
          </p>
        </div>
      )}

      {!canAdd && (
        <div className="border-t border-border/30 pt-3 text-center">
          <p className="font-sans text-xs text-muted-foreground">
            Requests are closed for this room
          </p>
        </div>
      )}
    </div>
  )
}
