"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import type { APITrack, APIChatMessage, APIQueueEntry, PlaybackState } from "@/lib/api"

// Connect WebSocket directly to the Go backend.
// Next.js rewrites don't properly handle persistent WebSocket connections,
// so we bypass the proxy and connect straight to the backend.
function getWsBase() {
  const env = process.env.NEXT_PUBLIC_WS_URL
  if (env) return env
  if (typeof window === "undefined") return "ws://localhost:8080"
  // In production, WS goes to the same host (reverse proxy handles it).
  // In development, Next.js is on :3000 but Go is on :8080.
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:"
  const host = window.location.hostname
  const port = process.env.NODE_ENV === "production"
    ? window.location.port
    : "8080"
  return `${proto}//${host}${port ? `:${port}` : ""}`
}

// Events from server
interface WSMessage {
  event: string
  payload: any
}

export interface ListenerInfo {
  username: string
  avatarColor: string
  isDJ: boolean
}

export interface NeonTubeState {
  roomId: string
  level: number
  fillAmount: number
  fillTarget: number
  totalNeon: number
}

export interface RoomWSState {
  connected: boolean
  listenerCount: number
  listeners: ListenerInfo[]
  playbackState: PlaybackState | null
  currentTrack: APITrack | null
  queue: APIQueueEntry[]
  chatMessages: APIChatMessage[]
  requestPolicy: string
  pendingRequests: APIQueueEntry[]
  playedTracks: APITrack[]
  roomEnded: boolean
  roomEndedReason: string
  tube: NeonTubeState | null
  lastPowerUp: { newLevel: number; color: string } | null
}

interface UseRoomWebSocketOptions {
  slug: string
  djKey?: string | null | undefined
  disabled?: boolean
  onError?: (msg: string) => void
  onReaction?: (emoji: string) => void
}

