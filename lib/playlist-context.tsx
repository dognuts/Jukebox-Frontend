"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react"
import { type Track } from "@/lib/mock-data"
import { authRequest } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

// ---------- Types ----------

/** Shape returned by GET /api/playlists?include=tracks */
interface APIPlaylist {
  id: string
  userId: string
  name: string
  isLiked: boolean
  trackCount: number
  tracks: APIPlaylistTrack[] | null
  createdAt: string
  updatedAt: string
}

interface APIPlaylistTrack {
  id: string
  trackId: string
  position: number
  addedAt: string
  title: string
  artist: string
  duration: number
  source: string
  sourceUrl: string
  albumGradient: string
}

export interface Playlist {
  id: string
  name: string
  isLiked: boolean
  tracks: Track[]
  createdAt: number
}

interface PlaylistContextType {
  playlists: Playlist[]
  loading: boolean
  createPlaylist: (name: string) => Promise<Playlist | null>
  renamePlaylist: (id: string, name: string) => Promise<void>
  deletePlaylist: (id: string) => Promise<void>
  addTrack: (playlistId: string, track: Track) => Promise<void>
  removeTrack: (playlistId: string, trackId: string) => Promise<void>
  isTrackSaved: (trackId: string) => boolean
  getPlaylistsForTrack: (trackId: string) => string[]
  toggleLike: (track: Track) => void
  isLiked: (trackId: string) => boolean
  refresh: () => Promise<void>
}

const PlaylistContext = createContext<PlaylistContextType | null>(null)

// ---------- Helpers ----------

function apiTrackToTrack(t: APIPlaylistTrack): Track {
  return {
    id: t.trackId,
    title: t.title || "Unknown",
    artist: t.artist || "Unknown",
    duration: t.duration || 0,
    source: (t.source as Track["source"]) || "mp3",
    sourceUrl: t.sourceUrl || "",
    submittedBy: "",
    albumGradient: t.albumGradient || "linear-gradient(135deg, oklch(0.3 0.05 280), oklch(0.2 0.05 280))",
  }
}

function apiPlaylistToPlaylist(p: APIPlaylist): Playlist {
  return {
    id: p.id,
    name: p.name,
    isLiked: p.isLiked,
    tracks: (p.tracks || []).map(apiTrackToTrack),
    createdAt: new Date(p.createdAt).getTime(),
  }
}

// ---------- Provider ----------

