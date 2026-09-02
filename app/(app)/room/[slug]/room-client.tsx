"use client"

import { useState, useCallback, useMemo, useEffect, useRef, type ReactNode } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Play, Radio } from "lucide-react"
import { RequestModal } from "@/components/room/request-modal"
import { ListenerNav } from "@/components/room/listener-nav"
import { ListenerNowPlaying } from "@/components/room/listener-now-playing"
import { ListenerDjContext } from "@/components/room/listener-dj-context"
import { ListenerQueue } from "@/components/room/listener-queue"
import { ListenerChatColumn } from "@/components/room/listener-chat-column"
import { DjDeck } from "@/components/room/dj-deck"
import { RoomMobileTabs, type MobileRoomTab } from "@/components/room/room-mobile-tabs"
import { NeonTube } from "@/components/room/neon-tube"
import { RoomSkeleton } from "@/components/room/room-skeleton"
import { SupernovaExplosion } from "@/components/effects/supernova-explosion"
import { RoomEffectOverlay } from "@/components/effects/room-effect-overlay"
import type { Room, Track } from "@/components/discover/types"
import { usePlayer } from "@/lib/player-context"
import { usePlaylist } from "@/lib/playlist-context"
import { getRoom, toFrontendRoom, type RoomDetail, type APIChatMessage } from "@/lib/api"
import { useRoomWebSocket, type SubmitTrackResult } from "@/hooks/use-room-websocket"
import {
  chatMessagesSlice,
  activityEventsSlice,
  clockOffsetSlice,
  playbackStateSlice,
  useRoomCurrentTrack,
  useRoomHasPlaybackState,
  useRoomPlaybackState,
} from "@/hooks/room-store"
import {
  type AudioEngineTrack,
  type AudioEngineMediaMetadata,
} from "@/components/player/audio-engine"
import { RoomAudioEngine } from "@/components/player/room-audio-engine"
import { parseTrackUrl } from "@/lib/track-utils"
import { SendNeonModal } from "@/components/room/send-neon-modal"
import { useAuth } from "@/lib/auth-context"
import { useHypeTracking } from "@/components/room/hype-meter"
import { useLiveKitVoice } from "@/hooks/use-livekit-voice"

// lib/api's request() throws `Error("API <status>: <body>")`. Parse the
// status back out locally — api.ts is shared, so the error shape stays
// string-based there.
function isApiNotFound(err: unknown): boolean {
  return err instanceof Error && err.message.startsWith("API 404")
}

// Watch a message slice for appended entries without subscribing the
// page to it via React state. Slices are append-only (capped at 100 and
// atomically replaced on reset), so walking back from the tail to the
// last-seen id finds exactly the new messages.
function subscribeToNewMessages(
  slice: {
    get: () => APIChatMessage[]
    subscribe: (listener: () => void) => () => void
  },
  onNew: (m: APIChatMessage) => void
): () => void {
  const initial = slice.get()
  let lastId = initial.length > 0 ? initial[initial.length - 1].id : null
  return slice.subscribe(() => {
    const msgs = slice.get()
    if (msgs.length === 0) {
      lastId = null
      return
    }
    const fresh: APIChatMessage[] = []
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].id === lastId) break
      fresh.push(msgs[i])
    }
    lastId = msgs[msgs.length - 1].id
    // Restore chronological order (walked tail-first above).
    for (let i = fresh.length - 1; i >= 0; i--) onNew(fresh[i])
  })
}

