"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react"
import { type Track } from "@/components/discover/types"

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

function loadFromStorage(): { state: PlayerState; raw: string } | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return { state: JSON.parse(raw) as PlayerState, raw }
  } catch {
    return null
  }
}

function saveToStorage(serialized: string | null) {
  if (typeof window === "undefined") return
  try {
    if (serialized) {
      sessionStorage.setItem(STORAGE_KEY, serialized)
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
  // Serialized form of what sessionStorage currently holds — lets the
  // persistence effect below skip the write (and the JSON.stringify cost
  // is paid once per committed change, not once per setter call).
  const lastSavedRef = useRef<string | null>(null)

  // Load from sessionStorage on mount (client only)
  useEffect(() => {
    const stored = loadFromStorage()
    if (stored) {
      lastSavedRef.current = stored.raw
      setPlayer(stored.state)
    }
    setHydrated(true)
  }, [])

  // Persist to sessionStorage whenever the committed player state changes
  // (after hydration). This is the single write path — setters stay
  // side-effect-free so StrictMode/concurrent re-runs are safe — and
  // identical states (e.g. a playback sync echoing the stored value)
  // don't touch storage at all.
  useEffect(() => {
    if (!hydrated) return
    const serialized = player ? JSON.stringify(player) : null
    if (serialized === lastSavedRef.current) return
    lastSavedRef.current = serialized
    saveToStorage(serialized)
  }, [player, hydrated])

  const setRoom = useCallback(
    (roomSlug: string, roomName: string, djName: string, track: Track, playbackStartedAt?: number) => {
      setPlayer((prev) => ({
        roomSlug,
        roomName,
        djName,
        track,
        isPlaying: true,
        volume: prev?.volume ?? 75,
        muted: prev?.muted ?? false,
        playbackStartedAt,
      }))
    },
    []
  )

  const updateTrack = useCallback((track: Track) => {
    setPlayer((prev) => (prev ? { ...prev, track } : null))
  }, [])

  const updatePlaybackTime = useCallback((startedAt: number) => {
    setPlayer((prev) => (prev ? { ...prev, playbackStartedAt: startedAt } : null))
  }, [])

  const togglePlay = useCallback(() => {
    setPlayer((prev) => (prev ? { ...prev, isPlaying: !prev.isPlaying } : null))
  }, [])

  const setVolume = useCallback((v: number) => {
    setPlayer((prev) =>
      prev ? { ...prev, volume: v, muted: v === 0 ? true : prev.muted } : null
    )
  }, [])

  const toggleMute = useCallback(() => {
    setPlayer((prev) => (prev ? { ...prev, muted: !prev.muted } : null))
  }, [])

  const close = useCallback(() => {
    setPlayer(null)
  }, [])

  const visiblePlayer = hydrated ? player : null
  const value = useMemo(
    () => ({
      player: visiblePlayer,
      setRoom,
      updateTrack,
      updatePlaybackTime,
      togglePlay,
      setVolume,
      toggleMute,
      close,
    }),
    [
      visiblePlayer,
      setRoom,
      updateTrack,
      updatePlaybackTime,
      togglePlay,
      setVolume,
      toggleMute,
      close,
    ]
  )

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider")
  return ctx
}