export function PlaylistProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn, loading: authLoading } = useAuth()
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)
  const retryCount = useRef(0)
  const retryTimer = useRef<NodeJS.Timeout | null>(null)

  // Fetch playlists from API when logged in
  const refresh = useCallback(async () => {
    if (!isLoggedIn) {
      setPlaylists([])
      setFetched(false)
      return
    }
    setLoading(true)
    try {
      const data = await authRequest<APIPlaylist[]>("/api/playlists?include=tracks")
      setPlaylists(data.map(apiPlaylistToPlaylist))
      setFetched(true)
      retryCount.current = 0
    } catch (err) {
      console.error("[playlists] fetch error:", err)
      // Retry up to 3 times with backoff — handles the case where
      // auth token refresh hasn't completed yet
      if (retryCount.current < 3) {
        retryCount.current++
        const delay = retryCount.current * 2000
        console.log(`[playlists] retrying in ${delay}ms (attempt ${retryCount.current})`)
        retryTimer.current = setTimeout(() => refresh(), delay)
      }
    } finally {
      setLoading(false)
    }
  }, [isLoggedIn])

  // Fetch when auth state changes
  useEffect(() => {
    // Don't try to fetch while auth is still loading
    if (authLoading) return
    refresh()
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current)
    }
  }, [refresh, authLoading])

  // --- Create playlist ---
  const createPlaylist = useCallback(async (name: string): Promise<Playlist | null> => {
    if (!isLoggedIn) return null
    try {
      const created = await authRequest<APIPlaylist>("/api/playlists", {
        method: "POST",
        body: JSON.stringify({ name }),
      })
      const pl: Playlist = {
        id: created.id,
        name: created.name,
        isLiked: created.isLiked,
        tracks: [],
        createdAt: new Date(created.createdAt).getTime(),
      }
      setPlaylists((prev) => [...prev, pl])
      toast.success(`Created "${name}"`)
      return pl
    } catch (err) {
      toast.error("Failed to create playlist")
      return null
    }
  }, [isLoggedIn])

  // --- Rename playlist ---
  const renamePlaylist = useCallback(async (id: string, name: string) => {
    try {
      await authRequest(`/api/playlists/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      })
      setPlaylists((prev) =>
        prev.map((p) => (p.id === id ? { ...p, name } : p))
      )
    } catch (err) {
      toast.error("Failed to rename playlist")
    }
  }, [])

  // --- Delete playlist ---
  const deletePlaylist = useCallback(async (id: string) => {
    // Don't allow deleting liked playlist
    const pl = playlists.find((p) => p.id === id)
    if (pl?.isLiked) return
    try {
      await authRequest(`/api/playlists/${id}`, { method: "DELETE" })
      setPlaylists((prev) => prev.filter((p) => p.id !== id))
      toast.success("Playlist deleted")
    } catch (err) {
      toast.error("Failed to delete playlist")
    }
  }, [playlists])

  // --- Add track to playlist ---
  const addTrack = useCallback(async (playlistId: string, track: Track) => {
    if (!isLoggedIn) {
      toast.error("Log in to save tracks")
      return
    }
    // If playlists haven't loaded yet, try refreshing first
    if (!fetched) {
      toast.error("Playlists are still loading — try again in a moment")
      refresh()
      return
    }
    // Optimistic update
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id !== playlistId) return p
        if (p.tracks.some((t) => t.id === track.id)) return p
        return { ...p, tracks: [...p.tracks, track] }
      })
    )
    try {
      await authRequest(`/api/playlists/${playlistId}/tracks`, {
        method: "POST",
        body: JSON.stringify({ trackId: track.id }),
      })
    } catch (err) {
      // Revert on failure
      setPlaylists((prev) =>
        prev.map((p) => {
          if (p.id !== playlistId) return p
          return { ...p, tracks: p.tracks.filter((t) => t.id !== track.id) }
        })
      )
      toast.error("Failed to save track")
    }
  }, [isLoggedIn, fetched, refresh])

  // --- Remove track from playlist ---
  const removeTrack = useCallback(async (playlistId: string, trackId: string) => {
    // Optimistic update
    let removed: Track | undefined
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id !== playlistId) return p
        removed = p.tracks.find((t) => t.id === trackId)
        return { ...p, tracks: p.tracks.filter((t) => t.id !== trackId) }
      })
    )
    try {
      await authRequest(`/api/playlists/${playlistId}/tracks/${trackId}`, {
        method: "DELETE",
      })
    } catch (err) {
      // Revert on failure
      if (removed) {
        setPlaylists((prev) =>
          prev.map((p) => {
            if (p.id !== playlistId) return p
            return { ...p, tracks: [...p.tracks, removed!] }
          })
        )
      }
      toast.error("Failed to remove track")
    }
  }, [])

  // --- Toggle like (adds/removes from the "Liked Tracks" playlist) ---
  const toggleLike = useCallback((track: Track) => {
    if (!isLoggedIn) {
      toast.error("Log in to like tracks")
      return
    }
    const liked = playlists.find((p) => p.isLiked)
    if (!liked) {
      // Playlists haven't loaded yet — trigger a refresh and let user retry
      if (!fetched) {
        toast.error("Still loading your playlists — try again in a moment")
        refresh()
      } else {
        toast.error("Log in to like tracks")
      }
      return
    }
    const exists = liked.tracks.some((t) => t.id === track.id)
    if (exists) {
      removeTrack(liked.id, track.id)
    } else {
      addTrack(liked.id, track)
    }
  }, [playlists, isLoggedIn, fetched, addTrack, removeTrack, refresh])

  // --- Check if track is liked ---
  const isLiked = useCallback(
    (trackId: string) => {
      const liked = playlists.find((p) => p.isLiked)
      return liked ? liked.tracks.some((t) => t.id === trackId) : false
    },
    [playlists]
  )

  // --- Check if track is in any playlist ---
  const isTrackSaved = useCallback(
    (trackId: string) => playlists.some((p) => p.tracks.some((t) => t.id === trackId)),
    [playlists]
  )

  // --- Get which playlists contain a track ---
  const getPlaylistsForTrack = useCallback(
    (trackId: string) =>
      playlists.filter((p) => p.tracks.some((t) => t.id === trackId)).map((p) => p.id),
    [playlists]
  )

  return (
    <PlaylistContext.Provider
      value={{
        playlists,
        loading,
        createPlaylist,
        renamePlaylist,
        deletePlaylist,
        addTrack,
        removeTrack,
        isTrackSaved,
        getPlaylistsForTrack,
        toggleLike,
        isLiked,
        refresh,
      }}
    >
      {children}
    </PlaylistContext.Provider>
  )
}

export function usePlaylist() {
  const ctx = useContext(PlaylistContext)
  if (!ctx) throw new Error("usePlaylist must be used within PlaylistProvider")
  return ctx
}