export function useRoomWebSocket({ slug, djKey, disabled, onError, onReaction }: UseRoomWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const onReactionRef = useRef(onReaction)
  onReactionRef.current = onReaction
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null)
  const [state, setState] = useState<RoomWSState>({
    connected: false,
    listenerCount: 0,
    listeners: [],
    playbackState: null,
    currentTrack: null,
    queue: [],
    chatMessages: [],
    requestPolicy: "open",
    pendingRequests: [],
    playedTracks: [],
    roomEnded: false,
    roomEndedReason: "",
    tube: null,
    lastPowerUp: null,
  })

  // Connect — wait until djKey is resolved (undefined = still loading)
  useEffect(() => {
    if (djKey === undefined) return // don't connect yet, waiting for sessionStorage check
    if (disabled) return // room doesn't exist or other reason to skip

    let cancelled = false
    let reconnectCount = 0
    const MAX_RECONNECTS = 5

    function connect() {
      if (cancelled) return

      const params = new URLSearchParams()
      if (djKey) params.set("djKey", djKey)
      
      // Pass session cookie value as query param for cross-origin WebSocket
      try {
        const sessionCookie = document.cookie
          .split("; ")
          .find((c) => c.startsWith("jukebox_session="))
          ?.split("=")[1]
        if (sessionCookie) params.set("session", sessionCookie)
      } catch {}

      // Pass JWT token for user identity on WS connection
      try {
        const token = localStorage.getItem("jukebox_access_token")
        if (token) params.set("token", token)
      } catch {}

      const qs = params.toString()
      const url = `${getWsBase()}/ws/room/${slug}${qs ? `?${qs}` : ""}`
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        if (!cancelled) {
          reconnectCount = 0
          setState((s) => ({ ...s, connected: true }))
        }
      }

      ws.onclose = (ev) => {
        if (!cancelled) {
          setState((s) => ({ ...s, connected: false }))
          if (reconnectCount < MAX_RECONNECTS) {
            reconnectCount++
            const delay = Math.min(3000 * reconnectCount, 15000)
            reconnectTimer.current = setTimeout(connect, delay)
          }
        }
      }

      ws.onerror = () => {
        ws.close()
      }

      ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data)
          handleMessage(msg)
        } catch (err) {
          console.error("[ws] failed to parse message:", err)
        }
      }
    }

    function handleMessage(msg: WSMessage) {
      switch (msg.event) {
        case "playback_state":
          setState((s) => ({ ...s, playbackState: msg.payload as PlaybackState }))
          break

        case "track_changed":
          setState((s) => {
            const newTrack = msg.payload as APITrack | null
            // Push the previous track into played history (if it existed)
            const newPlayed = s.currentTrack && s.currentTrack.id !== "placeholder"
              ? [s.currentTrack, ...s.playedTracks]
              : s.playedTracks
            return {
              ...s,
              currentTrack: newTrack,
              playedTracks: newPlayed.slice(0, 100), // cap at 100
              playbackState: newTrack ? s.playbackState : null,
            }
          })
          break

        case "queue_update":
          setState((s) => ({ ...s, queue: (msg.payload as APIQueueEntry[]) || [] }))
          break

        case "chat_message":
          setState((s) => ({
            ...s,
            chatMessages: [...s.chatMessages.slice(-100), msg.payload as APIChatMessage],
          }))
          break

        case "reaction":
          // Fire the onReaction callback — state doesn't store reactions
          if (onReactionRef.current && msg.payload?.emoji) {
            onReactionRef.current(msg.payload.emoji as string)
          }
          break

        case "listener_count":
          setState((s) => ({ ...s, listenerCount: msg.payload?.count ?? 0 }))
          break

        case "listener_list":
          setState((s) => ({ ...s, listeners: (msg.payload as ListenerInfo[]) || [] }))
          break

        case "tube_update":
          setState((s) => ({ ...s, tube: msg.payload as NeonTubeState }))
          break

        case "power_up":
          setState((s) => ({ ...s, lastPowerUp: msg.payload as { newLevel: number; color: string } }))
          // Clear after animation
          setTimeout(() => setState((s) => ({ ...s, lastPowerUp: null })), 4000)
          break

        case "neon_gift":
          // Show as activity pill in chat
          if (msg.payload?.from && msg.payload?.amount) {
            const giftMsg: APIChatMessage = {
              id: `neon-${Date.now()}-${Math.random()}`,
              roomId: "",
              username: msg.payload.from,
              avatarColor: "oklch(0.72 0.18 195)",
              message: `sent ${msg.payload.amount} Neon`,
              type: "activity_tip" as any,
              timestamp: new Date().toISOString(),
            }
            setState((s) => ({
              ...s,
              chatMessages: [...s.chatMessages.slice(-100), giftMsg],
            }))
          }
          break

        case "listener_join":
          if (msg.payload?.username) {
            const joinMsg: APIChatMessage = {
              id: `join-${Date.now()}-${Math.random()}`,
              roomId: "",
              username: msg.payload.username,
              avatarColor: msg.payload.avatarColor || "oklch(0.65 0.15 155)",
              message: "joined the room",
              type: "activity_join" as any,
              timestamp: new Date().toISOString(),
            }
            setState((s) => ({
              ...s,
              chatMessages: [...s.chatMessages.slice(-100), joinMsg],
            }))
          }
          break

        case "listener_leave":
          if (msg.payload?.username) {
            const leaveMsg: APIChatMessage = {
              id: `leave-${Date.now()}-${Math.random()}`,
              roomId: "",
              username: msg.payload.username,
              avatarColor: msg.payload.avatarColor || "oklch(0.55 0.08 280)",
              message: "left the room",
              type: "activity_leave" as any,
              timestamp: new Date().toISOString(),
            }
            setState((s) => ({
              ...s,
              chatMessages: [...s.chatMessages.slice(-100), leaveMsg],
            }))
          }
          break

        case "room_settings":
          setState((s) => ({
            ...s,
            requestPolicy: msg.payload?.requestPolicy ?? s.requestPolicy,
          }))
          break

        case "announcement":
          // Announcements also show in chat
          if (msg.payload?.message) {
            const announcement: APIChatMessage = {
              id: `ann-${Date.now()}`,
              roomId: "",
              username: "System",
              avatarColor: "oklch(0.82 0.18 80)",
              message: msg.payload.message,
              type: "announcement",
              timestamp: new Date().toISOString(),
            }
            setState((s) => ({
              ...s,
              chatMessages: [...s.chatMessages.slice(-100), announcement],
            }))
          }
          break

        case "request_update":
          // Could be a single new pending request or a full list
          if (Array.isArray(msg.payload)) {
            setState((s) => ({ ...s, pendingRequests: msg.payload as APIQueueEntry[] }))
          } else if (msg.payload) {
            // Single new request — append
            setState((s) => ({
              ...s,
              pendingRequests: [...s.pendingRequests, msg.payload as APIQueueEntry],
            }))
          }
          break

        case "error":
          onError?.(msg.payload?.message || "Unknown error")
          break

        case "room_ended":
          setState((s) => ({
            ...s,
            roomEnded: true,
            roomEndedReason: msg.payload?.reason || "The session has ended",
            currentTrack: null,
            playbackState: null,
          }))
          break
      }
    }

    connect()

    return () => {
      cancelled = true
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [slug, djKey, disabled]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Actions (client -> server) ----------

  const send = useCallback((action: string, payload?: any) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action, payload: payload ?? {} }))
    }
  }, [])

  const sendChat = useCallback(
    (message: string) => send("send_chat", { message }),
    [send]
  )

  const submitTrack = useCallback(
    (track: { title: string; artist: string; duration: number; source: string; sourceUrl: string }) =>
      send("submit_track", track),
    [send]
  )

  const djSkip = useCallback(() => send("dj_skip"), [send])
  const djPause = useCallback(() => send("dj_pause"), [send])
  const djResume = useCallback(() => send("dj_resume"), [send])

  const djApprove = useCallback(
    (entryId: string) => {
      send("dj_approve", { entryId })
      // Optimistically remove from pending
      setState((s) => ({
        ...s,
        pendingRequests: s.pendingRequests.filter((r) => r.id !== entryId),
      }))
    },
    [send]
  )

  const djReject = useCallback(
    (entryId: string) => {
      send("dj_reject", { entryId })
      // Optimistically remove from pending
      setState((s) => ({
        ...s,
        pendingRequests: s.pendingRequests.filter((r) => r.id !== entryId),
      }))
    },
    [send]
  )

  const djSetPolicy = useCallback(
    (policy: string) => send("dj_set_policy", { policy }),
    [send]
  )

  const djAnnounce = useCallback(
    (message: string) => send("dj_announce", { message }),
    [send]
  )

  const djGoLive = useCallback(() => send("dj_go_live"), [send])

  const djEndRoom = useCallback(() => send("dj_end_session"), [send])

  const sendReaction = useCallback(
    (emoji: string) => send("reaction", { emoji }),
    [send]
  )

  return {
    ...state,
    sendChat,
    submitTrack,
    djSkip,
    djPause,
    djResume,
    djApprove,
    djReject,
    djSetPolicy,
    djAnnounce,
    djGoLive,
    djEndRoom,
    sendReaction,
  }
}
