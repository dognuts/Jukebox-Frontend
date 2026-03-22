"use client"

import { useState, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Music, Youtube, Cloud, FileAudio, GripVertical, Plus, Loader2, AlertCircle, Clock, ListMusic, Download, Check } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { type Track, formatDuration } from "@/lib/mock-data"
import { SaveTrackMenu } from "./save-track-menu"
import { parseTrackUrl, guessTitleFromUrl } from "@/lib/track-utils"
import { authRequest } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

const sourceIcons = {
  youtube: Youtube,
  soundcloud: Cloud,
  mp3: FileAudio,
}

type QueueTab = "upcoming" | "previous"

interface TrackQueueProps {
  tracks: Track[]
  playedTracks?: Track[]
  isDJ: boolean
  roomSlug?: string
  roomName?: string
  djName?: string
  isAutoplay?: boolean
  requestPolicy?: "open" | "closed" | "approval"
  onSubmitTrack?: (track: { title: string; artist: string; duration: number; source: string; sourceUrl: string }) => void
}

export function TrackQueue({ tracks, playedTracks = [], isDJ, roomSlug, roomName, djName, isAutoplay, requestPolicy = "open", onSubmitTrack }: TrackQueueProps) {
  const [tab, setTab] = useState<QueueTab>("upcoming")
  const [trackUrl, setTrackUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const { isLoggedIn } = useAuth()

  const canAdd = !isAutoplay && (isDJ || requestPolicy === "open" || requestPolicy === "approval")

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
      let title = guessTitleFromUrl(trackUrl)
      let artist = "Unknown Artist"
      let duration = 0

      if (parsed.source === "youtube" && parsed.videoId) {
        try {
          const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(parsed.sourceUrl)}`)
          if (res.ok) {
            const data = await res.json()
            if (data.title) {
              const parts = data.title.split(" - ")
              if (parts.length >= 2) { artist = parts[0].trim(); title = parts.slice(1).join(" - ").trim() }
              else { title = data.title; artist = data.author_name || "Unknown Artist" }
            }
          }
        } catch {}
      }

      if (parsed.source === "soundcloud") {
        try {
          const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(parsed.sourceUrl)}`)
          if (res.ok) {
            const data = await res.json()
            if (data.title) {
              const parts = data.title.split(" - ")
              if (parts.length >= 2) { artist = parts[0].trim(); title = parts.slice(1).join(" - ").trim() }
              else { title = data.title; artist = data.author_name || "Unknown Artist" }
            }
          }
        } catch {}
      }

      onSubmitTrack?.({ title, artist, duration, source: parsed.source, sourceUrl: parsed.sourceUrl })
      setTrackUrl("")
    } catch (err: any) {
      setError(err.message || "Failed to add track")
    } finally {
      setLoading(false)
    }
  }, [trackUrl, onSubmitTrack])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddTrack() }
  }, [handleAddTrack])

  const handleSaveSession = useCallback(async () => {
    if (!roomSlug || saving) return
    setSaving(true)
    try {
      await authRequest(`/api/rooms/${roomSlug}/save-session`, { method: "POST" })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      alert("Failed to save session. Are you logged in?")
    } finally {
      setSaving(false)
    }
  }, [roomSlug, saving])

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: "oklch(0.14 0.01 280 / 0.5)" }}>
        <button
          onClick={() => setTab("upcoming")}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 font-sans text-xs font-semibold transition-all"
          style={{
            background: tab === "upcoming" ? "oklch(0.20 0.02 280)" : "transparent",
            color: tab === "upcoming" ? "oklch(0.72 0.18 250)" : "oklch(0.55 0.02 280)",
            border: tab === "upcoming" ? "1px solid oklch(0.72 0.18 250 / 0.2)" : "1px solid transparent",
          }}
        >
          <ListMusic className="h-3 w-3" />
          Up Next
          {tracks.length > 0 && (
            <span className="rounded-full px-1.5 py-0.5 font-mono text-[9px]"
              style={{ background: "oklch(0.72 0.18 250 / 0.15)", color: "oklch(0.72 0.18 250)" }}>
              {tracks.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("previous")}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 font-sans text-xs font-semibold transition-all"
          style={{
            background: tab === "previous" ? "oklch(0.20 0.02 280)" : "transparent",
            color: tab === "previous" ? "oklch(0.82 0.18 80)" : "oklch(0.55 0.02 280)",
            border: tab === "previous" ? "1px solid oklch(0.82 0.18 80 / 0.2)" : "1px solid transparent",
          }}
        >
          <Clock className="h-3 w-3" />
          Previous
          {playedTracks.length > 0 && (
            <span className="rounded-full px-1.5 py-0.5 font-mono text-[9px]"
              style={{ background: "oklch(0.82 0.18 80 / 0.12)", color: "oklch(0.82 0.18 80)" }}>
              {playedTracks.length}
            </span>
          )}
        </button>
      </div>

      {/* Up Next tab */}
      {tab === "upcoming" && (
        <>
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
                    }}
                  >
                    {isDJ && <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50 cursor-grab" />}
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-sans text-[10px] font-bold"
                      style={{
                        background: index === 0 ? "oklch(0.72 0.18 250)" : "oklch(0.25 0.02 280)",
                        color: index === 0 ? "oklch(0.12 0.02 280)" : "oklch(0.55 0.02 280)",
                      }}>
                      {index + 1}
                    </span>
                    <div className="h-10 w-10 shrink-0 rounded-lg shadow-md" style={{ background: track.albumGradient }} />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate font-sans text-sm font-medium text-foreground">{track.title}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-sans text-xs text-muted-foreground">{track.artist}</span>
                        {track.submittedBy && (
                          <>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="truncate font-sans text-[10px]" style={{ color: "oklch(0.65 0.12 250)" }}>{track.submittedBy}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <SaveTrackMenu track={track} size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      <SourceIcon className="h-3.5 w-3.5 text-muted-foreground/40" />
                      {track.duration > 0 && <span className="font-mono text-[10px] text-muted-foreground/60">{formatDuration(track.duration)}</span>}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
            {tracks.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8">
                <Music className="h-8 w-8 text-muted-foreground/30" />
                <p className="font-sans text-sm text-muted-foreground">Queue is empty</p>
              </div>
            )}
          </ScrollArea>

          {canAdd && !isDJ && (
            <div className="border-t border-border/30 pt-3">
              {error && (
                <div className="mb-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs"
                  style={{ background: "oklch(0.30 0.12 25 / 0.3)", border: "1px solid oklch(0.50 0.18 25 / 0.4)", color: "oklch(0.75 0.12 25)" }}>
                  <AlertCircle className="h-3 w-3 shrink-0" />{error}
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
                <Button size="icon" onClick={handleAddTrack} disabled={!trackUrl.trim() || loading}
                  className="h-9 w-9 shrink-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
              <p className="mt-1.5 text-center font-sans text-[10px] text-muted-foreground/60">
                {requestPolicy === "approval" ? "Submit a request — the DJ will approve or skip it" : "Paste a track link to request it"}
              </p>
            </div>
          )}
          {!canAdd && (
            <div className="border-t border-border/30 pt-3 text-center">
              <p className="font-sans text-xs text-muted-foreground">Requests are closed for this room</p>
            </div>
          )}
        </>
      )}

      {/* Previous tab */}
      {tab === "previous" && (
        <>
          {/* Save Session button */}
          {!isDJ && isLoggedIn && (playedTracks.length > 0 || tracks.length > 0) && (
            <button
              onClick={handleSaveSession}
              disabled={saving || saved}
              className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 font-sans text-xs font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
              style={{
                background: saved
                  ? "oklch(0.22 0.06 150 / 0.4)"
                  : "linear-gradient(135deg, oklch(0.18 0.03 80 / 0.6), oklch(0.15 0.02 280 / 0.6))",
                border: saved
                  ? "1px solid oklch(0.55 0.15 150 / 0.3)"
                  : "1px solid oklch(0.82 0.18 80 / 0.2)",
                color: saved ? "oklch(0.70 0.15 150)" : "oklch(0.82 0.18 80)",
              }}
            >
              {saved ? (
                <><Check className="h-3.5 w-3.5" /> Saved to your playlists!</>
              ) : saving ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</>
              ) : (
                <><Download className="h-3.5 w-3.5" /> Save Full Session as Playlist</>
              )}
            </button>
          )}

          <ScrollArea className="flex-1 max-h-64 pr-2">
            {playedTracks.map((track, index) => {
              const SourceIcon = sourceIcons[track.source] || FileAudio
              return (
                <div
                  key={`played-${track.id}-${index}`}
                  className="group mb-1 flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-all hover:bg-muted/10"
                  style={{
                    border: "1px solid oklch(0.22 0.01 280 / 0.3)",
                  }}
                >
                  {/* Small album art */}
                  <div
                    className="h-7 w-7 shrink-0 rounded-md"
                    style={{ background: track.albumGradient, opacity: 0.7 }}
                  />

                  {/* Track info — compact */}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-sans text-xs font-medium text-foreground/80">
                      {track.title}
                    </span>
                    <span className="truncate font-sans text-[10px] text-muted-foreground/60">
                      {track.artist}
                      {track.submittedBy && <> · {track.submittedBy}</>}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-1">
                    <SaveTrackMenu track={track} size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    <SourceIcon className="h-3 w-3 text-muted-foreground/30" />
                    {track.duration > 0 && (
                      <span className="font-mono text-[9px] text-muted-foreground/40">{formatDuration(track.duration)}</span>
                    )}
                  </div>
                </div>
              )
            })}

            {playedTracks.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8">
                <Clock className="h-8 w-8 text-muted-foreground/30" />
                <p className="font-sans text-sm text-muted-foreground">No tracks played yet</p>
                <p className="font-sans text-[10px] text-muted-foreground/60">Tracks will appear here after they finish playing</p>
              </div>
            )}
          </ScrollArea>
        </>
      )}
    </div>
  )
}
