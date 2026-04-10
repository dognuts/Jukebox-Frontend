"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Shield, ArrowLeft, ChevronRight, Radio, Plus, Trash2, Play, Pause,
  GripVertical, Loader2, Check, RotateCcw, Zap, Music, ArrowUp, ArrowDown,
  Upload, X, Pencil,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/layout/navbar"
import { useAuth } from "@/lib/auth-context"
import { authRequest } from "@/lib/api"

interface AutoplayTrack {
  title: string
  artist: string
  duration: number
  source: string
  sourceUrl: string
  albumGradient?: string
  infoSnippet?: string
}

interface AutoplayPlaylist {
  id: string
  roomId: string
  status: string
  name: string
  tracks: AutoplayTrack[]
  currentIndex: number
  createdAt: string
  activatedAt?: string
}

interface AutoplayRoom {
  id: string
  slug: string
  name: string
  genre: string
  isLive: boolean
  isAutoplay: boolean
  coverArt?: string
  coverGradient?: string
}

const GRADIENT_PRESETS = [
  { name: "Midnight", value: "linear-gradient(135deg, oklch(0.18 0.08 280), oklch(0.12 0.04 320))" },
  { name: "Sunset", value: "linear-gradient(135deg, oklch(0.35 0.18 30), oklch(0.20 0.12 350))" },
  { name: "Ocean", value: "linear-gradient(135deg, oklch(0.22 0.10 230), oklch(0.15 0.08 200))" },
  { name: "Forest", value: "linear-gradient(135deg, oklch(0.25 0.10 150), oklch(0.15 0.06 130))" },
  { name: "Amber", value: "linear-gradient(135deg, oklch(0.35 0.15 80), oklch(0.20 0.10 60))" },
  { name: "Neon", value: "linear-gradient(135deg, oklch(0.30 0.18 350), oklch(0.18 0.12 280))" },
  { name: "Lavender", value: "linear-gradient(135deg, oklch(0.28 0.12 300), oklch(0.16 0.08 270))" },
  { name: "Ember", value: "linear-gradient(135deg, oklch(0.30 0.16 25), oklch(0.18 0.10 10))" },
]

