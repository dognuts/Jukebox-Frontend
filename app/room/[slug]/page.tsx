"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Play, Radio } from "lucide-react"
import { PendingRequests } from "@/components/room/pending-requests"
import { DJControls } from "@/components/room/dj-controls"
import { RequestModal } from "@/components/room/request-modal"
import { ListenerNav } from "@/components/room/listener-nav"
import { ListenerNowPlaying } from "@/components/room/listener-now-playing"
import { ListenerDjContext } from "@/components/room/listener-dj-context"
import { ListenerQueue } from "@/components/room/listener-queue"
import { ListenerChatColumn } from "@/components/room/listener-chat-column"
import { type Room, type Track, type ChatMessage, getRoomBySlug, rooms } from "@/lib/mock-data"
import { usePlayer } from "@/lib/player-context"
import { usePlaylist } from "@/lib/playlist-context"
import { getRoom, toFrontendRoom, type RoomDetail } from "@/lib/api"
import { useRoomWebSocket } from "@/hooks/use-room-websocket"
import { AudioEngine, type AudioEngineTrack } from "@/components/player/audio-engine"
import { parseTrackUrl } from "@/lib/track-utils"
import { SendNeonModal } from "@/components/room/send-neon-modal"
import { useAuth } from "@/lib/auth-context"
import { HypeMeter, useHypeTracking } from "@/components/room/hype-meter"
import { IntermissionScheduler } from "@/components/room/intermission-scheduler"
import { useLiveKitVoice } from "@/hooks/use-livekit-voice"

