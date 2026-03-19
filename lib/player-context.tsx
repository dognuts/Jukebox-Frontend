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

interface PlayerState {
  roomSlug: string
  roomName: string
  djName: string
  track: Track
  isPlaying: boolean
  volume: number
  muted: boolean
  playbackStartedAt?: number // server's startedAt timestamp for sync
}

interface PlayerContextType {
  player: PlayerState | null
  setRoom: (
    roomSlug: string,
    roomName: string,
    djName: string,
    track: Track,
    playbackStartedAt?: number
  ) => void
  updateTrack: (track: Track) => void
  updatePlaybackTime: (startedAt: number) => void
  togglePlay: () => void
  setVolume: (v: number) => void
  toggleMute: () => void
  close: () => void
}

const STORAGE_KEY = "jukebox-player"

function loadFromStorage(): PlayerState | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PlayerState
  } catch {
    return null
  }
}

function saveToStorage(state: PlayerState | null) {
  if (typeof window === "undefined") return
  try {
    if (state) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } else {
      sessionStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // ignore storage errors
  }
}

const PlayerContext = createContext<PlayerContextType | null>(null)

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<PlayerState | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // Load from sessionStorage on mount (client only)
  useEffect(() => {
    const stored = loadFromStorage()
    if (stored) {
      setPlayer(stored)
    }
    setHydrated(true)
  }, [])

  // Persist to sessionStorage whenever player changes (after hydration)
  useEffect(() => {
    if (hydrated) {
      saveToStorage(player)
    }
  }, [player, hydrated])

  const setRoom = useCallback(
    (roomSlug: string, roomName: string, djName: string, track: Track, playbackStartedAt?: number) => {
      setPlayer((prev) => {
        const next = {
          roomSlug,
          roomName,
          djName,
          track,
          isPlaying: true,
          volume: prev?.volume ?? 75,
          muted: prev?.muted ?? false,
          playbackStartedAt,
        }
        saveToStorage(next)
        return next
      })
    },
    []
  )

  const updateTrack = useCallback((track: Track) => {
    setPlayer((prev) => {
      if (!prev) return null
      const next = { ...prev, track }
      saveToStorage(next)
      return next
    })
  }, [])

  const updatePlaybackTime = useCallback((startedAt: number) => {
    setPlayer((prev) => {
      if (!prev) return null
      const next = { ...prev, playbackStartedAt: startedAt }
      saveToStorage(next)
      return next
    })
  }, [])

  const togglePlay = useCallback(() => {
    setPlayer((prev) => {
      if (!prev) return null
      const next = { ...prev, isPlaying: !prev.isPlaying }
      saveToStorage(next)
      return next
    })
  }, [])

  const setVolume = useCallback((v: number) => {
    setPlayer((prev) => {
      if (!prev) return null
      const next = { ...prev, volume: v, muted: v === 0 ? true : prev.muted }
      saveToStorage(next)
      return next
    })
  }, [])

  const toggleMute = useCallback(() => {
    setPlayer((prev) => {
      if (!prev) return null
      const next = { ...prev, muted: !prev.muted }
      saveToStorage(next)
      return next
    })
  }, [])

  const close = useCallback(() => {
    saveToStorage(null)
    setPlayer(null)
  }, [])

  return (
    <PlayerContext.Provider
      value={{
        player: hydrated ? player : null,
        setRoom,
        updateTrack,
        updatePlaybackTime,
        togglePlay,
        setVolume,
        toggleMute,
        close,
      }}
    >
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider")
  return ctx
}
