"use client"

import { useState } from "react"
import { Heart, Plus, Check, ListMusic } from "lucide-react"
import { type Track } from "@/lib/mock-data"
import { usePlaylist } from "@/lib/playlist-context"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"

interface SaveTrackMenuProps {
  track: Track
  /** "icon" = just heart icon (compact), "button" = heart + label */
  variant?: "icon" | "button"
  /** optional classname for the trigger */
  className?: string
  /** size of the heart icon */
  size?: number
}

export function SaveTrackMenu({
  track,
  variant = "icon",
  className = "",
  size = 16,
}: SaveTrackMenuProps) {
  const {
    playlists,
    toggleLike,
    isLiked,
    addTrack,
    removeTrack,
    getPlaylistsForTrack,
    createPlaylist,
  } = usePlaylist()

  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const liked = isLiked(track.id)
  const trackPlaylists = getPlaylistsForTrack(track.id)

  const handleTogglePlaylist = (playlistId: string) => {
    if (trackPlaylists.includes(playlistId)) {
      removeTrack(playlistId, track.id)
    } else {
      addTrack(playlistId, track)
    }
  }

  const handleCreate = () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    const pl = createPlaylist(trimmed)
    addTrack(pl.id, track)
    setNewName("")
    setCreating(false)
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Quick-like heart */}
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          toggleLike(track)
        }}
        className="group/heart flex items-center justify-center rounded-full p-1.5 transition-colors"
        style={{
          color: liked ? "oklch(0.65 0.25 15)" : "oklch(0.55 0.02 280)",
        }}
        aria-label={liked ? "Unlike track" : "Like track"}
      >
        <Heart
          className="transition-transform group-hover/heart:scale-110"
          style={{ width: size, height: size }}
          fill={liked ? "currentColor" : "none"}
          strokeWidth={liked ? 0 : 2}
        />
      </button>

      {/* Dropdown to add to playlists */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            className="flex items-center justify-center rounded-full p-1.5 transition-colors"
            style={{ color: "oklch(0.55 0.02 280)" }}
            aria-label="Add to playlist"
          >
            {variant === "button" ? (
              <span className="flex items-center gap-1.5 font-sans text-xs font-medium" style={{ color: "oklch(0.55 0.02 280)" }}>
                <ListMusic style={{ width: size, height: size }} />
                Save
              </span>
            ) : (
              <ListMusic
                className="transition-transform hover:scale-110"
                style={{ width: size, height: size }}
              />
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-56"
          style={{
            background: "oklch(0.14 0.015 280)",
            borderColor: "oklch(0.25 0.02 280 / 0.6)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenuLabel
            className="font-sans text-xs font-semibold"
            style={{ color: "oklch(0.55 0.02 280)" }}
          >
            Add to playlist
          </DropdownMenuLabel>
          <DropdownMenuSeparator style={{ background: "oklch(0.22 0.015 280)" }} />

          {playlists.map((pl) => (
            <DropdownMenuCheckboxItem
              key={pl.id}
              checked={trackPlaylists.includes(pl.id)}
              onCheckedChange={() => handleTogglePlaylist(pl.id)}
              className="cursor-pointer font-sans text-sm"
              style={{ color: "oklch(0.75 0.02 280)" }}
            >
              <span className="flex items-center gap-2 truncate">
                {pl.id === "liked-tracks" && (
                  <Heart className="h-3.5 w-3.5 shrink-0" style={{ color: "oklch(0.65 0.25 15)" }} />
                )}
                <span className="truncate">{pl.name}</span>
                <span className="ml-auto shrink-0 font-mono text-[10px]" style={{ color: "oklch(0.45 0.02 280)" }}>
                  {pl.tracks.length}
                </span>
              </span>
            </DropdownMenuCheckboxItem>
          ))}

          <DropdownMenuSeparator style={{ background: "oklch(0.22 0.015 280)" }} />

          {creating ? (
            <div className="flex items-center gap-2 px-2 py-1.5">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate()
                  if (e.key === "Escape") setCreating(false)
                }}
                placeholder="Playlist name..."
                className="flex-1 rounded px-2 py-1 font-sans text-xs outline-none"
                style={{
                  background: "oklch(0.18 0.01 280)",
                  border: "1px solid oklch(0.30 0.02 280 / 0.5)",
                  color: "oklch(0.85 0.02 280)",
                }}
              />
              <button
                onClick={handleCreate}
                className="rounded p-1 transition-colors"
                style={{ color: "oklch(0.75 0.15 85)" }}
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault()
                setCreating(true)
              }}
              className="cursor-pointer font-sans text-sm"
              style={{ color: "oklch(0.65 0.15 85)" }}
            >
              <Plus className="h-4 w-4" />
              New Playlist
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
