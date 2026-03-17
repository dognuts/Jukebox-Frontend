"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react"
import { type Track } from "@/lib/mock-data"

export interface Playlist {
  id: string
  name: string
  tracks: Track[]
  createdAt: number
}

interface PlaylistContextType {
  playlists: Playlist[]
  createPlaylist: (name: string) => Playlist
  renamePlaylist: (id: string, name: string) => void
  deletePlaylist: (id: string) => void
  addTrack: (playlistId: string, track: Track) => void
  removeTrack: (playlistId: string, trackId: string) => void
  isTrackSaved: (trackId: string) => boolean
  getPlaylistsForTrack: (trackId: string) => string[]
  toggleLike: (track: Track) => void
  isLiked: (trackId: string) => boolean
}

const STORAGE_KEY = "jukebox-playlists"
const LIKED_ID = "liked-tracks"

function generateId() {
  return `pl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function createDefaultPlaylists(): Playlist[] {
  return [
    {
      id: LIKED_ID,
      name: "Liked Tracks",
      tracks: [],
      createdAt: Date.now(),
    },
  ]
}

function loadFromStorage(): Playlist[] | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Playlist[]
  } catch {
    return null
  }
}

function saveToStorage(playlists: Playlist[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(playlists))
  } catch {
    // ignore storage errors
  }
}

const PlaylistContext = createContext<PlaylistContextType | null>(null)

export function PlaylistProvider({ children }: { children: ReactNode }) {
  const [playlists, setPlaylists] = useState<Playlist[]>(createDefaultPlaylists)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const stored = loadFromStorage()
    if (stored && stored.length > 0) {
      // Ensure "Liked Tracks" always exists
      const hasLiked = stored.some((p) => p.id === LIKED_ID)
      if (!hasLiked) {
        stored.unshift({
          id: LIKED_ID,
          name: "Liked Tracks",
          tracks: [],
          createdAt: 0,
        })
      }
      setPlaylists(stored)
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) saveToStorage(playlists)
  }, [playlists, hydrated])

  const createPlaylist = useCallback((name: string): Playlist => {
    const pl: Playlist = { id: generateId(), name, tracks: [], createdAt: Date.now() }
    setPlaylists((prev) => {
      const next = [...prev, pl]
      saveToStorage(next)
      return next
    })
    return pl
  }, [])

  const renamePlaylist = useCallback((id: string, name: string) => {
    setPlaylists((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, name } : p))
      saveToStorage(next)
      return next
    })
  }, [])

  const deletePlaylist = useCallback((id: string) => {
    if (id === LIKED_ID) return // Cannot delete Liked Tracks
    setPlaylists((prev) => {
      const next = prev.filter((p) => p.id !== id)
      saveToStorage(next)
      return next
    })
  }, [])

  const addTrack = useCallback((playlistId: string, track: Track) => {
    setPlaylists((prev) => {
      const next = prev.map((p) => {
        if (p.id !== playlistId) return p
        if (p.tracks.some((t) => t.id === track.id)) return p // already exists
        return { ...p, tracks: [...p.tracks, track] }
      })
      saveToStorage(next)
      return next
    })
  }, [])

  const removeTrack = useCallback((playlistId: string, trackId: string) => {
    setPlaylists((prev) => {
      const next = prev.map((p) => {
        if (p.id !== playlistId) return p
        return { ...p, tracks: p.tracks.filter((t) => t.id !== trackId) }
      })
      saveToStorage(next)
      return next
    })
  }, [])

  const isTrackSaved = useCallback(
    (trackId: string) => playlists.some((p) => p.tracks.some((t) => t.id === trackId)),
    [playlists]
  )

  const getPlaylistsForTrack = useCallback(
    (trackId: string) =>
      playlists.filter((p) => p.tracks.some((t) => t.id === trackId)).map((p) => p.id),
    [playlists]
  )

  const toggleLike = useCallback((track: Track) => {
    setPlaylists((prev) => {
      const next = prev.map((p) => {
        if (p.id !== LIKED_ID) return p
        const exists = p.tracks.some((t) => t.id === track.id)
        return exists
          ? { ...p, tracks: p.tracks.filter((t) => t.id !== track.id) }
          : { ...p, tracks: [...p.tracks, track] }
      })
      saveToStorage(next)
      return next
    })
  }, [])

  const isLiked = useCallback(
    (trackId: string) => {
      const liked = playlists.find((p) => p.id === LIKED_ID)
      return liked ? liked.tracks.some((t) => t.id === trackId) : false
    },
    [playlists]
  )

  return (
    <PlaylistContext.Provider
      value={{
        playlists: hydrated ? playlists : createDefaultPlaylists(),
        createPlaylist,
        renamePlaylist,
        deletePlaylist,
        addTrack,
        removeTrack,
        isTrackSaved,
        getPlaylistsForTrack,
        toggleLike,
        isLiked,
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