export default function AdminAutoplayPage() {
  const { user, isLoggedIn } = useAuth()
  const isAdmin = isLoggedIn && user?.isAdmin

  const [rooms, setRooms] = useState<AutoplayRoom[]>([])
  const [selectedRoom, setSelectedRoom] = useState<AutoplayRoom | null>(null)
  const [playlists, setPlaylists] = useState<AutoplayPlaylist[]>([])
  const [loading, setLoading] = useState(false)

  // Create room form
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [newGenre, setNewGenre] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [newGradient, setNewGradient] = useState("")
  const [creating, setCreating] = useState(false)

  // Edit room (cover photo + gradient)
  const [showEditCover, setShowEditCover] = useState(false)
  const [editCoverArt, setEditCoverArt] = useState<string | null>(null)
  const [editGradient, setEditGradient] = useState<string>("")
  const [savingCover, setSavingCover] = useState(false)
  const [coverDragOver, setCoverDragOver] = useState(false)

  // Staged playlist editor
  const [stagedName, setStagedName] = useState("")
  const [stagedTracks, setStagedTracks] = useState<AutoplayTrack[]>([])
  const [trackUrl, setTrackUrl] = useState("")
  const [addingTrack, setAddingTrack] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activating, setActivating] = useState(false)

  // Load autoplay rooms
  const loadRooms = useCallback(async () => {
    try {
      const data = await authRequest<AutoplayRoom[]>("/api/admin/rooms")
      setRooms((data || []).filter((r: any) => r.isAutoplay))
    } catch { setRooms([]) }
  }, [])

  useEffect(() => {
    if (isAdmin) loadRooms()
  }, [isAdmin, loadRooms])

  // Load playlists for selected room
  const loadPlaylists = useCallback(async (roomId: string) => {
    try {
      const data = await authRequest<AutoplayPlaylist[]>(`/api/admin/autoplay/rooms/${roomId}/playlists`)
      setPlaylists(data || [])
      const staged = (data || []).find((p) => p.status === "staged")
      if (staged) {
        setStagedName(staged.name)
        setStagedTracks(staged.tracks || [])
      } else {
        setStagedName("")
        setStagedTracks([])
      }
    } catch { setPlaylists([]) }
  }, [])

  const selectRoom = (room: AutoplayRoom) => {
    setSelectedRoom(room)
    setShowEditCover(false)
    setEditCoverArt(room.coverArt || null)
    setEditGradient(room.coverGradient || "")
    loadPlaylists(room.id)
  }

  // Cover art upload (reused pattern from /create page)
  const handleCoverFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be 5MB or smaller")
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => setEditCoverArt(e.target?.result as string)
    reader.readAsDataURL(file)
  }, [])

  const handleCoverDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setCoverDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleCoverFile(file)
  }, [handleCoverFile])

  const handleSaveCover = async () => {
    if (!selectedRoom) return
    setSavingCover(true)
    try {
      const payload = JSON.stringify({
        coverArt: editCoverArt ?? "",
        coverGradient: editGradient,
      })
      // Log payload size so we can diagnose body-size issues
      console.log(`[admin/autoplay] PATCH cover: ${(payload.length / 1024 / 1024).toFixed(2)} MB`)
      const updated = await authRequest<AutoplayRoom>(`/api/admin/rooms/${selectedRoom.id}`, {
        method: "PATCH",
        body: payload,
      })
      setRooms((prev) => prev.map((r) => r.id === selectedRoom.id
        ? { ...r, coverArt: updated?.coverArt ?? (editCoverArt ?? ""), coverGradient: updated?.coverGradient ?? editGradient }
        : r))
      setSelectedRoom((prev) => prev ? {
        ...prev,
        coverArt: updated?.coverArt ?? (editCoverArt ?? ""),
        coverGradient: updated?.coverGradient ?? editGradient,
      } : prev)
      setShowEditCover(false)
    } catch (err) {
      console.error("[admin/autoplay] save cover failed:", err)
      const msg = err instanceof Error ? err.message : String(err)
      alert(`Failed to update cover: ${msg}`)
    }
    setSavingCover(false)
  }

  // Create room
  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      await authRequest("/api/admin/autoplay/rooms", {
        method: "POST",
        body: JSON.stringify({ name: newName, genre: newGenre, description: newDesc, coverGradient: newGradient }),
      })
      setNewName(""); setNewGenre(""); setNewDesc(""); setNewGradient("")
      setShowCreate(false)
      await loadRooms()
    } catch { alert("Failed to create room") }
    setCreating(false)
  }

  // Add track by URL
  const handleAddTrack = async () => {
    if (!trackUrl.trim()) return
    setAddingTrack(true)
    try {
      // Try to resolve metadata via noembed
      let title = "Unknown Track"
      let artist = "Unknown Artist"
      let source = "youtube"
      const url = trackUrl.trim()

      if (url.includes("soundcloud.com")) source = "soundcloud"
      else if (!url.includes("youtube") && !url.includes("youtu.be")) source = "mp3"

      try {
        const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`)
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
      } catch {}

      setStagedTracks((prev) => [...prev, {
        title, artist, duration: 0, source, sourceUrl: url,
        albumGradient: `linear-gradient(135deg, oklch(${0.3 + Math.random() * 0.2} ${0.1 + Math.random() * 0.1} ${Math.floor(Math.random() * 360)}), oklch(${0.2 + Math.random() * 0.15} ${0.1 + Math.random() * 0.1} ${Math.floor(Math.random() * 360)}))`,
      }])
      setTrackUrl("")
    } catch {}
    setAddingTrack(false)
  }

  const removeTrack = (index: number) => {
    setStagedTracks((prev) => prev.filter((_, i) => i !== index))
  }

  const moveTrack = (index: number, direction: -1 | 1) => {
    setStagedTracks((prev) => {
      const next = [...prev]
      const newIdx = index + direction
      if (newIdx < 0 || newIdx >= next.length) return prev;
      [next[index], next[newIdx]] = [next[newIdx], next[index]]
      return next
    })
  }

  // Save staged playlist
  const handleSave = async () => {
    if (!selectedRoom) return
    setSaving(true)
    try {
      await authRequest(`/api/admin/autoplay/rooms/${selectedRoom.id}/staged`, {
        method: "PUT",
        body: JSON.stringify({ name: stagedName, tracks: stagedTracks }),
      })
      await loadPlaylists(selectedRoom.id)
    } catch { alert("Failed to save") }
    setSaving(false)
  }

  // Activate staged → live
  const handleActivate = async () => {
    if (!selectedRoom) return
    if (!confirm(`Activate this playlist? The current live playlist will be replaced and start playing immediately.`)) return
    setActivating(true)
    try {
      await authRequest(`/api/admin/autoplay/rooms/${selectedRoom.id}/activate`, { method: "POST" })
      await loadPlaylists(selectedRoom.id)
      await loadRooms()
    } catch { alert("Failed to activate — make sure you have a staged playlist saved.") }
    setActivating(false)
  }

  // Stop room
  const handleStop = async () => {
    if (!selectedRoom) return
    if (!confirm("Stop this autoplay room? Music will stop for all listeners.")) return
    try {
      await authRequest(`/api/admin/autoplay/rooms/${selectedRoom.id}/stop`, { method: "POST" })
      await loadRooms()
      setSelectedRoom((prev) => prev ? { ...prev, isLive: false } : null)
    } catch { alert("Failed to stop") }
  }

  const livePlaylist = playlists.find((p) => p.status === "live")
  const stagedPlaylist = playlists.find((p) => p.status === "staged")

  if (!isLoggedIn || !isAdmin) {
    return (
      <>
        <Navbar />
        <div className="flex flex-col items-center justify-center py-20">
          <Shield className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="font-sans text-lg font-semibold text-foreground">Admin Access Required</p>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 py-8 lg:px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-1 font-sans text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Admin
            </Link>
            <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5" style={{ color: "oklch(0.82 0.18 80)" }} />
              <h1 className="font-sans text-xl font-bold text-foreground">Autoplay Rooms</h1>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowCreate(!showCreate)} className="gap-1.5 rounded-xl">
            <Plus className="h-4 w-4" /> New Room
          </Button>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="mb-6 rounded-xl p-4" style={{ background: "oklch(0.14 0.015 280 / 0.6)", border: "1px solid oklch(0.25 0.02 280 / 0.4)" }}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Room name" className="rounded-lg bg-muted/20" />
              <Input value={newGenre} onChange={(e) => setNewGenre(e.target.value)} placeholder="Genre (e.g. Lo-fi)" className="rounded-lg bg-muted/20" />
              <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description" className="rounded-lg bg-muted/20" />
            </div>
            <div className="mt-3">
              <p className="font-sans text-[10px] text-muted-foreground mb-1.5">Cover gradient</p>
              <div className="flex flex-wrap gap-2">
                {GRADIENT_PRESETS.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => setNewGradient(g.value)}
                    className="h-8 w-16 rounded-lg transition-all"
                    style={{
                      background: g.value,
                      border: newGradient === g.value ? "2px solid oklch(0.82 0.18 80)" : "2px solid transparent",
                      boxShadow: newGradient === g.value ? "0 0 8px oklch(0.82 0.18 80 / 0.4)" : "none",
                    }}
                    title={g.name}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)} className="rounded-lg text-xs">Cancel</Button>
              <Button size="sm" onClick={handleCreate} disabled={creating || !newName.trim()} className="rounded-lg text-xs gap-1.5">
                {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Create
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-6">
          {/* Room list */}
          <div className={`w-64 shrink-0 ${selectedRoom ? "hidden lg:block" : ""}`}>
            {rooms.length === 0 ? (
              <p className="text-center py-8 font-sans text-sm text-muted-foreground">No autoplay rooms yet</p>
            ) : (
              <div className="space-y-1">
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => selectRoom(room)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted/15 ${
                      selectedRoom?.id === room.id ? "bg-muted/20 border border-border/40" : ""
                    }`}
                  >
                    <Radio className="h-4 w-4 shrink-0" style={{ color: room.isLive ? "oklch(0.65 0.20 150)" : "oklch(0.45 0.05 280)" }} />
                    <div className="min-w-0 flex-1">
                      <span className="truncate font-sans text-sm font-medium text-foreground block">{room.name}</span>
                      <span className="font-sans text-[10px] text-muted-foreground">{room.genre || "No genre"}</span>
                    </div>
                    {room.isLive && <span className="h-2 w-2 rounded-full shrink-0" style={{ background: "oklch(0.65 0.20 150)" }} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Playlist editor */}
          {selectedRoom && (
            <div className="flex-1">
              {/* Room header */}
              <div className="flex items-center justify-between mb-4 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button onClick={() => setSelectedRoom(null)} className="lg:hidden flex items-center gap-1 font-sans text-xs text-muted-foreground mb-2">
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                  </button>
                  {/* Cover thumbnail */}
                  <div
                    className="h-14 w-14 shrink-0 rounded-lg overflow-hidden relative"
                    style={{
                      background: selectedRoom.coverGradient || "oklch(0.25 0.05 280)",
                      backgroundImage: selectedRoom.coverArt ? `url(${selectedRoom.coverArt})` : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      border: "1px solid oklch(0.25 0.02 280 / 0.4)",
                    }}
                  />
                  <div className="min-w-0">
                    <h2 className="font-sans text-lg font-bold text-foreground truncate">{selectedRoom.name}</h2>
                    <p className="font-sans text-xs text-muted-foreground truncate">{selectedRoom.slug} · {selectedRoom.genre}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowEditCover((v) => !v)
                      setEditCoverArt(selectedRoom.coverArt || null)
                      setEditGradient(selectedRoom.coverGradient || "")
                    }}
                    className="gap-1.5 rounded-lg text-xs"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Cover
                  </Button>
                  {selectedRoom.isLive ? (
                    <Button size="sm" variant="ghost" onClick={handleStop} className="gap-1.5 rounded-lg text-xs" style={{ color: "oklch(0.60 0.20 25)" }}>
                      <Pause className="h-3.5 w-3.5" /> Stop
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-xs text-muted-foreground">Offline</Badge>
                  )}
                </div>
              </div>

              {/* Cover photo editor */}
              {showEditCover && (
                <div className="mb-4 rounded-xl p-4" style={{ background: "oklch(0.14 0.015 280 / 0.6)", border: "1px solid oklch(0.25 0.02 280 / 0.4)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-sans text-sm font-semibold text-foreground">Edit Cover</h3>
                    <button onClick={() => setShowEditCover(false)} className="p-1 rounded hover:bg-muted/20">
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-[auto,1fr]">
                    {/* Preview */}
                    <div
                      className="h-32 w-32 rounded-xl overflow-hidden relative mx-auto sm:mx-0"
                      style={{
                        background: editGradient || "oklch(0.25 0.05 280)",
                        backgroundImage: editCoverArt ? `url(${editCoverArt})` : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        border: "1px solid oklch(0.25 0.02 280 / 0.4)",
                      }}
                    >
                      {editCoverArt && (
                        <button
                          onClick={() => setEditCoverArt(null)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-black/60 hover:bg-black/80"
                          title="Remove image"
                        >
                          <X className="h-3 w-3 text-white" />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 min-w-0">
                      {/* Drag & drop upload */}
                      <label
                        onDragOver={(e) => { e.preventDefault(); setCoverDragOver(true) }}
                        onDragLeave={() => setCoverDragOver(false)}
                        onDrop={handleCoverDrop}
                        className={`flex items-center justify-center gap-2 rounded-lg px-4 py-3 cursor-pointer transition-colors border-2 border-dashed ${
                          coverDragOver ? "border-primary bg-primary/5" : "border-border/40 hover:border-border/60"
                        }`}
                      >
                        <Upload className="h-4 w-4 text-muted-foreground" />
                        <span className="font-sans text-xs text-muted-foreground">
                          {editCoverArt ? "Replace image" : "Drop image or click to upload (max 5MB)"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleCoverFile(file)
                          }}
                        />
                      </label>

                      {/* Gradient fallback */}
                      <div>
                        <p className="font-sans text-[10px] text-muted-foreground mb-1.5">Gradient (shown when no image)</p>
                        <div className="flex flex-wrap gap-2">
                          {GRADIENT_PRESETS.map((g) => (
                            <button
                              key={g.value}
                              onClick={() => setEditGradient(g.value)}
                              className="h-8 w-16 rounded-lg transition-all"
                              style={{
                                background: g.value,
                                border: editGradient === g.value ? "2px solid oklch(0.82 0.18 80)" : "2px solid transparent",
                                boxShadow: editGradient === g.value ? "0 0 8px oklch(0.82 0.18 80 / 0.4)" : "none",
                              }}
                              title={g.name}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-4">
                    <Button size="sm" variant="ghost" onClick={() => setShowEditCover(false)} className="rounded-lg text-xs">Cancel</Button>
                    <Button size="sm" onClick={handleSaveCover} disabled={savingCover} className="rounded-lg text-xs gap-1.5">
                      {savingCover ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Save Cover
                    </Button>
                  </div>
                </div>
              )}

              {/* Live playlist status */}
              {livePlaylist && (
                <div className="mb-4 rounded-xl p-3" style={{ background: "oklch(0.16 0.04 150 / 0.2)", border: "1px solid oklch(0.55 0.15 150 / 0.3)" }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Play className="h-3.5 w-3.5" style={{ color: "oklch(0.65 0.18 150)" }} />
                      <span className="font-sans text-xs font-semibold" style={{ color: "oklch(0.65 0.18 150)" }}>
                        LIVE: {livePlaylist.name || "Untitled"}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {livePlaylist.tracks.length} tracks · Position {livePlaylist.currentIndex + 1}/{livePlaylist.tracks.length}
                    </span>
                  </div>
                </div>
              )}

              {/* Staged playlist editor */}
              <div className="rounded-xl p-4" style={{ background: "oklch(0.13 0.015 280 / 0.6)", border: "1px solid oklch(0.25 0.02 280 / 0.4)" }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-sans text-sm font-semibold text-foreground">
                    {stagedPlaylist ? "Edit Staged Playlist" : "Build Next Playlist"}
                  </h3>
                  <span className="font-mono text-[10px] text-muted-foreground">{stagedTracks.length} tracks</span>
                </div>

                {/* Playlist name */}
                <Input
                  value={stagedName}
                  onChange={(e) => setStagedName(e.target.value)}
                  placeholder="Playlist name (e.g. Week of Mar 24)"
                  className="mb-3 rounded-lg bg-muted/20 text-sm"
                />

                {/* Add track */}
                <div className="flex gap-2 mb-3">
                  <Input
                    value={trackUrl}
                    onChange={(e) => setTrackUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddTrack()}
                    placeholder="Paste YouTube, SoundCloud, or audio URL..."
                    className="flex-1 rounded-lg bg-muted/20 text-sm"
                    disabled={addingTrack}
                  />
                  <Button size="sm" onClick={handleAddTrack} disabled={addingTrack || !trackUrl.trim()} className="rounded-lg gap-1.5">
                    {addingTrack ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Add
                  </Button>
                </div>

                {/* Track list */}
                <div className="space-y-1 mb-4 max-h-96 overflow-y-auto">
                  {stagedTracks.length === 0 ? (
                    <p className="py-6 text-center font-sans text-xs text-muted-foreground">
                      No tracks yet — paste URLs above to build your playlist
                    </p>
                  ) : (
                    stagedTracks.map((track, i) => (
                      <div key={i} className="rounded-lg px-2 py-1.5 group hover:bg-muted/10">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-muted-foreground/50 w-5 text-right">{i + 1}</span>
                          <div
                            className="h-7 w-7 shrink-0 rounded-md"
                            style={{ background: track.albumGradient || "oklch(0.25 0.05 280)" }}
                          />
                          <div className="flex-1 min-w-0">
                            <input
                              className="truncate font-sans text-xs font-medium text-foreground bg-transparent w-full outline-none focus:bg-muted/20 rounded px-1 -ml-1"
                              value={track.title}
                              onChange={(e) => setStagedTracks((prev) => prev.map((t, j) => j === i ? { ...t, title: e.target.value } : t))}
                            />
                            <input
                              className="truncate font-sans text-[10px] text-muted-foreground bg-transparent w-full outline-none focus:bg-muted/20 rounded px-1 -ml-1"
                              value={track.artist}
                              onChange={(e) => setStagedTracks((prev) => prev.map((t, j) => j === i ? { ...t, artist: e.target.value } : t))}
                            />
                          </div>
                          <input
                            type="number"
                            className="w-12 font-mono text-[10px] text-muted-foreground bg-transparent outline-none focus:bg-muted/20 rounded px-1 text-right"
                            value={track.duration || ""}
                            onChange={(e) => setStagedTracks((prev) => prev.map((t, j) => j === i ? { ...t, duration: parseInt(e.target.value) || 0 } : t))}
                            placeholder="sec"
                            title="Duration in seconds"
                          />
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => moveTrack(i, -1)} disabled={i === 0} className="p-1 rounded hover:bg-muted/20 disabled:opacity-20">
                              <ArrowUp className="h-3 w-3 text-muted-foreground" />
                            </button>
                            <button onClick={() => moveTrack(i, 1)} disabled={i === stagedTracks.length - 1} className="p-1 rounded hover:bg-muted/20 disabled:opacity-20">
                              <ArrowDown className="h-3 w-3 text-muted-foreground" />
                            </button>
                            <button onClick={() => removeTrack(i)} className="p-1 rounded hover:bg-red-500/20">
                              <Trash2 className="h-3 w-3" style={{ color: "oklch(0.60 0.20 25)" }} />
                            </button>
                          </div>
                        </div>
                        {/* Info snippet — shown to listeners while this track plays */}
                        <textarea
                          value={track.infoSnippet || ""}
                          onChange={(e) => setStagedTracks((prev) => prev.map((t, j) => j === i ? { ...t, infoSnippet: e.target.value } : t))}
                          placeholder="Optional info blurb shown to listeners while this track plays…"
                          rows={2}
                          maxLength={500}
                          className="mt-1.5 ml-7 w-[calc(100%-1.75rem)] resize-y rounded-md bg-muted/15 px-2 py-1.5 font-sans text-[11px] text-muted-foreground outline-none focus:bg-muted/25 focus:text-foreground border border-transparent focus:border-border/40"
                        />
                      </div>
                    ))
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave} disabled={saving || stagedTracks.length === 0} className="gap-1.5 rounded-lg text-xs flex-1">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Save Staged Playlist
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleActivate}
                    disabled={activating || !stagedPlaylist}
                    className="gap-1.5 rounded-lg text-xs"
                    style={{
                      background: stagedPlaylist ? "oklch(0.55 0.20 150 / 0.8)" : undefined,
                      color: stagedPlaylist ? "white" : undefined,
                    }}
                  >
                    {activating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                    Activate Live
                  </Button>
                </div>
                {!stagedPlaylist && stagedTracks.length > 0 && (
                  <p className="mt-2 font-sans text-[10px] text-muted-foreground text-center">Save the playlist first, then activate it</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
