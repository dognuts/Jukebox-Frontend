"use client"

import { useState, useCallback } from "react"
import {
  Heart,
  ListMusic,
  Music,
  MoreHorizontal,
  Pencil,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react"
import { usePlaylist, type Playlist } from "@/lib/playlist-context"
import { type Track, formatDuration } from "@/lib/mock-data"

export function PlaylistsSection() {
  const { playlists, createPlaylist, renamePlaylist, deletePlaylist, removeTrack } =
    usePlaylist()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")

  const handleCreate = useCallback(() => {
    const trimmed = newName.trim()
    if (!trimmed) return
    const pl = createPlaylist(trimmed)
    setNewName("")
    setCreating(false)
    setExpandedId(pl.id)
  }, [newName, createPlaylist])

  const handleRename = useCallback(
    (id: string) => {
      const trimmed = editName.trim()
      if (!trimmed) return
      renamePlaylist(id, trimmed)
      setEditingId(null)
      setEditName("")
    },
    [editName, renamePlaylist]
  )

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const totalTracks = playlists.reduce((acc, pl) => acc + pl.tracks.length, 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-sans text-lg font-semibold text-foreground">
            <ListMusic className="h-5 w-5 text-accent" />
            My Playlists
          </h3>
          <p className="mt-1 font-sans text-xs text-muted-foreground">
            {playlists.length} playlist{playlists.length !== 1 ? "s" : ""} &middot;{" "}
            {totalTracks} track{totalTracks !== 1 ? "s" : ""} saved
          </p>
        </div>
        <button
          onClick={() => {
            setCreating(true)
            setNewName("")
          }}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 font-sans text-xs font-medium transition-colors"
          style={{
            background: "oklch(0.20 0.04 85 / 0.3)",
            border: "1px solid oklch(0.40 0.10 85 / 0.3)",
            color: "oklch(0.75 0.15 85)",
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          New Playlist
        </button>
      </div>

      {/* Create new playlist inline */}
      {creating && (
        <div
          className="flex items-center gap-3 rounded-xl p-4"
          style={{
            background: "oklch(0.15 0.02 280 / 0.5)",
            border: "1px solid oklch(0.30 0.08 85 / 0.4)",
          }}
        >
          <ListMusic className="h-5 w-5 shrink-0" style={{ color: "oklch(0.65 0.15 85)" }} />
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate()
              if (e.key === "Escape") setCreating(false)
            }}
            placeholder="Playlist name..."
            className="flex-1 bg-transparent font-sans text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="rounded-lg px-3 py-1.5 font-sans text-xs font-medium transition-colors disabled:opacity-30"
            style={{
              background: "oklch(0.75 0.15 85 / 0.2)",
              color: "oklch(0.75 0.15 85)",
            }}
          >
            Create
          </button>
          <button
            onClick={() => setCreating(false)}
            className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Playlist cards */}
      <div className="flex flex-col gap-3">
        {playlists.map((pl) => {
          const isLiked = pl.id === "liked-tracks"
          const isExpanded = expandedId === pl.id
          const isEditing = editingId === pl.id

          return (
            <div
              key={pl.id}
              className="rounded-xl border transition-colors"
              style={{
                background: "oklch(0.13 0.01 280 / 0.3)",
                borderColor: isExpanded
                  ? "oklch(0.35 0.06 85 / 0.4)"
                  : "oklch(0.22 0.01 280 / 0.5)",
              }}
            >
              {/* Playlist header */}
              <button
                onClick={() => toggleExpand(pl.id)}
                className="flex w-full items-center gap-4 p-4 text-left"
              >
                {/* Icon */}
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: isLiked
                      ? "oklch(0.20 0.08 15 / 0.4)"
                      : "oklch(0.18 0.02 280)",
                    border: isLiked
                      ? "1px solid oklch(0.40 0.15 15 / 0.3)"
                      : "1px solid oklch(0.28 0.02 280 / 0.5)",
                  }}
                >
                  {isLiked ? (
                    <Heart
                      className="h-5 w-5"
                      style={{ color: "oklch(0.65 0.25 15)" }}
                      fill="oklch(0.65 0.25 15)"
                    />
                  ) : (
                    <ListMusic className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                {/* Name + count */}
                <div className="flex flex-1 flex-col min-w-0">
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        e.stopPropagation()
                        if (e.key === "Enter") handleRename(pl.id)
                        if (e.key === "Escape") setEditingId(null)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-transparent font-sans text-sm font-semibold text-foreground outline-none"
                      style={{ borderBottom: "1px solid oklch(0.50 0.15 85 / 0.5)" }}
                    />
                  ) : (
                    <span className="truncate font-sans text-sm font-semibold text-foreground">
                      {pl.name}
                    </span>
                  )}
                  <span className="font-sans text-xs text-muted-foreground">
                    {pl.tracks.length} track{pl.tracks.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {!isLiked && (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(pl.id)
                          setEditName(pl.name)
                        }}
                        className="rounded p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                        aria-label="Rename playlist"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deletePlaylist(pl.id)}
                        className="rounded p-1.5 transition-colors hover:text-foreground"
                        style={{ color: "oklch(0.55 0.15 15)" }}
                        aria-label="Delete playlist"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Expand chevron */}
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>

              {/* Expanded track list */}
              {isExpanded && (
                <div
                  className="border-t px-4 pb-4 pt-2"
                  style={{ borderColor: "oklch(0.22 0.01 280 / 0.5)" }}
                >
                  {pl.tracks.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-6">
                      <Music className="h-6 w-6 text-muted-foreground/30" />
                      <p className="font-sans text-sm text-muted-foreground">
                        No tracks saved yet
                      </p>
                      <p className="font-sans text-xs text-muted-foreground/60">
                        Save tracks from any jukebox using the heart or playlist icons
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 pt-2">
                      {pl.tracks.map((track, idx) => (
                        <TrackRow
                          key={track.id}
                          track={track}
                          index={idx}
                          onRemove={() => removeTrack(pl.id, track.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TrackRow({
  track,
  index,
  onRemove,
}: {
  track: Track
  index: number
  onRemove: () => void
}) {
  return (
    <div className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/20">
      <span className="w-5 shrink-0 text-center font-mono text-xs text-muted-foreground">
        {index + 1}
      </span>
      <div
        className="h-8 w-8 shrink-0 rounded-md"
        style={{ background: track.albumGradient }}
      />
      <div className="flex flex-1 flex-col min-w-0">
        <span className="truncate font-sans text-sm text-foreground">{track.title}</span>
        <span className="truncate font-sans text-xs text-muted-foreground">
          {track.artist}
        </span>
      </div>
      <span className="shrink-0 font-mono text-xs text-muted-foreground">
        {formatDuration(track.duration)}
      </span>
      <button
        onClick={onRemove}
        className="shrink-0 rounded p-1 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground hover:!text-foreground"
        aria-label={`Remove ${track.title} from playlist`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