export function RoomClient({
  slug,
  initialData,
}: {
  slug: string
  initialData?: RoomDetail | null
}) {
  // DJ key from sessionStorage (set when creating a room)
  const [djKey, setDjKey] = useState<string | null | undefined>(undefined) // undefined = not loaded yet
  useEffect(() => {
    if (typeof window !== "undefined") {
      const key = sessionStorage.getItem(`djKey:${slug}`)
      setDjKey(key) // null if not found, string if found
    }
  }, [slug])

  // Room data — seeded synchronously from the server component's fetch
  // when available, so the first render (including the server-rendered
  // HTML) already shows the real room shell; the WebSocket takes over
  // live updates after connect. The client-side fetch below is only a
  // fallback for when initialData is absent (backend unreachable during
  // SSR) or a Retry. A 404 renders the not-found shell; any other
  // failure renders a retryable error state. No mock fallback.
  const initialRoom = useMemo(
    () =>
      initialData
        ? toFrontendRoom(
            initialData.room,
            initialData.nowPlaying,
            initialData.queue,
            initialData.recentChat
          )
        : null,
    [initialData]
  )
  const [room, setRoom] = useState<Room | null>(initialRoom)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const { setRoom: setPlayerRoom, updateTrack, updatePlaybackTime, close: closePlayer } = usePlayer()
  const { toggleLike, isLiked } = usePlaylist()

  useEffect(() => {
    let cancelled = false
    setNotFound(false)
    setLoadError(null)
    // The server component already fetched this room and passed it down —
    // seed from that and skip the duplicate client fetch. Retries
    // (loadAttempt > 0) still hit the API.
    if (initialRoom && loadAttempt === 0) {
      setRoom(initialRoom)
      return
    }
    async function load() {
      try {
        const detail = await getRoom(slug)
        if (!cancelled) {
          setRoom(toFrontendRoom(detail.room, detail.nowPlaying, detail.queue, detail.recentChat))
        }
      } catch (err) {
        if (cancelled) return
        if (isApiNotFound(err)) {
          setNotFound(true)
        } else {
          console.error("[room] failed to load:", err)
          setLoadError(err instanceof Error ? err.message : "Failed to load room")
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, [slug, loadAttempt, initialRoom]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-run the room fetch (from the error state's Retry button). The
  // effect clears loadError itself, which flips the UI back to loading.
  const retryLoad = useCallback(() => {
    setLoadAttempt((n) => n + 1)
  }, [])

  // Ref for chat panel reaction overlay (to fire incoming WS reactions)
  const chatOverlayRef = useRef<HTMLDivElement>(null)

  const hypeReactionRef = useRef<() => void>(() => {})

  const handleIncomingReaction = useCallback((emoji: string) => {
    const overlay = chatOverlayRef.current as any
    if (overlay?._fireReaction) {
      overlay._fireReaction(emoji)
    }
    hypeReactionRef.current()
  }, [])

  // Surface WS server errors (rate limit, requests closed, ...) as
  // toasts — the backend messages are already user-readable. Dedupe
  // identical messages within 3s so rapid retries don't stack toasts.
  const lastWsErrorRef = useRef({ message: "", at: 0 })
  const handleWsError = useCallback((message: string) => {
    const now = Date.now()
    if (
      message === lastWsErrorRef.current.message &&
      now - lastWsErrorRef.current.at < 3000
    ) {
      return
    }
    lastWsErrorRef.current = { message, at: now }
    toast.error(message)
  }, [])

  // WebSocket for real-time updates (skipped while the room is known to
  // be missing or failed to load)
  const ws = useRoomWebSocket({
    slug,
    djKey,
    disabled: notFound || !!loadError,
    onError: handleWsError,
    onReaction: handleIncomingReaction,
  })

  // The hottest WS slices live in an external store, and this page
  // deliberately subscribes to almost none of them:
  // - chat messages   → ListenerChatColumn / ListenerDjContext subscribe
  // - playback state  → RoomAudioEngine / TroubleListeningLink subscribe
  // - playback position (2-4Hz) → the progress leaf in ListenerNowPlaying
  // The page only reads the current track (changes once per song) and a
  // derived "is anything playing" boolean, so chat traffic and playback
  // sync broadcasts never reconcile the whole room tree.
  const wsCurrentTrack = useRoomCurrentTrack()
  const wsHasPlayback = useRoomHasPlaybackState()

  // Once the socket has connected, keep rendering its last-received
  // data through any disconnect — falling back to the REST snapshot
  // mid-session visibly rewound chat/queue/listeners to join-time
  // state. On reconnect the server replays fresh state, which replaces
  // each slice atomically (see use-room-websocket).
  const useWsData = ws.everConnected

  // Suppress the connection banner briefly after mount so the normal
  // socket handshake doesn't flash "Connecting…" on every page load.
  // After the grace window (or once we've ever been connected), any
  // non-connected status shows the banner.
  const [wsGraceOver, setWsGraceOver] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setWsGraceOver(true), 4000)
    return () => clearTimeout(t)
  }, [])

  const isDJ = !!djKey

  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [sendNeonOpen, setSendNeonOpen] = useState(false)
  // Mobile pane choice — below md the room columns render as tabbed
  // panes (see RoomMobileTabs). null = the user hasn't picked yet; the
  // effective pane is derived at render time (see mobileTab below) so
  // DJs land on the deck once the room is live.
  const [mobileTabChoice, setMobileTabChoice] = useState<MobileRoomTab | null>(null)
  const tubeBarRef = useRef<HTMLDivElement>(null)
  const { user: authUser, loading: authLoading } = useAuth()

  // Chat requires a verified account (the ws hub enforces this server-side
  // too). DJs are exempt — the DJ key already proves room ownership.
  const chatGate: "anonymous" | "unverified" | null =
    isDJ || authLoading ? null : !authUser ? "anonymous" : !authUser.emailVerified ? "unverified" : null
  const [micActive, setMicActive] = useState(false)
  const [micPausesMusic, setMicPausesMusic] = useState(true)

  // LiveKit voice — DJ broadcasts mic, listeners receive DJ audio.
  // Listeners reach the SFU only once the DJ's mic actually goes live
  // (the dj_mic_state broadcast → ws.djMicActive) — never on room entry
  // — so rooms where voice is never used cost zero token requests and
  // zero extra WebSockets, and the ~1MB livekit-client SDK is never
  // downloaded. djMicActive can only come from a live, DJ-driven room,
  // so it subsumes the old isLive/!isAutoplay gate (and unlike the REST
  // snapshot's isLive, it can't go stale). The DJ connects lazily via
  // startBroadcasting when they first enable the mic.
  const liveKit = useLiveKitVoice({
    roomSlug: slug || "",
    isDJ,
    djKey,
    voiceActive: !!room && ws.djMicActive,
  })

  // Hype tracking for DJ view only — listeners pass enabled=false so
  // the hook does zero per-second work for them.
  const hypeTracking = useHypeTracking(isDJ)

  // Connect hype tracking to real WS events — only for DJs. Subscribes
  // to the slices imperatively (no useSyncExternalStore) so counting a
  // new message never re-renders this page component.
  const { recordChat, recordTip } = hypeTracking
  useEffect(() => {
    if (!isDJ) return
    const unsubChat = subscribeToNewMessages(chatMessagesSlice, (m) => {
      if (m.type === "message") recordChat()
    })
    const unsubTips = subscribeToNewMessages(activityEventsSlice, (m) => {
      if (m.type === "activity_tip") recordTip()
    })
    return () => {
      unsubChat()
      unsubTips()
    }
  }, [isDJ, recordChat, recordTip])

  // Track reactions via the onReaction callback
  hypeReactionRef.current = hypeTracking.recordReaction

  // Mock tube state for when backend is not connected (kept so Send Neon
  // can still give local feedback — tube visual is no longer rendered but
  // the state is still used by the Neon modal cascade.)
  const [mockTube, setMockTube] = useState({ roomId: slug || "", level: 1, fillAmount: 0, fillTarget: 100, totalNeon: 0, prestigeCount: 0 })
  const [mockPowerUp, setMockPowerUp] = useState<{ newLevel: number; color: string } | null>(null)
  const [mockSupernovaEvent, setMockSupernovaEvent] = useState<{ prestigeCount: number; activatedBy: string } | null>(null)
  const [mockRoomEffect, setMockRoomEffect] = useState<import("@/hooks/use-room-websocket").RoomEffect | null>(null)

  // Track prestige locally — the backend doesn't support prestigeCount
  // yet, so we detect Supernova resets by watching the tube level drop
  // from 5 to a lower value and trigger effects on the frontend.
  const [localPrestige, setLocalPrestige] = useState(0)
  const [localSupernovaEvent, setLocalSupernovaEvent] = useState<{ prestigeCount: number; activatedBy: string } | null>(null)
  const [localRoomEffect, setLocalRoomEffect] = useState<import("@/hooks/use-room-websocket").RoomEffect | null>(null)
  const prevTubeLevelRef = useRef<number>(0)

  useEffect(() => {
    const tube = useWsData ? ws.tube : mockTube
    if (!tube) return
    const prevLevel = prevTubeLevelRef.current
    prevTubeLevelRef.current = tube.level

    // Detect prestige: level was 5, now it's lower (backend reset)
    if (prevLevel >= 5 && tube.level < prevLevel) {
      setLocalPrestige((p) => {
        const newP = p + 1
        setLocalSupernovaEvent({ prestigeCount: newP, activatedBy: "A listener" })
        setTimeout(() => setLocalSupernovaEvent(null), 8000)
        const effects = ["aurora", "neon_rain", "stardust"] as const
        const effect = effects[newP % effects.length]
        const expiry = new Date(Date.now() + 30 * 60 * 1000).toISOString()
        setLocalRoomEffect({ type: effect, expiresAt: expiry, activatedBy: "A listener" })
        return newP
      })
    }
  }, [useWsData, ws.tube, ws.tube?.level, mockTube, mockTube.level]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch real tube state on room load
  useEffect(() => {
    if (!room?.id) return
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/rooms/${room.id}/tube`, { credentials: "include" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data) setMockTube(data) })
      .catch(() => {})
  }, [room?.id])

  // Handle neon sent - update tube locally in mock mode
  const handleNeonSent = useCallback((amount: number) => {
    if (!useWsData) {
      setMockTube((prev) => {
        const newFill = prev.fillAmount + amount
        const newTotal = prev.totalNeon + amount
        if (newFill >= prev.fillTarget) {
          if (prev.level >= 5) {
            // Supernova maxed — prestige reset!
            const newPrestige = (prev.prestigeCount ?? 0) + 1
            setMockSupernovaEvent({ prestigeCount: newPrestige, activatedBy: "You" })
            setTimeout(() => setMockSupernovaEvent(null), 8000)
            // Unlock a random room effect for 30 minutes
            const effects = ["aurora", "neon_rain", "stardust"] as const
            const effect = effects[newPrestige % effects.length]
            const expiry = new Date(Date.now() + 30 * 60 * 1000).toISOString()
            setMockRoomEffect({ type: effect, expiresAt: expiry, activatedBy: "You" })
            return { ...prev, level: 1, fillAmount: 0, fillTarget: 100, totalNeon: newTotal, prestigeCount: newPrestige }
          }
          const newLevel = Math.min(prev.level + 1, 5)
          // Raw literals on purpose — mirrors the LEVELS palette in neon-tube.tsx.
          const colors = ["oklch(0.72 0.18 195)", "oklch(0.65 0.24 330)", "oklch(0.82 0.18 80)", "oklch(0.75 0.20 300)", "oklch(0.95 0.03 80)"]
          setMockPowerUp({ newLevel, color: colors[newLevel - 1] })
          setTimeout(() => setMockPowerUp(null), 4000)
          return { ...prev, level: newLevel, fillAmount: newFill - prev.fillTarget, fillTarget: 100, totalNeon: newTotal }
        }
        return { ...prev, fillAmount: newFill, totalNeon: newTotal }
      })
    }
  }, [useWsData])

  // Use WebSocket data once it has arrived (kept through disconnects —
  // see useWsData), otherwise room data from the initial fetch. For
  // the infoSnippet specifically, fall back to the REST room.nowPlaying
  // value when the WS payload is missing it — this covers races where
  // the track_changed event lands before the tracks table row has the
  // latest snippet, and it lets the periodic REST refresh below
  // populate fresher snippets as they land.
  const currentTrack: Track | null = useMemo(() => {
    if (wsCurrentTrack) {
      const restSnippet =
        room?.nowPlaying && room.nowPlaying.id === wsCurrentTrack.id
          ? room.nowPlaying.infoSnippet
          : undefined
      return {
        id: wsCurrentTrack.id,
        title: wsCurrentTrack.title,
        artist: wsCurrentTrack.artist,
        duration: wsCurrentTrack.duration,
        source: wsCurrentTrack.source,
        sourceUrl: wsCurrentTrack.sourceUrl,
        submittedBy: "DJ",
        albumGradient: wsCurrentTrack.albumGradient || "linear-gradient(135deg, oklch(0.45 0.15 30), oklch(0.35 0.20 350))",
        infoSnippet: wsCurrentTrack.infoSnippet || restSnippet,
      }
    }
    return room?.nowPlaying ?? null
  }, [wsCurrentTrack, room?.nowPlaying])

  // Periodic REST refresh of room.nowPlaying.infoSnippet. Runs every
  // 20 seconds as a safety net for snippet drift: if the backend
  // updates a track's info_snippet after the room loaded or the WS
  // connected, the next poll will pick it up and feed it into the
  // currentTrack memo via the fallback path above. Only updates state
  // when the snippet actually changed to avoid unnecessary re-renders.
  useEffect(() => {
    if (!slug || notFound || loadError) return
    const id = setInterval(async () => {
      try {
        const detail = await getRoom(slug)
        const fresh = detail.nowPlaying
        if (!fresh) return
        setRoom((prev) => {
          if (!prev || !prev.nowPlaying) return prev
          if (prev.nowPlaying.id !== fresh.id) return prev
          if (prev.nowPlaying.infoSnippet === fresh.infoSnippet) return prev
          return {
            ...prev,
            nowPlaying: {
              ...prev.nowPlaying,
              infoSnippet: fresh.infoSnippet,
            },
          }
        })
      } catch {
        // Swallow — next tick will try again.
      }
    }, 20000)
    return () => clearInterval(id)
  }, [slug, notFound, loadError])

  // Autoplay playlist tracks — fetch for autoplay rooms
  const [autoplayTracks, setAutoplayTracks] = useState<Track[]>([])
  const [autoplayIndex, setAutoplayIndex] = useState(0)
  useEffect(() => {
    if (!slug || !room?.isAutoplay) return
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/rooms/${slug}/autoplay-tracks`, { credentials: "include" })
      .then((res) => res.ok ? res.json() : { tracks: [], currentIndex: 0 })
      .then((data: any) => {
        if (Array.isArray(data.tracks)) {
          setAutoplayTracks(data.tracks.map((t: any, i: number) => ({
            id: `autoplay-${i}`,
            title: t.title || "",
            artist: t.artist || "",
            duration: t.duration || 0,
            source: t.source || "youtube",
            sourceUrl: t.sourceUrl || "",
            albumGradient: t.albumGradient || "linear-gradient(135deg, oklch(0.35 0.10 280), oklch(0.25 0.10 280))",
          })))
          setAutoplayIndex(data.currentIndex || 0)
        }
      })
      .catch(() => {})
  }, [slug, room?.isAutoplay])

  const queueTracks: Track[] = useMemo(() => {
    // For autoplay rooms, show upcoming tracks from the playlist
    if (room?.isAutoplay && autoplayTracks.length > 0) {
      const upcoming: Track[] = []
      for (let i = 0; i < autoplayTracks.length; i++) {
        const idx = (autoplayIndex + i) % autoplayTracks.length
        upcoming.push(autoplayTracks[idx])
      }
      return upcoming
    }
    // Once the WebSocket has connected, always use its queue data (even
    // if empty, and even through a disconnect — the last-received queue
    // beats rewinding to the initial REST fetch).
    if (useWsData) {
      const mapped = ws.queue.map((e) => ({
        id: e.track.id,
        title: e.track.title,
        artist: e.track.artist,
        duration: e.track.duration,
        source: e.track.source,
        sourceUrl: e.track.sourceUrl,
        submittedBy: e.submittedBy,
        albumGradient: e.track.albumGradient || "linear-gradient(135deg, oklch(0.45 0.15 30), oklch(0.35 0.20 350))",
      }))
      // Filter out the currently playing track — it shouldn't appear in "Up Next"
      const nowPlayingId = wsCurrentTrack?.id || currentTrack?.id
      if (nowPlayingId) {
        return mapped.filter((t) => t.id !== nowPlayingId)
      }
      return mapped
    }
    return room?.queue ?? []
  }, [useWsData, ws.queue, wsCurrentTrack?.id, currentTrack?.id, room?.queue, room?.isAutoplay, autoplayTracks, autoplayIndex])

  // Played tracks — accumulated from WS + initial fetch from API
  const [fetchedHistory, setFetchedHistory] = useState<Track[]>([])
  useEffect(() => {
    if (!slug) return
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/rooms/${slug}/history`, { credentials: "include" })
      .then((res) => res.ok ? res.json() : [])
      .then((entries: any[]) => {
        if (Array.isArray(entries)) {
          setFetchedHistory(entries.map((e: any) => ({
            id: e.track?.id || e.id,
            title: e.track?.title || e.title || "",
            artist: e.track?.artist || e.artist || "",
            duration: e.track?.duration || e.duration || 0,
            source: e.track?.source || e.source || "mp3",
            sourceUrl: e.track?.sourceUrl || e.sourceUrl || "",
            submittedBy: e.submittedBy || "",
            albumGradient: e.track?.albumGradient || e.albumGradient || "linear-gradient(135deg, oklch(0.35 0.10 280), oklch(0.25 0.10 280))",
          })))
        }
      })
      .catch(() => {})
  }, [slug])

  const playedTracks: Track[] = useMemo(() => {
    // WS-tracked played tracks (most recent first) + fetched history, deduplicated
    const wsPlayed: Track[] = ws.playedTracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      duration: t.duration,
      source: t.source,
      sourceUrl: t.sourceUrl,
      submittedBy: "",
      albumGradient: t.albumGradient || "linear-gradient(135deg, oklch(0.35 0.10 280), oklch(0.25 0.10 280))",
    }))
    const seen = new Set(wsPlayed.map((t) => t.id))
    const merged = [...wsPlayed]
    for (const t of fetchedHistory) {
      if (!seen.has(t.id)) {
        seen.add(t.id)
        merged.push(t)
      }
    }
    return merged
  }, [ws.playedTracks, fetchedHistory])

  // Chat messages themselves are consumed by ListenerChatColumn (which
  // subscribes to the chat slice directly); the page only precomputes
  // the REST-snapshot fallbacks it hands down. The most recent DJ
  // announcement from the initial fetch backs the DJ-context card until
  // live announcements arrive over the socket.
  const fallbackAnnouncement = useMemo(() => {
    const msgs = room?.chatMessages ?? []
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i]
      if (m.type === "announcement" && m.username === room?.djName) {
        return m.message
      }
    }
    return ""
  }, [room?.chatMessages, room?.djName])

  const listenerCount = useWsData ? ws.listenerCount : (room?.listenerCount ?? 0)
  // Map server request policy to UI status
  const serverPolicy = useWsData ? ws.requestPolicy : (room?.requestPolicy ?? "open")
  const requestStatus = serverPolicy === "approval" ? "paused" : serverPolicy as "open" | "closed"

  // Sync player context. Playback state is read from the slice at
  // effect time (not subscribed) — this page shouldn't re-render on
  // playback_state broadcasts.
  useEffect(() => {
    if (room && currentTrack) {
      const startedAt = playbackStateSlice.get()?.startedAt ?? Date.now()
      setPlayerRoom(room.slug, room.name, room.djName, currentTrack, startedAt)
    }
  }, [room?.slug, room?.name, room?.djName, currentTrack]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentTrack) {
      updateTrack(currentTrack)
    }
  }, [currentTrack, updateTrack])

  // Keep playback time synced for mini player continuity — imperative
  // slice subscription so playback_state broadcasts don't re-render
  // this page component.
  useEffect(() => {
    let lastStartedAt = 0
    const sync = () => {
      const startedAt = playbackStateSlice.get()?.startedAt
      if (startedAt && startedAt !== lastStartedAt) {
        lastStartedAt = startedAt
        updatePlaybackTime(startedAt)
      }
    }
    sync()
    return playbackStateSlice.subscribe(sync)
  }, [updatePlaybackTime])

  // Close mini player when room ends
  useEffect(() => {
    if (ws.roomEnded) {
      closePlayer()
    }
  }, [ws.roomEnded, closePlayer])

  const handleMicChange = useCallback((active: boolean, pauseMusic: boolean, deviceId?: string) => {
    setMicActive(active)
    setMicPausesMusic(pauseMusic)
    // Broadcast mic state to all listeners via WebSocket
    if (ws.connected && isDJ) {
      ws.djSetMic(active, pauseMusic)
    }
    if (active) {
      liveKit.startBroadcasting(deviceId)
    } else {
      liveKit.stopBroadcasting()
    }
    // Granular deps (not the per-render `ws`/`liveKit` objects) so this
    // callback stays referentially stable and DjDeck's memo holds.
  }, [liveKit.startBroadcasting, liveKit.stopBroadcasting, ws.connected, ws.djSetMic, isDJ]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-announce the local mic state after a WS reconnect. The hub treats a
  // DJ socket drop as mic-off (it clears mic state and broadcasts
  // active:false), but the LiveKit publish survives the room-WS blip — so
  // without this, listeners' music resumes OVER the DJ's still-live voice
  // and late joiners never connect to it. Re-sending restores hub state
  // (and everyone's pause) without a manual toggle.
  const prevWsConnectedRef = useRef(ws.connected)
  useEffect(() => {
    const wasConnected = prevWsConnectedRef.current
    prevWsConnectedRef.current = ws.connected
    if (!wasConnected && ws.connected && isDJ && micActive) {
      ws.djSetMic(micActive, micPausesMusic)
    }
  }, [ws.connected, isDJ, micActive, micPausesMusic, ws.djSetMic]) // eslint-disable-line react-hooks/exhaustive-deps

  // Audio engine state. The engine's playback position (2-4 updates
  // per second) deliberately has NO page state — RoomAudioEngine writes
  // it into the playback-position slice and only the progress leaf in
  // ListenerNowPlaying subscribes.
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [audioDuration, setAudioDuration] = useState(0)
  const [audioArtwork, setAudioArtwork] = useState<string | null>(null)
  const [roomVolume, setRoomVolume] = useState(75)
  const [roomMuted, setRoomMuted] = useState(false)
  // Portal target for the YouTube iframe. ListenerNowPlaying renders
  // a 16:9 div in its album-art slot when the current track is YouTube
  // and forwards the ref up via the ytSlotRef callback prop. AudioEngine
  // then uses createPortal to mount the YouTubePlayer into that element.
  const [ytSlot, setYtSlot] = useState<HTMLDivElement | null>(null)

  // Report track duration to server for autoplay rooms
  const lastReportedDuration = useRef("")
  const handleDuration = useCallback((seconds: number) => {
    setAudioDuration(seconds)
    // Report real duration to server so it can reschedule the advance timer
    if (room?.isAutoplay && ws.connected && currentTrack && seconds > 0) {
      const key = `${currentTrack.id}-${seconds}`
      if (key !== lastReportedDuration.current) {
        lastReportedDuration.current = key
        ws.reportDuration(currentTrack.id, Math.round(seconds))
      }
    }
  }, [room?.isAutoplay, ws.connected, currentTrack])

  // Prepare audio engine track from current track
  const audioTrack: AudioEngineTrack | null = useMemo(() => {
    const track = currentTrack ?? room?.nowPlaying
    if (!track) return null
    const parsed = parseTrackUrl(track.sourceUrl)
    return {
      id: track.id,
      source: (track.source || parsed?.source || "mp3") as "youtube" | "soundcloud" | "mp3",
      sourceUrl: track.sourceUrl,
      videoId: parsed?.videoId,
    }
  }, [currentTrack, room?.nowPlaying])

  // Lock-screen / OS-media-hub metadata for the Media Session API —
  // title/artist from the live track, artwork from the SoundCloud-
  // derived art when the engine has emitted one.
  const mediaMetadata: AudioEngineMediaMetadata | undefined = useMemo(() => {
    const track = currentTrack ?? room?.nowPlaying
    if (!track) return undefined
    return {
      title: track.title || "Untitled",
      artist: track.artist || "Unknown artist",
      artworkUrl: audioArtwork,
    }
  }, [currentTrack, room?.nowPlaying, audioArtwork])

  // Track when the current track started playing locally (for autoplay debounce)
  const trackStartTimeRef = useRef(0)
  useEffect(() => {
    if (currentTrack?.id) {
      trackStartTimeRef.current = Date.now()
    }
  }, [currentTrack?.id])

  const handleTrackEnd = useCallback(() => {
    // DJ's client triggers auto-advance (debounced to prevent double-advance)
    if (isDJ && ws.connected) {
      const now = Date.now()
      if (now - lastSkipRef.current < 2000) return
      lastSkipRef.current = now
      ws.djSkip()
    }
    // For autoplay rooms, any listener reports track ended
    // But only if we've been playing for at least 15 seconds to prevent seek-past-end loops
    if (room?.isAutoplay && ws.connected) {
      const playedFor = Date.now() - trackStartTimeRef.current
      if (playedFor > 15000) {
        ws.sendAutoplayEnd()
      }
    }
  }, [isDJ, ws.connected, ws.djSkip, ws.sendAutoplayEnd, room?.isAutoplay]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmitTrack = useCallback(async (track: { title: string; artist: string; duration: number; source: string; sourceUrl: string }): Promise<SubmitTrackResult> => {
    if (ws.connected) {
      // Resolves ok:true once the server confirms (submit_result, a
      // new-entry queue echo, or the pending-approval announcement);
      // ok:false on a submit-rejection error reply, disconnect, or
      // timeout.
      return ws.submitTrack(track)
    }
    // Fallback to REST API
    try {
      const { submitTrack: submitTrackAPI } = await import("@/lib/api")
      await submitTrackAPI(slug, track, djKey ?? undefined)
      // Refresh room data to get updated queue
      const detail = await getRoom(slug)
      setRoom(toFrontendRoom(detail.room, detail.nowPlaying, detail.queue, detail.recentChat))
      return { ok: true }
    } catch (err) {
      console.error("[submit-track] REST fallback failed:", err)
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to submit track",
      }
    }
  }, [ws.connected, ws.submitTrack, slug, djKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // DjDeck fires onSubmitTrack without awaiting the result (unlike
  // RequestModal, which renders it inline), so surface failures here
  // as toasts — otherwise a rejected deck submit gives no feedback.
  const handleDeckSubmitTrack = useCallback(
    (track: { title: string; artist: string; duration: number; source: string; sourceUrl: string }) => {
      void handleSubmitTrack(track).then((result) => {
        if (!result.ok) {
          toast.error(result.error || "Failed to add track")
        }
      })
    },
    [handleSubmitTrack]
  )

  const handleDJTogglePlay = useCallback(() => {
    if (!isDJ || !ws.connected) return
    if (audioPlaying) {
      ws.djPause()
    } else {
      ws.djResume()
    }
  }, [isDJ, ws.connected, ws.djPause, ws.djResume, audioPlaying]) // eslint-disable-line react-hooks/exhaustive-deps

  const lastSkipRef = useRef(0)
  const handleSkip = useCallback(() => {
    if (isDJ && ws.connected) {
      const now = Date.now()
      if (now - lastSkipRef.current < 2000) return // debounce 2s
      lastSkipRef.current = now
      ws.djSkip()
    }
  }, [isDJ, ws.connected, ws.djSkip]) // eslint-disable-line react-hooks/exhaustive-deps

  // Media Session transport (hardware media keys / lock screen). Only
  // wired for the DJ, where play/pause carries room-pause semantics —
  // the same dj_resume/dj_pause the deck buttons send. Listeners get no
  // handlers here: the engine pauses locally and remembers it so its
  // re-sync loop doesn't silently un-pause them.
  const handleMediaPlay = useCallback(() => {
    if (ws.connected) ws.djResume()
  }, [ws.connected, ws.djResume]) // eslint-disable-line react-hooks/exhaustive-deps
  const handleMediaPause = useCallback(() => {
    if (ws.connected) ws.djPause()
  }, [ws.connected, ws.djPause]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGoLive = useCallback(async () => {
    if (!isDJ || queueTracks.length === 0 || !djKey) return
    if (ws.connected) {
      ws.djGoLive()
    } else {
      // Fallback to REST API
      try {
        const { goLive: goLiveAPI } = await import("@/lib/api")
        const firstTrack = queueTracks[0]
        await goLiveAPI(slug, djKey, {
          trackTitle: firstTrack.title,
          trackArtist: firstTrack.artist,
          trackDuration: firstTrack.duration,
          trackSource: firstTrack.source,
          trackSourceUrl: firstTrack.sourceUrl,
        })
        // Refresh room data to pick up the new playback state
        const detail = await getRoom(slug)
        setRoom(toFrontendRoom(detail.room, detail.nowPlaying, detail.queue, detail.recentChat))
      } catch (err) {
        console.error("[go-live] failed:", err)
      }
    }
  }, [isDJ, ws.connected, ws.djGoLive, djKey, slug, queueTracks]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Stable props for the memoized room columns ───────────────────────────
  // These hooks keep prop identities steady across the page re-renders
  // that remain (listener list, queue, tube, connection status) so the
  // React.memo on each column actually bails out.

  const handleSave = useCallback(() => {
    const track = currentTrack ?? room?.nowPlaying ?? null
    if (!track) return
    const wasLiked = isLiked(track.id)
    toggleLike(track)
    toast.success(wasLiked ? "Removed from Liked" : "Saved to Liked")
  }, [currentTrack, room?.nowPlaying, isLiked, toggleLike]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpenRequestModal = useCallback(() => setRequestModalOpen(true), [])
  const handleCloseRequestModal = useCallback(() => setRequestModalOpen(false), [])
  const handleOpenSendNeon = useCallback(() => setSendNeonOpen(true), [])
  const handleCloseSendNeon = useCallback(() => setSendNeonOpen(false), [])

  const handleRequestStatusChange = useCallback(
    (status: "open" | "paused" | "closed") => {
      if (!ws.connected) return
      const policyMap: Record<string, string> = {
        open: "open",
        paused: "approval",
        closed: "closed",
      }
      ws.djSetPolicy(policyMap[status] || "closed")
    },
    [ws.connected, ws.djSetPolicy] // eslint-disable-line react-hooks/exhaustive-deps
  )

  // Neon tube state — memoized (the previous inline spread minted a new
  // object per render, which would defeat NeonTube's memo).
  const tubeState = useWsData ? ws.tube : mockTube
  const tubeWithPrestige = useMemo(
    () =>
      tubeState
        ? {
            ...tubeState,
            prestigeCount:
              tubeState.prestigeCount || localPrestige || mockTube.prestigeCount,
          }
        : null,
    [tubeState, localPrestige, mockTube.prestigeCount]
  )

  // ─── Screen-reader track announcements ────────────────────────────────────
  // A visually hidden polite live region (rendered near the top of the
  // page below) says "Now playing: X by Y" whenever the current track
  // changes mid-session — track swaps are otherwise silent to screen
  // readers. The first observed track (initial page load) is not
  // announced; it's already part of the rendered page.
  const announceTrack = currentTrack ?? room?.nowPlaying ?? null
  const [trackAnnouncement, setTrackAnnouncement] = useState("")
  const lastAnnouncedTrackRef = useRef<string | null>(null)
  useEffect(() => {
    const track =
      announceTrack && announceTrack.id !== "placeholder" ? announceTrack : null
    const key = track ? `${track.title}|${track.artist}` : null
    if (lastAnnouncedTrackRef.current === null) {
      lastAnnouncedTrackRef.current = key ?? ""
      return
    }
    if (track && key !== lastAnnouncedTrackRef.current) {
      lastAnnouncedTrackRef.current = key
      setTrackAnnouncement(
        track.artist
          ? `Now playing: ${track.title} by ${track.artist}`
          : `Now playing: ${track.title}`
      )
    }
  }, [announceTrack])

  // ─── Error / loading states ───────────────────────────────────────────────
  // Restyled to match the redesigned palette. No global navbar — the
  // in-room nav replaces it; these error states render only a back link.

  const errorShell = (title: string, body: string, action?: ReactNode) => (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: "var(--ink)", color: "var(--ink-foreground)" }}
    >
      <div className="flex flex-col items-center gap-3 px-6 text-center">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid var(--hairline-strong)" }}
        >
          <Radio className="h-6 w-6" style={{ color: "var(--brand-amber)" }} />
        </div>
        <h1 className="text-base font-semibold">{title}</h1>
        <p className="max-w-sm text-sm" style={{ color: "var(--text-low)" }}>
          {body}
        </p>
        {action ? (
          <>
            {action}
            <Link
              href="/"
              className="text-xs underline underline-offset-2"
              style={{ color: "var(--text-low)" }}
            >
              Back to Discover
            </Link>
          </>
        ) : (
          <Link
            href="/"
            className="mt-2 rounded-full px-5 py-2 text-sm font-semibold"
            style={{ background: "var(--brand-amber)", color: "var(--ink)" }}
          >
            Back to Discover
          </Link>
        )}
      </div>
    </div>
  )

  if (notFound) {
    return errorShell(
      "This room doesn't exist",
      "It may have been deleted, or the link may be mistyped."
    )
  }

  if (loadError) {
    return errorShell(
      "Couldn't load this room",
      "Something went wrong while loading the room. Check your connection and try again.",
      <button
        type="button"
        onClick={retryLoad}
        className="mt-2 rounded-full px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
        style={{ background: "var(--brand-amber)", color: "var(--ink)" }}
      >
        Retry
      </button>
    )
  }

  if (ws.roomEnded) {
    return errorShell(
      "Session ended",
      ws.roomEndedReason || "The DJ has ended this session."
    )
  }

  if (!room) {
    // Only reachable on the fallback path (no initialData from the
    // server) while the client fetch is in flight — mirrors the
    // route-level loading.tsx so the shell doesn't jump.
    return <RoomSkeleton />
  }

  // ─── Derived render data ──────────────────────────────────────────────────

  // Can be null even while playback state exists — e.g. the transient
  // between a reconnect's playback_state and its track_changed replay
  // when the REST snapshot had no nowPlaying either. The render below
  // must not assume hasRealPlayback implies a track (see the
  // !displayTrack guard on the now-playing branch).
  const displayTrack = currentTrack ?? room.nowPlaying

  // Connection banner visibility — also feeds the grid min-height so
  // the banner doesn't push the page past the viewport (see below).
  const showConnectionBanner =
    ws.connectionStatus !== "connected" && (ws.everConnected || wsGraceOver)

  const djInitials = (room.djName || "DJ").slice(0, 2).toUpperCase()

  // Subtitle shown under the DJ name: genre + (optional) description.
  const djSubtitle = [room.genre, room.description]
    .filter(Boolean)
    .join(" · ")

  // Determine whether a real track is playing. This gates the listener
  // "waiting" fallback and the DJ "Go Live" prompt. wsHasPlayback is a
  // derived boolean — it only re-renders this page when playback state
  // appears or disappears, not on every playback_state broadcast.
  const apiHasTrack = !!room.nowPlaying && room.nowPlaying.id !== "placeholder"
  const hasRealPlayback = !!(wsCurrentTrack || wsHasPlayback || apiHasTrack)

  // DJ view, idle — show the Go Live prompt instead of the now-playing hero.
  const showDjGoLive = !hasRealPlayback && isDJ

  // Listener view, idle — show a muted waiting message instead.
  const showWaiting = !hasRealPlayback && !isDJ

  // Whether the listener should see the "DJ is speaking" chip inline.
  const djSpeaking = !isDJ && (ws.djMicActive || liveKit.djSpeaking)

  // Effective mobile pane (only consulted below md — every desktop
  // visibility class has an md: reset). Default: DJs land on the deck
  // once the room is live (pre-live they see the Go Live prompt on the
  // now-playing pane); listeners land on now-playing. Panes the current
  // role can't reach (deck for listeners, queue for DJs — possible for
  // the brief window before the DJ key loads from sessionStorage) fall
  // back to the main pane.
  const requestedMobileTab =
    mobileTabChoice ?? (isDJ && !showDjGoLive ? "deck" : "main")
  const mobileTab: MobileRoomTab = isDJ
    ? requestedMobileTab === "queue"
      ? "main"
      : requestedMobileTab
    : requestedMobileTab === "deck"
      ? "main"
      : requestedMobileTab

  // One-line "Title — Artist" for the mobile strip that keeps the
  // current track visible while the now-playing pane is hidden.
  const mobileNowPlayingLabel =
    hasRealPlayback && displayTrack && displayTrack.id !== "placeholder"
      ? [displayTrack.title || "Untitled", displayTrack.artist]
          .filter(Boolean)
          .join(" — ")
      : null

  // Choose the effective audio artwork: SoundCloud-derived first, then
  // whatever the engine has already emitted.
  const effectiveAlbumArt = audioArtwork || null

  // Derive a compact hype summary for the DJ deck.
  const djHypeScore = (() => {
    const raw =
      hypeTracking.recentTips * 2 +
      hypeTracking.recentChats * 0.5 +
      hypeTracking.recentReactions * 1
    return Math.min(100, Math.round((raw / 50) * 100))
  })()
  const djHypeLabel =
    djHypeScore >= 80 ? "On fire" : djHypeScore >= 50 ? "Hyped" : djHypeScore >= 25 ? "Warming" : "Chill"
  const djHypeColor =
    // Must stay raw hex: DjDeck derives alpha shades via `${hypeColor}15`
    // string concatenation (8-digit hex), which breaks with var().
    djHypeScore >= 80 ? "#ff5a3a" : djHypeScore >= 50 ? "#e89a3c" : djHypeScore >= 25 ? "#4a8fe8" : "#8a8a9a"

  return (
    // Below md the page is a fixed-height app shell (nav + tab bar +
    // one pane, each pane scrolling internally) so chat and DJ controls
    // are always reachable without scrolling past the whole stack.
    // md+ restores the original block layout — h-auto/min-h-screen/
    // overflow-visible make it pixel-identical to the old
    // className="min-h-screen".
    <div
      className="flex h-dvh flex-col overflow-hidden md:block md:h-auto md:min-h-screen md:overflow-visible"
      style={{ background: "var(--ink)", color: "var(--ink-foreground)" }}
    >
      {/* Supernova explosion — full-screen particle burst when level 5 maxes out.
          Uses backend event when available, falls back to local detection. */}
      <SupernovaExplosion
        active={!!(ws.supernovaEvent || localSupernovaEvent || mockSupernovaEvent)}
        activatedBy={(ws.supernovaEvent || localSupernovaEvent || mockSupernovaEvent)?.activatedBy}
      />

      {/* Room effect overlay — persistent visual theme unlocked by Supernova.
          Uses backend event when available, falls back to local state. */}
      <RoomEffectOverlay effect={ws.activeRoomEffect || localRoomEffect || mockRoomEffect} />

      {/* Visually hidden live region — announces track changes to
          screen readers ("Now playing: X by Y"). */}
      <div className="sr-only" role="status" aria-live="polite">
        {trackAnnouncement}
      </div>

      {/* Audio engine mounts once per track so playback keeps running while
          the listener browses. For YouTube tracks, it portals the iframe
          into the album-art slot inside ListenerNowPlaying (via ytSlot) so
          the video is the primary visual instead of a hidden corner
          fallback. Non-YouTube tracks don't use the slot. */}
      {audioTrack && (
        <RoomAudioEngine
          track={audioTrack}
          volume={roomVolume}
          muted={roomMuted}
          isDJ={isDJ}
          visible={false}
          inlineTarget={ytSlot}
          forcePaused={isDJ ? (micActive && micPausesMusic) : (ws.djMicActive && ws.djMicPauseMusic)}
          onDuration={handleDuration}
          onTrackEnd={handleTrackEnd}
          onPlayStateChange={setAudioPlaying}
          onArtwork={setAudioArtwork}
          mediaMetadata={mediaMetadata}
          onMediaPlay={isDJ ? handleMediaPlay : undefined}
          onMediaPause={isDJ ? handleMediaPause : undefined}
          onMediaNextTrack={isDJ ? handleSkip : undefined}
        />
      )}

      {/* Compact in-room nav */}
      <ListenerNav
        roomName={room.name}
        isLive={room.isLive}
        listenerCount={listenerCount}
      />

      {/* Connection banner — slim, non-blocking strip under the nav
          whenever the room socket isn't live. The room stays fully
          rendered with last-known data; reconnection is automatic
          (indefinite jittered backoff plus online/visibility
          re-triggers), so this is a status signal, not a dead end.
          Hidden during the initial handshake grace window so it
          doesn't flash on every page load. Fixed 28px tall on md+ so
          the grid's min-height calc below can account for it exactly
          (mobile's h-dvh shell absorbs it via flex). */}
      {showConnectionBanner && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-center gap-2 md:h-[28px]"
          style={{
            paddingBlock: "5px",
            paddingInline: "var(--space-md)",
            background: "rgba(255,255,255,0.03)",
            borderBottom: "0.5px solid var(--hairline)",
            color: "var(--text-mid)",
            fontSize: "var(--fs-small)",
          }}
        >
          <span
            className="h-[6px] w-[6px] shrink-0 animate-pulse rounded-full motion-reduce:animate-none"
            style={{ background: "var(--brand-amber)" }}
          />
          {ws.connectionStatus === "offline"
            ? "You're offline — we'll reconnect when your connection returns"
            : ws.everConnected
              ? "Connection lost — reconnecting…"
              : "Connecting to the room…"}
        </div>
      )}

      {/* Mobile pane switcher — below md the room columns render as
          tabbed panes (now playing / chat / queue, plus the deck for
          DJs) so chat and host controls are one tap away instead of a
          full-stack scroll. Hidden on md+ where all columns are
          visible side by side. */}
      <RoomMobileTabs
        activeTab={mobileTab}
        onTabChange={setMobileTabChoice}
        isDJ={isDJ}
        pendingCount={ws.pendingRequests.length}
        nowPlayingLabel={mobileNowPlayingLabel}
      />
      <MobileTabFocusGuard tab={mobileTab} />

      {/* Main grid — 2 columns for listeners, 3 columns for DJs.
          The DJ third column ("deck") holds all host controls. Below
          md the columns become the tabbed panes driven by mobileTab:
          the active pane fills the remaining shell height (flex-1) and
          scrolls internally; inactive panes are display:none'd via
          their wrappers. The md min-height fills the viewport below
          the 56px nav — minus the 28px connection banner while it's
          shown, so the banner doesn't push a scrollbar onto an
          otherwise viewport-height page. */}
      <div
        className={
          isDJ
            ? `shell-narrow flex min-h-0 flex-1 flex-col ${
                showConnectionBanner
                  ? "md:min-h-[calc(100vh-56px-28px)]"
                  : "md:min-h-[calc(100vh-56px)]"
              } md:grid md:grid-cols-[minmax(0,1fr)_clamp(240px,20vw,320px)_clamp(260px,20vw,320px)]`
            : `shell-narrow flex min-h-0 flex-1 flex-col ${
                showConnectionBanner
                  ? "md:min-h-[calc(100vh-56px-28px)]"
                  : "md:min-h-[calc(100vh-56px)]"
              } md:grid md:grid-cols-[minmax(0,1fr)_clamp(260px,22vw,360px)]`
        }
      >
        {/* Left: now playing + DJ context + queue. <main> landmark —
            the room page has no global <main> wrapper, and the chat
            column is a complementary <aside>. On mobile it hosts both
            the now-playing and (for listeners) queue panes, scrolling
            internally; hidden while the chat/deck panes are active. */}
        <main
          className={`${
            mobileTab === "chat" || mobileTab === "deck"
              ? "hidden md:flex"
              : "flex"
          } min-h-0 flex-1 flex-col overflow-y-auto md:min-h-[auto] md:flex-initial md:overflow-visible md:border-r md:border-white/[0.06]`}
        >
          {/* Now-playing pane content — mobile: visible only on the
              now-playing tab. md:contents removes the wrapper from
              desktop layout entirely, keeping it pixel-identical. */}
          <div
            className={mobileTab === "main" ? "contents" : "hidden md:contents"}
          >
          {showDjGoLive ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid color-mix(in oklab, var(--brand-amber) 30%, transparent)",
                }}
              >
                <Play className="h-8 w-8" style={{ color: "var(--brand-amber)" }} />
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ color: "var(--ink-foreground)" }}>
                  Ready to go live
                </h2>
                <p className="mt-1 text-sm" style={{ color: "var(--text-low)" }}>
                  {queueTracks.length > 0
                    ? `${queueTracks.length} track${queueTracks.length !== 1 ? "s" : ""} in queue — hit play to start`
                    : "Add tracks to the queue, then start playing"}
                </p>
              </div>
              {queueTracks.length > 0 && (
                <button
                  type="button"
                  onClick={handleGoLive}
                  className="flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ background: "var(--brand-amber)", color: "var(--ink)" }}
                >
                  <Play className="h-4 w-4" />
                  Go live
                </button>
              )}
            </div>
          ) : showWaiting || !displayTrack ? (
            // Also the guard for hasRealPlayback-without-a-track: a
            // playback_state can land before its track_changed (and
            // before any REST nowPlaying), leaving displayTrack null
            // for a beat — show this waiting presentation instead of
            // crashing on displayTrack.title below.
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <div
                className="h-14 w-14 rounded-full"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "0.5px solid var(--hairline-strong)",
                }}
              />
              <p className="text-sm" style={{ color: "var(--text-low)" }}>
                Waiting for the DJ to start playing...
              </p>
            </div>
          ) : (
            <>
              <ListenerNowPlaying
                djName={room.djName}
                djSubtitle={djSubtitle}
                djInitials={djInitials}
                trackTitle={displayTrack.title || "Untitled"}
                trackArtist={displayTrack.artist || "Unknown artist"}
                progressEnabled={useWsData}
                duration={
                  audioDuration > 0
                    ? audioDuration
                    : displayTrack.duration || 0
                }
                isPlaying={audioPlaying}
                djSpeaking={djSpeaking}
                onSave={handleSave}
                onRequest={handleOpenRequestModal}
                requestDisabled={serverPolicy === "closed"}
                albumArtUrl={effectiveAlbumArt}
                albumGradient={displayTrack.albumGradient}
                soundCloudUrl={
                  audioTrack?.source === "soundcloud"
                    ? audioTrack.sourceUrl
                    : undefined
                }
                isYouTube={audioTrack?.source === "youtube"}
                ytSlotRef={setYtSlot}
              />

              <ListenerDjContext
                djName={room.djName}
                djInitials={djInitials}
                infoSnippet={displayTrack?.infoSnippet ?? ""}
                fallbackAnnouncement={fallbackAnnouncement}
              />
            </>
          )}

          {/* Neon tube — visible to listeners only. Shows the room's
              energy level powered by neon donations. Clicking opens
              the send-neon modal. (tubeWithPrestige merges the local
              prestige count until the backend supports it.) */}
          {!isDJ && (
            <NeonTube
              tube={tubeWithPrestige}
              powerUp={useWsData ? ws.lastPowerUp : mockPowerUp}
              onSendNeon={handleOpenSendNeon}
            />
          )}
          </div>

          {/* Queue — always render, even in idle state, so DJs can see
              what's lined up. Mobile: its own pane for listeners; part
              of the now-playing pane for DJs (who have no queue tab). */}
          <div
            className={
              (isDJ ? mobileTab === "main" : mobileTab === "queue")
                ? "contents"
                : "hidden md:contents"
            }
          >
            <ListenerQueue tracks={queueTracks} />
          </div>

          {/* "Trouble listening?" — listener-only footer link to help page.
              Isolated leaf because it embeds the live playback position
              in its href (subscribes to the playback-state slice). */}
          {!isDJ && (
            <div
              className={
                mobileTab === "main" ? "contents" : "hidden md:contents"
              }
            >
              <TroubleListeningLink
                slug={slug}
                roomName={room?.name}
                currentTrack={currentTrack}
              />
            </div>
          )}

          {/* DJ controls live in the DjDeck third column (added below
              after the chat column when isDJ). */}
        </main>

        {/* Right: chat column — subscribes to the chat slice itself so
            incoming messages re-render only this column. Mobile: the
            chat pane (stays mounted while hidden so live messages,
            composer text and the mic keep working). */}
        <div className={mobileTab === "chat" ? "contents" : "hidden md:contents"}>
          <ListenerChatColumn
            fallbackMessages={room.chatMessages}
            useWsData={useWsData}
            listeners={ws.listeners}
            listenerCount={listenerCount}
            onSendMessage={ws.connected && !chatGate ? ws.sendChat : undefined}
            onSendReaction={ws.connected ? ws.sendReaction : undefined}
            connected={ws.connected}
            chatGate={chatGate}
            djName={room.djName}
            overlayRef={chatOverlayRef}
          />
        </div>

        {/* Third column — DJ deck with all host controls. Only
            renders when the user is a DJ; pushes the grid from
            2 columns to 3. Mobile: the deck pane, first in the DJ's
            tab order so transport/mic/approvals are one tap away. */}
        {isDJ && (
          <div className={mobileTab === "deck" ? "contents" : "hidden md:contents"}>
          <DjDeck
            djName={room.djName}
            djInitials={djInitials}
            requestStatus={requestStatus as "open" | "paused" | "closed"}
            onRequestStatusChange={handleRequestStatusChange}
            audioPlaying={audioPlaying}
            onTogglePlay={handleDJTogglePlay}
            onSkip={handleSkip}
            onMicChange={handleMicChange}
            onSubmitTrack={handleDeckSubmitTrack}
            onEndRoom={ws.connected ? ws.djEndRoom : undefined}
            listenerCount={listenerCount}
            pendingRequests={ws.pendingRequests}
            onApprove={ws.djApprove}
            onReject={ws.djReject}
            hypeScore={djHypeScore}
            hypeLabel={djHypeLabel}
            hypeColor={djHypeColor}
            recentTips={hypeTracking.recentTips}
            recentChats={hypeTracking.recentChats}
            recentReactions={hypeTracking.recentReactions}
          />
          </div>
        )}
      </div>

      {/* Modals */}
      <RequestModal
        open={requestModalOpen}
        onClose={handleCloseRequestModal}
        isDJ={isDJ}
        onSubmitTrack={handleSubmitTrack}
      />
      <SendNeonModal
        open={sendNeonOpen}
        onClose={handleCloseSendNeon}
        roomId={room?.id ?? ""}
        neonBalance={(authUser as any)?.neonBalance ?? 0}
        onNeonSent={handleNeonSent}
      />
    </div>
  )
}

// Re-anchors keyboard/switch-access focus after a mobile pane switch.
// Below md the pane wrappers display:none whatever currently holds
// focus (e.g. the chat composer), which silently drops focus to
// <body> and breaks the tab order. When the active pane changes and
// focus was dropped, move it to the active tab button — the one
// element guaranteed visible in the new state (focus that survived
// the switch is left alone). On md+ the tab bar is display:none, so
// the focus() call is a no-op and desktop focus is never stolen.
// Lives in its own leaf because the effective pane is derived after
// RoomClient's loading/error early returns, where hooks can't go.
function MobileTabFocusGuard({ tab }: { tab: MobileRoomTab }) {
  const prevTabRef = useRef(tab)
  useEffect(() => {
    if (prevTabRef.current === tab) return
    prevTabRef.current = tab
    const active = document.activeElement
    if (active && active !== document.body) return
    document
      .querySelector<HTMLButtonElement>(`[data-room-tab="${tab}"]`)
      ?.focus()
  }, [tab])
  return null
}

// "Trouble listening?" help link. Lives in its own leaf because the
// href embeds the current playback position — subscribing to the
// playback-state slice down here means playback_state broadcasts
// re-render just this link instead of the whole room page.
function TroubleListeningLink({
  slug,
  roomName,
  currentTrack,
}: {
  slug: string
  roomName?: string
  currentTrack: Track | null
}) {
  const playbackState = useRoomPlaybackState()

  let rawPos = 0
  if (playbackState) {
    // startedAt is a SERVER timestamp — correct our wall clock by the
    // offset from the WS handshake (0 when unknown) like the audio
    // engine does, so a clock-skewed visitor reports a sane position.
    rawPos = playbackState.isPlaying && playbackState.startedAt > 0
      ? Math.max(0, (Date.now() + clockOffsetSlice.get() - playbackState.startedAt) / 1000)
      : playbackState.pausePosition
  }
  const playbackPos = Math.round(rawPos * 10) / 10

  return (
    <div className="flex justify-center py-4">
      <Link
        href={`/help/listening?${new URLSearchParams({
          room: slug,
          ...(roomName ? { roomName } : {}),
          ...(currentTrack?.id ? { track: currentTrack.id } : {}),
          ...(currentTrack?.title ? { trackTitle: currentTrack.title } : {}),
          ...(currentTrack?.artist ? { trackArtist: currentTrack.artist } : {}),
          ...(playbackPos ? { pos: String(playbackPos) } : {}),
        }).toString()}`}
        className="font-sans text-xs underline underline-offset-2"
        style={{ color: "var(--text-low)" }}
      >
        Trouble listening?
      </Link>
    </div>
  )
}
