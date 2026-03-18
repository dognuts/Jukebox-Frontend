"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ListMusic, MessageCircle, Inbox, PauseCircle, XCircle, Play, Radio, SkipForward, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/layout/navbar"
import { BubbleBackground } from "@/components/effects/bubble-background"
import { NowPlaying } from "@/components/room/now-playing"
import { SaveTrackMenu } from "@/components/room/save-track-menu"
import { TrackQueue } from "@/components/room/track-queue"
import { PendingRequests } from "@/components/room/pending-requests"
import { ChatPanel } from "@/components/room/chat-panel"
import { ListenerBar } from "@/components/room/listener-bar"
import { DJControls } from "@/components/room/dj-controls"
import { RequestModal } from "@/components/room/request-modal"
import { NeonArches } from "@/components/effects/neon-arches"
import { type Room, type Track, type ChatMessage, getRoomBySlug, rooms } from "@/lib/mock-data"
import { usePlayer } from "@/lib/player-context"
import { getRoom, toFrontendRoom, type RoomDetail } from "@/lib/api"
import { useRoomWebSocket } from "@/hooks/use-room-websocket"
import { AudioEngine, type AudioEngineTrack } from "@/components/player/audio-engine"
import { parseTrackUrl } from "@/lib/track-utils"
import { NeonTubeViz } from "@/components/room/neon-tube"
import { SendNeonModal } from "@/components/room/send-neon-modal"
import { DJSubscribeCard } from "@/components/room/dj-subscribe-card"
import { useAuth } from "@/lib/auth-context"

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
  const { setRoom: setPlayerRoom, updateTrack, close: closePlayer } = usePlayer()

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
          // Always fall back to mock — only show not found if mock also has nothing
          setUsingMock(true)
          const mock = getRoomBySlug(slug) || rooms[0]
          if (!mock) {
            setNotFound(true)
            closePlayer()
            return
          }
          setRoom(mock)
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, [slug, closePlayer])

  // Ref for chat panel reaction overlay (to fire incoming WS reactions)
  const chatOverlayRef = useRef<HTMLDivElement>(null)

  const handleIncomingReaction = useCallback((emoji: string) => {
    // Call _fireReaction on the chat overlay element (set by ChatPanel)
    const overlay = chatOverlayRef.current as any
    if (overlay?._fireReaction) {
      overlay._fireReaction(emoji)
    }
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
  const { user: authUser } = useAuth()
  const [mobilePanel, setMobilePanel] = useState<"queue" | "chat">("chat")
  const [micActive, setMicActive] = useState(false)
  const [micPausesMusic, setMicPausesMusic] = useState(true)

  // Mock tube state for when backend is not connected
  const [mockTube, setMockTube] = useState({ roomId: slug || "", level: 1, fillAmount: 35, fillTarget: 100, totalNeon: 35 })
  const [mockPowerUp, setMockPowerUp] = useState<{ newLevel: number; color: string } | null>(null)

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
      }
    }
    return room?.nowPlaying ?? null
  }, [ws.connected, ws.currentTrack, room?.nowPlaying])

  const queueTracks: Track[] = useMemo(() => {
    if (ws.connected && ws.queue.length > 0) {
      return ws.queue.map((e) => ({
        id: e.track.id,
        title: e.track.title,
        artist: e.track.artist,
        duration: e.track.duration,
        source: e.track.source,
        sourceUrl: e.track.sourceUrl,
        submittedBy: e.submittedBy,
        albumGradient: e.track.albumGradient || "linear-gradient(135deg, oklch(0.45 0.15 30), oklch(0.35 0.20 350))",
      }))
    }
    return room?.queue ?? []
  }, [ws.connected, ws.queue, room?.queue])

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
      setPlayerRoom(room.slug, room.name, room.djName, currentTrack)
    }
  }, [room?.slug, room?.name, room?.djName, currentTrack]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentTrack) {
      updateTrack(currentTrack)
    }
  }, [currentTrack, updateTrack])

  // Close mini player when room ends
  useEffect(() => {
    if (ws.roomEnded) {
      closePlayer()
    }
  }, [ws.roomEnded, closePlayer])

  const handleMicChange = useCallback((active: boolean, pauseMusic: boolean) => {
    setMicActive(active)
    setMicPausesMusic(pauseMusic)
  }, [])

  // Audio engine state
  const [audioCurrentTime, setAudioCurrentTime] = useState(0)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [audioDuration, setAudioDuration] = useState(0)

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

  const handleTrackEnd = useCallback(() => {
    // DJ's client triggers auto-advance
    if (isDJ && ws.connected) {
      ws.djSkip()
    }
  }, [isDJ, ws])

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

  const handleSkip = useCallback(() => {
    if (isDJ && ws.connected) {
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

  // Room not found
  if (notFound) {
    return (
      <div className="relative min-h-screen">

        <div className="relative z-10">
          <Navbar />
          <div className="flex flex-col items-center justify-center gap-4 py-40">
            <p className="font-sans text-lg text-foreground">Room not found</p>
            <p className="font-sans text-sm text-muted-foreground">
              This room may have been deleted or the link is invalid.
            </p>
            <Link
              href="/"
              className="mt-2 rounded-full bg-primary px-6 py-2 font-sans text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Back to Discover
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Room ended state
  if (ws.roomEnded) {
    return (
      <div className="relative min-h-screen">

        <div className="relative z-10">
          <Navbar />
          <div className="flex flex-col items-center justify-center gap-4 py-40">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{
                background: "oklch(0.18 0.04 280)",
                border: "1px solid oklch(0.35 0.06 280 / 0.5)",
              }}
            >
              <Radio className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-sans text-lg font-semibold text-foreground">Session Ended</p>
            <p className="max-w-sm text-center font-sans text-sm text-muted-foreground">
              {ws.roomEndedReason}
            </p>
            <Link
              href="/"
              className="mt-2 rounded-full bg-primary px-6 py-2 font-sans text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Back to Discover
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (!room) {
    return (
      <div className="relative min-h-screen">

        <div className="relative z-10">
          <Navbar />
          <div className="flex items-center justify-center py-40">
            <p className="font-sans text-muted-foreground">Loading room...</p>
          </div>
        </div>
      </div>
    )
  }

  const displayTrack = currentTrack ?? room.nowPlaying

  return (
    <div className="relative min-h-screen">

      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />

        {/* Back link + DJ mode toggle */}
        <div className="mx-auto w-full max-w-7xl px-4 pt-4 lg:px-6">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-sans text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Discover
            </Link>
            <div className="flex items-center gap-3">
              {ws.connected && (
                <span className="font-sans text-[10px] text-green-400/70">● Connected</span>
              )}
              <ListenerBar
                initialCount={listenerCount}
                isLive={room.isLive}
                djName={room.djName}
                isDJ={isDJ}
                onToggleDJ={() => {}}
                minimal
              />
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-4 lg:flex-row lg:gap-6 lg:px-6">
          {/* Left: Now playing + queue + controls */}
          <div className="flex flex-col gap-4 lg:flex-1">
            {/* Jukebox main body with Wurlitzer neon arches */}
            <div className="relative">
              <div className="absolute inset-0 z-20 pointer-events-none">
                <NeonArches />
              </div>

              <div
                className="relative overflow-hidden rounded-t-[2.5rem] rounded-b-2xl"
                style={{
                  background: "linear-gradient(180deg, oklch(0.38 0.03 60) 0%, oklch(0.22 0.015 280) 12%, oklch(0.14 0.01 280) 100%)",
                  padding: "2px",
                }}
              >
                <div className="relative overflow-hidden rounded-t-[calc(2.5rem-2px)] rounded-b-[calc(1rem-2px)]" style={{ background: "oklch(0.12 0.01 280)" }}>

                {/* Chrome arch highlight */}
                <div
                  className="absolute left-0 right-0 top-0 h-10 z-10 pointer-events-none"
                  style={{
                    background: "linear-gradient(180deg, oklch(0.48 0.04 60 / 0.4) 0%, transparent 100%)",
                    borderRadius: "2.5rem 2.5rem 0 0",
                  }}
                />

                {/* Bubble columns */}
                <div className="absolute left-2 top-10 bottom-4 z-20 w-4 flex flex-col items-center gap-2 overflow-hidden pointer-events-none">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={`bl-${i}`}
                      className="rounded-full shrink-0"
                      style={{
                        width: 5 + (i % 3) * 3,
                        height: 5 + (i % 3) * 3,
                        background: i % 2 === 0
                          ? `oklch(0.70 0.22 350 / ${0.2 + i * 0.08})`
                          : `oklch(0.82 0.18 80 / ${0.15 + i * 0.06})`,
                        animation: `bubble-float ${4 + i * 1}s ease-in-out infinite`,
                        animationDelay: `${i * 0.6}s`,
                      }}
                    />
                  ))}
                </div>
                <div className="absolute right-2 top-10 bottom-4 z-20 w-4 flex flex-col items-center gap-2 overflow-hidden pointer-events-none">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={`br-${i}`}
                      className="rounded-full shrink-0"
                      style={{
                        width: 4 + (i % 3) * 3,
                        height: 4 + (i % 3) * 3,
                        background: i % 2 === 0
                          ? `oklch(0.72 0.18 250 / ${0.2 + i * 0.08})`
                          : `oklch(0.82 0.18 80 / ${0.15 + i * 0.06})`,
                        animation: `bubble-float ${5 + i * 0.8}s ease-in-out infinite`,
                        animationDelay: `${i * 0.5 + 0.3}s`,
                      }}
                    />
                  ))}
                </div>

                {/* Room info header */}
                <div className="relative z-30 px-8 pt-8 pb-3 text-center">
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <h1 className="font-sans text-xl font-bold text-foreground neon-text-amber">
                      {room.name}
                    </h1>
                    {room.isLive && (
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex items-center gap-1 rounded px-1.5 py-0.5"
                          style={{
                            background: "oklch(0.08 0.01 280 / 0.9)",
                            border: "1.5px solid oklch(0.50 0.24 30)",
                            boxShadow: "0 0 6px oklch(0.50 0.24 30 / 0.6), 0 0 12px oklch(0.50 0.24 30 / 0.3)",
                          }}
                        >
                          <span
                            className="font-sans text-[9px] font-bold tracking-wide"
                            style={{ color: "oklch(0.58 0.26 30)", textShadow: "0 0 4px oklch(0.58 0.26 30 / 0.8)" }}
                          >
                            ON AIR
                          </span>
                        </div>
                        <span className="font-mono text-xs text-muted-foreground">
                          {listenerCount.toLocaleString()} listening
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="mt-0.5 font-sans text-xs font-medium text-primary">
                    {room.djName}
                  </p>
                  <p className="mt-1.5 font-sans text-sm text-muted-foreground leading-relaxed">
                    {room.description}
                  </p>
                  {/* Request status */}
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
                    style={
                      requestStatus === "open"
                        ? { background: "oklch(0.82 0.18 80 / 0.1)", border: "1px solid oklch(0.82 0.18 80 / 0.3)" }
                        : requestStatus === "paused"
                        ? { background: "oklch(0.78 0.14 60 / 0.1)", border: "1px solid oklch(0.70 0.15 60 / 0.3)" }
                        : { background: "oklch(0.50 0.01 280 / 0.1)", border: "1px solid oklch(0.35 0.02 280 / 0.3)" }
                    }
                  >
                    {requestStatus === "open" && <Inbox className="h-3 w-3" style={{ color: "oklch(0.82 0.18 80)" }} />}
                    {requestStatus === "paused" && <PauseCircle className="h-3 w-3" style={{ color: "oklch(0.78 0.14 60)" }} />}
                    {requestStatus === "closed" && <XCircle className="h-3 w-3 text-muted-foreground" />}
                    <span className="font-sans text-[10px] font-medium"
                      style={{
                        color: requestStatus === "open"
                          ? "oklch(0.82 0.18 80)"
                          : requestStatus === "paused"
                          ? "oklch(0.78 0.14 60)"
                          : "oklch(0.55 0.02 280)",
                      }}
                    >
                      {requestStatus === "open" ? "Requests Open" : requestStatus === "paused" ? "Requests Paused" : "Requests Closed"}
                    </span>
                  </div>
                </div>

                {/* DJ Subscription card — listeners only */}
                {!isDJ && room.creatorUserId && (
                  <div className="relative z-10 px-6 pb-2">
                    <DJSubscribeCard djUserId={room.creatorUserId} djName={room.djName} />
                  </div>
                )}

                {/* Glass display window */}
                <div className="relative z-10 mx-6">
                  <div
                    className="absolute -inset-[2px] rounded-2xl pointer-events-none"
                    style={{
                      background: "linear-gradient(135deg, rgba(200,200,210,0.4), rgba(120,120,135,0.15) 30%, rgba(220,220,230,0.3) 50%, rgba(100,100,115,0.15) 70%, rgba(180,180,195,0.3))",
                    }}
                  />
                  <div
                    className="relative rounded-2xl overflow-hidden"
                    style={{
                      background: "oklch(0.10 0.008 280 / 0.6)",
                      backdropFilter: "blur(16px) saturate(1.4)",
                      border: "1px solid oklch(0.40 0.02 60 / 0.2)",
                      boxShadow: "inset 0 0 30px oklch(0.08 0.005 280 / 0.5), inset 0 1px 0 oklch(1 0 0 / 0.06)",
                    }}
                  >
                    <div
                      className="absolute top-0 left-[10%] right-[20%] h-px pointer-events-none"
                      style={{ background: "linear-gradient(90deg, transparent, oklch(1 0 0 / 0.12), transparent)" }}
                    />
                    <div className="p-5">
                      {/* Determine if there's a real track playing (from server, not mock) */}
                      {(() => {
                        // A track is playing if we have it from WS, from the API response, or from playback state
                        const apiHasTrack = room.nowPlaying && room.nowPlaying.id !== "placeholder"
                        const hasRealPlayback = !!(ws.currentTrack || ws.playbackState || apiHasTrack)
                        const realTrack = ws.currentTrack ? displayTrack : (apiHasTrack ? displayTrack : null)

                        // DJ: no track playing → show Go Live
                        if (!hasRealPlayback && isDJ) {
                          return (
                            <div className="flex flex-col items-center gap-4 py-8">
                              <div
                                className="flex h-20 w-20 items-center justify-center rounded-full"
                                style={{
                                  background: "oklch(0.16 0.02 280)",
                                  border: "2px solid oklch(0.30 0.04 60 / 0.3)",
                                }}
                              >
                                <Play className="h-8 w-8 text-primary" />
                              </div>
                              <div className="text-center">
                                <h3 className="font-sans text-lg font-bold text-foreground">
                                  Ready to Go Live
                                </h3>
                                <p className="mt-1 font-sans text-sm text-muted-foreground">
                                  {queueTracks.length > 0
                                    ? `${queueTracks.length} track${queueTracks.length !== 1 ? "s" : ""} in queue — hit play to start`
                                    : "Add tracks to the queue, then start playing"}
                                </p>
                              </div>
                              {queueTracks.length > 0 && (
                                <button
                                  onClick={handleGoLive}
                                  className="flex items-center gap-2 rounded-full px-6 py-2.5 font-sans text-sm font-semibold transition-all hover:scale-105 active:scale-95"
                                  style={{
                                    background: "linear-gradient(135deg, oklch(0.65 0.24 30), oklch(0.58 0.26 30))",
                                    color: "white",
                                    boxShadow: "0 0 20px oklch(0.58 0.26 30 / 0.4), 0 0 40px oklch(0.58 0.26 30 / 0.2)",
                                  }}
                                >
                                  <Play className="h-4 w-4" />
                                  Go Live
                                </button>
                              )}
                            </div>
                          )
                        }

                        // Listener: no track playing → waiting message
                        if (!hasRealPlayback && !isDJ) {
                          return (
                            <div className="flex flex-col items-center gap-3 py-8">
                              <div
                                className="flex h-16 w-16 items-center justify-center rounded-full"
                                style={{ background: "oklch(0.16 0.02 280)", border: "2px solid oklch(0.25 0.02 280 / 0.4)" }}
                              >
                                <PauseCircle className="h-7 w-7 text-muted-foreground" />
                              </div>
                              <p className="font-sans text-sm text-muted-foreground">
                                Waiting for the DJ to start playing...
                              </p>
                            </div>
                          )
                        }

                        // Track is playing → show embedded player + NowPlaying
                        if (realTrack) {
                          // Use real duration from audio engine if available (track.duration may be 0)
                          const trackWithDuration = audioDuration > 0 && realTrack.duration === 0
                            ? { ...realTrack, duration: Math.floor(audioDuration) }
                            : realTrack
                          const isYouTube = audioTrack?.source === "youtube"
                          const isSoundCloud = audioTrack?.source === "soundcloud"
                          return (
                            <>
                              {/* Audio engine — visible embed for YouTube, hidden for SC/MP3 */}
                              <AudioEngine
                                track={audioTrack}
                                playbackState={ws.playbackState}
                                volume={75}
                                muted={false}
                                isDJ={isDJ}
                                visible={isYouTube}
                                onTimeUpdate={setAudioCurrentTime}
                                onDuration={setAudioDuration}
                                onTrackEnd={handleTrackEnd}
                                onPlayStateChange={setAudioPlaying}
                              />
                              {/* YouTube: just show track info below the embed, no Jukebox controls */}
                              {isYouTube ? (
                                <div className="mt-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <h2 className="font-sans text-lg font-bold text-foreground">
                                      {trackWithDuration.title}
                                    </h2>
                                    <SaveTrackMenu track={trackWithDuration} size={16} />
                                  </div>
                                  <p className="mt-0.5 font-sans text-sm text-muted-foreground">
                                    {trackWithDuration.artist}
                                  </p>
                                  <p className="mt-0.5 font-sans text-xs text-accent">
                                    Queued by {trackWithDuration.submittedBy}
                                  </p>
                                  {isDJ && (
                                    <button
                                      onClick={handleSkip}
                                      className="mt-3 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-sans text-xs font-medium transition-colors"
                                      style={{
                                        background: "oklch(0.20 0.02 280)",
                                        color: "oklch(0.70 0.04 280)",
                                        border: "1px solid oklch(0.30 0.03 280 / 0.4)",
                                      }}
                                    >
                                      <SkipForward className="h-3.5 w-3.5" />
                                      Skip
                                    </button>
                                  )}
                                </div>
                              ) : (
                                /* SoundCloud / MP3: full Jukebox controls + SC logo link */
                                <NowPlaying
                                  track={trackWithDuration}
                                  isDJ={isDJ}
                                  genre={room.genre}
                                  onSkip={handleSkip}
                                  onTogglePlay={handleDJTogglePlay}
                                  micActive={micActive}
                                  micPausesMusic={micPausesMusic}
                                  currentTime={ws.connected ? audioCurrentTime : undefined}
                                  externalPlaying={ws.connected ? audioPlaying : undefined}
                                  soundCloudUrl={isSoundCloud ? audioTrack?.sourceUrl : undefined}
                                />
                              )}
                            </>
                          )
                        }

                        return (
                          <div className="flex flex-col items-center gap-3 py-8">
                            <AudioEngine
                              track={audioTrack}
                              playbackState={ws.playbackState}
                              volume={75}
                              muted={false}
                              isDJ={isDJ}
                              visible={false}
                              onTimeUpdate={setAudioCurrentTime}
                              onDuration={setAudioDuration}
                              onTrackEnd={handleTrackEnd}
                              onPlayStateChange={setAudioPlaying}
                            />
                            <p className="font-sans text-sm text-muted-foreground">No track playing</p>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                </div>

                {/* Neon Tube */}
                <div className="relative z-10 px-6 py-2">
                  <NeonTubeViz tube={ws.tube ?? mockTube} powerUp={ws.lastPowerUp ?? mockPowerUp} />
                </div>

                {/* DJ Controls */}
                {isDJ && (
                  <div className="relative z-10 px-6 pb-4">
                    <DJControls
                      requestPolicy={room.requestPolicy}
                      requestStatus={requestStatus as "open" | "paused" | "closed"}
                      onRequestStatusChange={(status) => {
                        if (ws.connected) {
                          // Map UI status to backend policy
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
                  </div>
                )}

                {/* Bottom neon strip */}
                <div
                  className="h-1.5"
                  style={{
                    background: "linear-gradient(90deg, transparent 5%, oklch(0.72 0.18 250 / 0.4) 20%, oklch(0.82 0.18 80 / 0.5) 40%, oklch(0.70 0.22 350 / 0.5) 60%, oklch(0.82 0.18 80 / 0.4) 80%, transparent 95%)",
                    boxShadow: "0 0 10px oklch(0.82 0.18 80 / 0.15), 0 0 20px oklch(0.70 0.22 350 / 0.08)",
                  }}
                />
              </div>
              </div>
            </div>

            {/* Under-glow */}
            <div
              className="-mt-2 mx-8 h-4 rounded-full"
              style={{
                background: "radial-gradient(ellipse, oklch(0.82 0.18 80 / 0.1), transparent 70%)",
                filter: "blur(4px)",
              }}
            />

            {/* Mobile panel toggle */}
            <div className="flex gap-2 lg:hidden">
              <Button
                variant={mobilePanel === "chat" ? "default" : "ghost"}
                size="sm"
                onClick={() => setMobilePanel("chat")}
                className="flex-1 gap-1.5 rounded-xl"
              >
                <MessageCircle className="h-4 w-4" />
                Chat
              </Button>
              <Button
                variant={mobilePanel === "queue" ? "default" : "ghost"}
                size="sm"
                onClick={() => setMobilePanel("queue")}
                className="flex-1 gap-1.5 rounded-xl"
              >
                <ListMusic className="h-4 w-4" />
                Queue
              </Button>
            </div>

            {/* Action buttons for listeners */}
            {!isDJ && (
              <div className="flex flex-wrap items-center justify-center gap-3 py-2">
                <button
                  onClick={() => setSendNeonOpen(true)}
                  className="send-neon-btn group relative flex items-center gap-1.5 rounded-full px-4 py-2 font-sans text-xs font-semibold transition-all"
                >
                  <Zap className="icon-zap h-3.5 w-3.5" />
                  Send Neon
                </button>
                {serverPolicy !== "closed" && (
                  <button
                    onClick={() => setRequestModalOpen(true)}
                    className="request-track-btn group relative flex items-center gap-1.5 rounded-full px-4 py-2 font-sans text-xs font-semibold transition-all"
                  >
                    <ListMusic className="icon-music h-3.5 w-3.5" />
                    Request a Track
                  </button>
                )}
              </div>
            )}

            {/* Queue */}
            <div
              className={`relative overflow-hidden rounded-2xl ${mobilePanel !== "queue" ? "hidden lg:block" : ""}`}
              style={{
                background: "oklch(0.13 0.01 280)",
                border: "1px solid oklch(0.28 0.02 60 / 0.25)",
              }}
            >
              <div className="p-4">
                <TrackQueue
                  tracks={queueTracks}
                  isDJ={isDJ}
                  requestPolicy={serverPolicy as "open" | "closed" | "approval"}
                  onSubmitTrack={handleSubmitTrack}
                />
              </div>
              <div className="h-px" style={{ background: "linear-gradient(90deg, transparent, oklch(0.72 0.18 250 / 0.3), transparent)" }} />
            </div>

            {/* Pending Requests — DJ only, below queue */}
            {isDJ && requestStatus !== "closed" && (
              <div
                className={`relative overflow-hidden rounded-2xl ${mobilePanel !== "queue" ? "hidden lg:block" : ""}`}
                style={{
                  background: "oklch(0.12 0.008 280)",
                  border: "1px solid oklch(0.26 0.015 280 / 0.35)",
                }}
              >
                <div className="p-4">
                  <PendingRequests
                    requests={ws.pendingRequests}
                    onApprove={ws.djApprove}
                    onReject={ws.djReject}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right: Chat */}
          <div
            className={`flex flex-col lg:w-96 ${mobilePanel !== "chat" ? "hidden lg:flex" : ""}`}
          >
            <div className="h-[520px] lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)]">
              <ChatPanel
                initialMessages={chatMessages}
                roomName={room.name}
                onSendMessage={ws.connected ? ws.sendChat : undefined}
                onSendReaction={ws.connected ? ws.sendReaction : undefined}
                connected={ws.connected}
                overlayRef={chatOverlayRef}
                listeners={ws.listeners}
                listenerCount={ws.listenerCount}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Request modal */}
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