export default function RoomPage() {
  const params = useParams()
  const slug = params.slug as string

  // DJ key from sessionStorage (set when creating a room)
  const [djKey, setDjKey] = useState<string | null | undefined>(undefined) // undefined = not loaded yet
  useEffect(() => {
    if (typeof window !== "undefined") {
      const key = sessionStorage.getItem(`djKey:${slug}`)
      setDjKey(key) // null if not found, string if found
    }
  }, [slug])

  // Room data — try API first, fall back to mock
  const [room, setRoom] = useState<Room | null>(null)
  const [usingMock, setUsingMock] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const { setRoom: setPlayerRoom, updateTrack, updatePlaybackTime, close: closePlayer } = usePlayer()
  const { toggleLike, isLiked } = usePlaylist()

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const detail = await getRoom(slug)
        if (!cancelled) {
          setRoom(toFrontendRoom(detail.room, detail.nowPlaying, detail.queue, detail.recentChat))
        }
      } catch {
        if (!cancelled) {
          setUsingMock(true)
          const mock = getRoomBySlug(slug) || rooms[0]
          if (!mock) {
            setNotFound(true)
            return
          }
          setRoom(mock)
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // WebSocket for real-time updates (only when not using mock)
  const ws = useRoomWebSocket({
    slug,
    djKey,
    disabled: notFound,
    onError: (msg) => console.warn("[ws error]", msg),
    onReaction: handleIncomingReaction,
  })

  const isDJ = !!djKey

  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [sendNeonOpen, setSendNeonOpen] = useState(false)
  const tubeBarRef = useRef<HTMLDivElement>(null)
  const { user: authUser } = useAuth()
  const [micActive, setMicActive] = useState(false)
  const [micPausesMusic, setMicPausesMusic] = useState(true)

  // LiveKit voice — DJ broadcasts mic, listeners receive DJ audio
  const liveKit = useLiveKitVoice({
    roomSlug: slug || "",
    isDJ,
    enabled: !!room && room.isLive && !room.isAutoplay,
  })

  // Hype tracking for DJ view only
  const hypeTracking = useHypeTracking()

  // Connect hype tracking to real WS events — only for DJs
  const prevChatCountRef = useRef(0)
  useEffect(() => {
    if (!isDJ || !ws.connected) return
    const newCount = ws.chatMessages.length
    if (newCount > prevChatCountRef.current) {
      const newMessages = ws.chatMessages.slice(prevChatCountRef.current)
      for (const msg of newMessages) {
        if ((msg.type as string) === "activity_tip") {
          hypeTracking.recordTip()
        } else if (msg.type === "message") {
          hypeTracking.recordChat()
        }
      }
    }
    prevChatCountRef.current = newCount
  }, [ws.chatMessages.length, ws.connected, isDJ]) // eslint-disable-line react-hooks/exhaustive-deps

  // Track reactions via the onReaction callback
  hypeReactionRef.current = hypeTracking.recordReaction

  // Mock tube state for when backend is not connected (kept so Send Neon
  // can still give local feedback — tube visual is no longer rendered but
  // the state is still used by the Neon modal cascade.)
  const [mockTube, setMockTube] = useState({ roomId: slug || "", level: 1, fillAmount: 0, fillTarget: 100, totalNeon: 0 })
  const [mockPowerUp, setMockPowerUp] = useState<{ newLevel: number; color: string } | null>(null)

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
    if (!ws.connected) {
      setMockTube((prev) => {
        const newFill = prev.fillAmount + amount
        const newTotal = prev.totalNeon + amount
        // Check if we level up (every 100 neon)
        if (newFill >= prev.fillTarget) {
          const newLevel = Math.min(prev.level + 1, 4)
          const colors = ["oklch(0.72 0.18 195)", "oklch(0.65 0.24 330)", "oklch(0.82 0.18 80)", "oklch(0.90 0.05 0)"]
          setMockPowerUp({ newLevel, color: colors[newLevel - 1] })
          setTimeout(() => setMockPowerUp(null), 4000)
          return { level: newLevel, fillAmount: newFill - prev.fillTarget, fillTarget: 100, totalNeon: newTotal }
        }
        return { ...prev, fillAmount: newFill, totalNeon: newTotal }
      })
    }
  }, [ws.connected])

  // Use WebSocket data when connected, otherwise room data from initial fetch
  const currentTrack: Track | null = useMemo(() => {
    if (ws.connected && ws.currentTrack) {
      return {
        id: ws.currentTrack.id,
        title: ws.currentTrack.title,
        artist: ws.currentTrack.artist,
        duration: ws.currentTrack.duration,
        source: ws.currentTrack.source,
        sourceUrl: ws.currentTrack.sourceUrl,
        submittedBy: "DJ",
        albumGradient: ws.currentTrack.albumGradient || "linear-gradient(135deg, oklch(0.45 0.15 30), oklch(0.35 0.20 350))",
        infoSnippet: ws.currentTrack.infoSnippet,
      }
    }
    return room?.nowPlaying ?? null
  }, [ws.connected, ws.currentTrack, room?.nowPlaying])

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
    // When WebSocket is connected, always use its queue data (even if empty).
    // Falling back to room?.queue would show stale data from the initial REST fetch.
    if (ws.connected) {
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
      const nowPlayingId = ws.currentTrack?.id || currentTrack?.id
      if (nowPlayingId) {
        return mapped.filter((t) => t.id !== nowPlayingId)
      }
      return mapped
    }
    return room?.queue ?? []
  }, [ws.connected, ws.queue, ws.currentTrack?.id, currentTrack?.id, room?.queue, room?.isAutoplay, autoplayTracks, autoplayIndex])

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

  const chatMessages: ChatMessage[] = useMemo(() => {
    if (ws.connected) {
      return ws.chatMessages.map((m) => ({
        id: m.id,
        username: m.username,
        avatarColor: m.avatarColor,
        message: m.message,
        timestamp: new Date(m.timestamp),
        type: m.type as "message" | "request" | "announcement",
      }))
    }
    return room?.chatMessages ?? []
  }, [ws.connected, ws.chatMessages, room?.chatMessages])

  const listenerCount = ws.connected ? ws.listenerCount : (room?.listenerCount ?? 0)
  // Map server request policy to UI status
  const serverPolicy = ws.connected ? ws.requestPolicy : (room?.requestPolicy ?? "open")
  const requestStatus = serverPolicy === "approval" ? "paused" : serverPolicy as "open" | "closed"

  // Sync player context
  useEffect(() => {
    if (room && currentTrack) {
      const startedAt = ws.playbackState?.startedAt ?? Date.now()
      setPlayerRoom(room.slug, room.name, room.djName, currentTrack, startedAt)
    }
  }, [room?.slug, room?.name, room?.djName, currentTrack]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentTrack) {
      updateTrack(currentTrack)
    }
  }, [currentTrack, updateTrack])

  // Keep playback time synced for mini player continuity
  useEffect(() => {
    if (ws.playbackState?.startedAt) {
      updatePlaybackTime(ws.playbackState.startedAt)
    }
  }, [ws.playbackState?.startedAt, updatePlaybackTime])

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
  }, [liveKit, ws.connected, isDJ]) // eslint-disable-line react-hooks/exhaustive-deps

  // Audio engine state
  const [audioCurrentTime, setAudioCurrentTime] = useState(0)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [audioDuration, setAudioDuration] = useState(0)
  const [audioArtwork, setAudioArtwork] = useState<string | null>(null)
  const [roomVolume, setRoomVolume] = useState(75)
  const [roomMuted, setRoomMuted] = useState(false)

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
  }, [isDJ, ws, room?.isAutoplay])

  const handleSubmitTrack = useCallback(async (track: { title: string; artist: string; duration: number; source: string; sourceUrl: string }) => {
    if (ws.connected) {
      ws.submitTrack(track)
    } else {
      // Fallback to REST API
      try {
        const { submitTrack: submitTrackAPI } = await import("@/lib/api")
        await submitTrackAPI(slug, track, djKey ?? undefined)
        // Refresh room data to get updated queue
        const detail = await getRoom(slug)
        setRoom(toFrontendRoom(detail.room, detail.nowPlaying, detail.queue, detail.recentChat))
      } catch (err) {
        console.error("[submit-track] REST fallback failed:", err)
      }
    }
  }, [ws, slug, djKey])

  const handleDJTogglePlay = useCallback(() => {
    if (!isDJ || !ws.connected) return
    if (audioPlaying) {
      ws.djPause()
    } else {
      ws.djResume()
    }
  }, [isDJ, ws, audioPlaying])

  const lastSkipRef = useRef(0)
  const handleSkip = useCallback(() => {
    if (isDJ && ws.connected) {
      const now = Date.now()
      if (now - lastSkipRef.current < 2000) return // debounce 2s
      lastSkipRef.current = now
      ws.djSkip()
    }
  }, [isDJ, ws])

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
  }, [isDJ, ws, djKey, slug, queueTracks])

  // ─── Error / loading states ───────────────────────────────────────────────
  // Restyled to match the redesigned palette. No global navbar — the
  // in-room nav replaces it; these error states render only a back link.

  const errorShell = (title: string, body: string) => (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: "#0d0b10", color: "#e8e6ea" }}
    >
      <div className="flex flex-col items-center gap-3 px-6 text-center">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)" }}
        >
          <Radio className="h-6 w-6" style={{ color: "#e89a3c" }} />
        </div>
        <p className="text-base font-semibold">{title}</p>
        <p className="max-w-sm text-sm" style={{ color: "rgba(232,230,234,0.5)" }}>
          {body}
        </p>
        <Link
          href="/"
          className="mt-2 rounded-full px-5 py-2 text-sm font-semibold"
          style={{ background: "#e89a3c", color: "#0d0b10" }}
        >
          Back to Discover
        </Link>
      </div>
    </div>
  )

  if (notFound) {
    return errorShell(
      "Room not found",
      "This room may have been deleted or the link is invalid."
    )
  }

  if (ws.roomEnded) {
    return errorShell(
      "Session ended",
      ws.roomEndedReason || "The DJ has ended this session."
    )
  }

  if (!room) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "#0d0b10", color: "rgba(232,230,234,0.6)" }}
      >
        <p className="text-sm">Loading room...</p>
      </div>
    )
  }

  // ─── Derived render data ──────────────────────────────────────────────────

  const displayTrack = currentTrack ?? room.nowPlaying
  const djInitials = (room.djName || "DJ").slice(0, 2).toUpperCase()

  // DJ commentary body: prefer the admin-authored info snippet on the
  // current track, fall back to the most recent DJ announcement chat.
  const djAnnouncement = [...chatMessages]
    .reverse()
    .find((m) => m.type === "announcement" && m.username === room.djName)
  const djContextBody = displayTrack?.infoSnippet || djAnnouncement?.message || ""

  // Subtitle shown under the DJ name: genre + (optional) description.
  const djSubtitle = [room.genre, room.description]
    .filter(Boolean)
    .join(" · ")

  const handleSave = () => {
    if (!displayTrack) return
    const wasLiked = isLiked(displayTrack.id)
    toggleLike(displayTrack)
    toast.success(wasLiked ? "Removed from Liked" : "Saved to Liked")
  }

  // Determine whether a real track is playing. This gates the listener
  // "waiting" fallback and the DJ "Go Live" prompt.
  const apiHasTrack = !!room.nowPlaying && room.nowPlaying.id !== "placeholder"
  const hasRealPlayback = !!(ws.currentTrack || ws.playbackState || apiHasTrack)

  // DJ view, idle — show the Go Live prompt instead of the now-playing hero.
  const showDjGoLive = !hasRealPlayback && isDJ

  // Listener view, idle — show a muted waiting message instead.
  const showWaiting = !hasRealPlayback && !isDJ

  // Whether the listener should see the "DJ is speaking" chip inline.
  const djSpeaking = !isDJ && (ws.djMicActive || liveKit.djSpeaking)

  // Choose the effective audio artwork: SoundCloud-derived first, then
  // whatever the engine has already emitted.
  const effectiveAlbumArt = audioArtwork || null

  return (
    <div className="min-h-screen" style={{ background: "#0d0b10", color: "#e8e6ea" }}>
      {/* Audio engine mounts once per track so playback keeps running while
          the listener browses. Corner-rendered for YouTube to satisfy the
          ToS requirement that the iframe stay visible. */}
      {audioTrack && (
        <AudioEngine
          track={audioTrack}
          playbackState={ws.playbackState}
          volume={roomVolume}
          muted={roomMuted}
          isDJ={isDJ}
          visible={false}
          forcePaused={isDJ ? (micActive && micPausesMusic) : (ws.djMicActive && ws.djMicPauseMusic)}
          onTimeUpdate={setAudioCurrentTime}
          onDuration={handleDuration}
          onTrackEnd={handleTrackEnd}
          onPlayStateChange={setAudioPlaying}
          onArtwork={setAudioArtwork}
        />
      )}

      {/* Compact in-room nav */}
      <ListenerNav
        roomName={room.name}
        isLive={room.isLive}
        listenerCount={listenerCount}
      />

      {/* Main 2-column layout: music experience on the left, chat on the
          right. Below md the grid collapses to a single stacked column
          so the chat sits under the now-playing on phones. On lg+ the
          chat rail widens from 280px to 320px for a more comfortable
          laptop experience. */}
      <div
        className="shell-narrow flex flex-col md:grid md:grid-cols-[minmax(0,1fr)_280px] lg:grid-cols-[minmax(0,1fr)_320px]"
        style={{
          minHeight: "calc(100vh - 40px)",
        }}
      >
        {/* Left: now playing + DJ context + queue */}
        <div className="flex flex-col md:border-r md:border-white/[0.06]">
          {showDjGoLive ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(232,154,60,0.3)",
                }}
              >
                <Play className="h-8 w-8" style={{ color: "#e89a3c" }} />
              </div>
              <div>
                <h3 className="text-lg font-bold" style={{ color: "#e8e6ea" }}>
                  Ready to go live
                </h3>
                <p className="mt-1 text-sm" style={{ color: "rgba(232,230,234,0.5)" }}>
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
                  style={{ background: "#e89a3c", color: "#0d0b10" }}
                >
                  <Play className="h-4 w-4" />
                  Go live
                </button>
              )}
            </div>
          ) : showWaiting ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <div
                className="h-14 w-14 rounded-full"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "0.5px solid rgba(255,255,255,0.08)",
                }}
              />
              <p className="text-sm" style={{ color: "rgba(232,230,234,0.5)" }}>
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
                currentTime={ws.connected ? audioCurrentTime : 0}
                duration={
                  audioDuration > 0
                    ? audioDuration
                    : displayTrack.duration || 0
                }
                isPlaying={audioPlaying}
                djSpeaking={djSpeaking}
                onSave={handleSave}
                onRequest={() => setRequestModalOpen(true)}
                onSendNeon={!isDJ ? () => setSendNeonOpen(true) : undefined}
                requestDisabled={serverPolicy === "closed"}
                albumArtUrl={effectiveAlbumArt}
                albumGradient={displayTrack.albumGradient}
                soundCloudUrl={
                  audioTrack?.source === "soundcloud"
                    ? audioTrack.sourceUrl
                    : undefined
                }
              />

              <ListenerDjContext
                djName={room.djName}
                djInitials={djInitials}
                body={djContextBody}
              />
            </>
          )}

          {/* Queue — always render, even in idle state, so DJs can see
              what's lined up. */}
          <ListenerQueue tracks={queueTracks} />

          {/* DJ-only tool strip, rendered below the queue so it doesn't
              interfere with the listener-first layout. */}
          {isDJ && (
            <div
              className="flex flex-col gap-3 px-6 pb-6 pt-2"
              style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)" }}
            >
              <DJControls
                requestPolicy={room.requestPolicy}
                requestStatus={requestStatus as "open" | "paused" | "closed"}
                onRequestStatusChange={(status) => {
                  if (ws.connected) {
                    const policyMap: Record<string, string> = {
                      open: "open",
                      paused: "approval",
                      closed: "closed",
                    }
                    ws.djSetPolicy(policyMap[status] || "closed")
                  }
                }}
                onSubmitTrack={handleSubmitTrack}
                onMicChange={handleMicChange}
                onEndRoom={ws.connected ? ws.djEndRoom : undefined}
                listenerCount={listenerCount}
              />

              {ws.pendingRequests.length > 0 && (
                <PendingRequests
                  requests={ws.pendingRequests}
                  onApprove={ws.djApprove}
                  onReject={ws.djReject}
                  onApproveAll={() => ws.pendingRequests.forEach((r) => ws.djApprove(r.id))}
                  onRejectAll={() => ws.pendingRequests.forEach((r) => ws.djReject(r.id))}
                />
              )}

              <HypeMeter
                recentTips={hypeTracking.recentTips}
                recentChats={hypeTracking.recentChats}
                recentReactions={hypeTracking.recentReactions}
              />
              <IntermissionScheduler />
            </div>
          )}
        </div>

        {/* Right: chat column */}
        <ListenerChatColumn
          messages={chatMessages}
          listeners={ws.listeners}
          listenerCount={listenerCount}
          onSendMessage={ws.connected ? ws.sendChat : undefined}
          onSendReaction={ws.connected ? ws.sendReaction : undefined}
          connected={ws.connected}
          djName={room.djName}
          overlayRef={chatOverlayRef}
        />
      </div>

      {/* Modals */}
      <RequestModal
        open={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        isDJ={isDJ}
        onSubmitTrack={handleSubmitTrack}
      />
      <SendNeonModal
        open={sendNeonOpen}
        onClose={() => setSendNeonOpen(false)}
        roomId={room?.id ?? ""}
        neonBalance={(authUser as any)?.neonBalance ?? 0}
        onNeonSent={handleNeonSent}
      />
    </div>
  )
}
