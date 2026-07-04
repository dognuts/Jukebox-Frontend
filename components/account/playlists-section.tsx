"use client"

import { useState, useCallback } from "react"
import {
  Heart,
  ListMusic,
  Music,
  Pencil,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  Send,
  Check,
  Loader2,
} from "lucide-react"
import { usePlaylist, type Playlist } from "@/lib/playlist-context"
import { type Track, formatDuration } from "@/components/discover/types"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

export function PlaylistsSection() {
  const { playlists, createPlaylist, renamePlaylist, deletePlaylist, removeTrack, loading } =
    usePlaylist()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")

  const handleCreate = useCallback(async () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    const pl = await createPlaylist(trimmed)
    setNewName("")
    setCreating(false)
    if (pl) setExpandedId(pl.id)
  }, [newName, createPlaylist])

  const handleRename = useCallback(
    async (id: string) => {
      const trimmed = editName.trim()
      if (!trimmed) return
      await renamePlaylist(id, trimmed)
      setEditingId(null)
      setEditName("")
    },
    [editName, renamePlaylist]
  )

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const totalTracks = playlists.reduce((acc, pl) => acc + pl.tracks.length, 0)

  if (loading && playlists.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-text-low" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="type-h2 flex items-center gap-2 font-sans text-ink-foreground">
            <ListMusic className="h-5 w-5 text-brand-amber" />
            My Playlists
          </h3>
          <p className="mt-1 font-sans text-xs text-text-mid">
            {playlists.length} playlist{playlists.length !== 1 ? "s" : ""} &middot;{" "}
            {totalTracks} track{totalTracks !== 1 ? "s" : ""} saved
          </p>
        </div>
        <button
          onClick={() => {
            setCreating(true)
            setNewName("")
          }}
          className="flex items-center gap-1.5 rounded-lg border-[0.5px] border-brand-amber/25 bg-brand-amber/10 px-3 py-2 font-sans text-xs font-medium text-brand-amber transition-colors hover:bg-brand-amber/15"
        >
          <Plus className="h-3.5 w-3.5" />
          New Playlist
        </button>
      </div>

      {/* Create new playlist inline */}
      {creating && (
        <div className="flex items-center gap-3 rounded-xl border-[0.5px] border-brand-amber/25 bg-white/[0.02] p-4">
          <ListMusic className="h-5 w-5 shrink-0 text-brand-amber" />
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate()
              if (e.key === "Escape") setCreating(false)
            }}
            placeholder="Playlist name..."
            className="flex-1 bg-transparent font-sans text-sm text-text-hi outline-none placeholder:text-text-low"
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="rounded-lg bg-brand-amber/15 px-3 py-1.5 font-sans text-xs font-medium text-brand-amber transition-colors disabled:opacity-30"
          >
            Create
          </button>
          <button
            onClick={() => setCreating(false)}
            className="rounded p-1 text-text-low transition-colors hover:text-text-hi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Playlist cards */}
      <div className="flex flex-col gap-3">
        {playlists.map((pl) => {
          const isLiked = pl.isLiked
          const isExpanded = expandedId === pl.id
          const isEditing = editingId === pl.id

          return (
            <div
              key={pl.id}
              className={`rounded-xl border-[0.5px] bg-white/[0.02] transition-colors ${
                isExpanded ? "border-brand-amber/25" : "border-hairline"
              }`}
            >
              {/* Playlist header — div[role=button] so the nested rename/delete buttons and edit input stay valid DOM */}
              <div
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                onClick={() => toggleExpand(pl.id)}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    toggleExpand(pl.id)
                  }
                }}
                className="flex w-full cursor-pointer items-center gap-4 p-4 text-left"
              >
                {/* Icon */}
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-[0.5px] ${
                    isLiked
                      ? "border-destructive-foreground/30 bg-destructive/20"
                      : "border-hairline bg-white/[0.04]"
                  }`}
                >
                  {isLiked ? (
                    <Heart
                      className="h-5 w-5 text-destructive-foreground"
                      fill="currentColor"
                    />
                  ) : (
                    <ListMusic className="h-5 w-5 text-text-mid" />
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
                      className="border-b border-brand-amber/40 bg-transparent font-sans text-sm font-semibold text-text-hi outline-none"
                    />
                  ) : (
                    <span className="truncate font-sans text-sm font-semibold text-text-hi">
                      {pl.name}
                    </span>
                  )}
                  <span className="font-sans text-xs text-text-mid">
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
                        className="rounded p-1.5 text-text-low transition-colors hover:text-text-hi"
                        aria-label="Rename playlist"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deletePlaylist(pl.id)}
                        className="rounded p-1.5 text-destructive-foreground/70 transition-colors hover:text-destructive-foreground"
                        aria-label="Delete playlist"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Expand chevron */}
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-text-low" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-text-low" />
                )}
              </div>

              {/* Expanded track list */}
              {isExpanded && (
                <div className="border-t-[0.5px] border-hairline px-4 pb-4 pt-2">
                  {pl.tracks.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-6">
                      <Music className="h-6 w-6 text-text-low" />
                      <p className="font-sans text-sm text-text-mid">
                        No tracks saved yet
                      </p>
                      <p className="font-sans text-xs text-text-low">
                        Save tracks from any jukebox using the heart or playlist icons
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 pt-2">
                      {pl.tracks.map((track, idx) => (
                        <TrackRow
                          key={track.id + "-" + idx}
                          track={track}
                          index={idx}
                          playlistId={pl.id}
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

// ---------- Track Row ----------

function TrackRow({
  track,
  index,
  playlistId,
  onRemove,
}: {
  track: Track
  index: number
  playlistId: string
  onRemove: () => void
}) {
  const { playlists, addTrack, createPlaylist } = usePlaylist()
  const [creatingNew, setCreatingNew] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState("")

  // Filter out the current playlist for the "Send to" menu
  const otherPlaylists = playlists.filter((p) => p.id !== playlistId && !p.isLiked)

  const handleSendTo = async (targetId: string) => {
    const target = playlists.find((p) => p.id === targetId)
    await addTrack(targetId, track)
    toast.success(`Sent to "${target?.name || "playlist"}"`)
  }

  const handleCreateAndSend = async () => {
    const trimmed = newPlaylistName.trim()
    if (!trimmed) return
    const pl = await createPlaylist(trimmed)
    if (pl) {
      await addTrack(pl.id, track)
      toast.success(`Sent to "${trimmed}"`)
    }
    setNewPlaylistName("")
    setCreatingNew(false)
  }

  // Build the source link label
  const sourceLabel =
    track.source === "youtube" ? "YouTube" :
    track.source === "soundcloud" ? "SoundCloud" : "MP3"

  return (
    <div className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.04]">
      <span className="w-5 shrink-0 text-center font-mono text-xs text-text-low">
        {index + 1}
      </span>
      <div
        className="h-8 w-8 shrink-0 rounded-md"
        style={{ background: track.albumGradient }}
      />
      <div className="flex flex-1 flex-col min-w-0">
        <span className="truncate font-sans text-sm text-text-hi">{track.title}</span>
        <div className="flex items-center gap-2">
          <span className="truncate font-sans text-xs text-text-mid">
            {track.artist}
          </span>
          {track.sourceUrl && track.sourceUrl !== "#" && (
            <a
              href={track.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-0.5 shrink-0 font-sans text-[10px] font-medium text-text-mid transition-colors hover:text-text-hi hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-2.5 w-2.5" />
              {sourceLabel}
            </a>
          )}
        </div>
      </div>

      <span className="shrink-0 font-mono text-xs text-text-low">
        {formatDuration(track.duration)}
      </span>

      {/* Send to tracklist dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="shrink-0 rounded p-1.5 text-transparent transition-colors group-hover:text-text-low hover:!text-text-hi"
            aria-label="Send to tracklist"
            onClick={(e) => e.stopPropagation()}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-56 border-[0.5px] border-hairline bg-popover"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenuLabel className="font-sans text-xs font-semibold text-text-low">
            Send to tracklist
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-hairline" />

          {otherPlaylists.length === 0 && !creatingNew && (
            <div className="px-2 py-2 font-sans text-xs text-text-mid">
              No other tracklists yet
            </div>
          )}

          {otherPlaylists.map((pl) => (
            <DropdownMenuItem
              key={pl.id}
              onSelect={() => handleSendTo(pl.id)}
              className="cursor-pointer font-sans text-sm text-text-mid"
            >
              <ListMusic className="h-3.5 w-3.5 shrink-0 text-text-low" />
              <span className="truncate">{pl.name}</span>
              <span className="ml-auto shrink-0 font-mono text-[10px] text-text-low">
                {pl.tracks.length}
              </span>
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator className="bg-hairline" />

          {creatingNew ? (
            <div className="flex items-center gap-2 px-2 py-1.5">
              <input
                autoFocus
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateAndSend()
                  if (e.key === "Escape") setCreatingNew(false)
                }}
                placeholder="New tracklist name..."
                className="flex-1 rounded border-[0.5px] border-hairline-strong bg-white/[0.04] px-2 py-1 font-sans text-xs text-text-hi outline-none placeholder:text-text-low"
              />
              <button
                onClick={handleCreateAndSend}
                className="rounded p-1 text-brand-amber transition-colors hover:text-brand-amber/80"
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault()
                setCreatingNew(true)
              }}
              className="cursor-pointer font-sans text-sm text-brand-amber"
            >
              <Plus className="h-4 w-4" />
              New Tracklist
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="shrink-0 rounded p-1 text-transparent transition-colors group-hover:text-text-low hover:!text-text-hi"
        aria-label={`Remove ${track.title} from playlist`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
