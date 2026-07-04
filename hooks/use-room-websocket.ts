"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import type { APITrack, APIChatMessage, APIQueueEntry, PlaybackState } from "@/lib/api"
import {
  chatMessagesSlice,
  activityEventsSlice,
  playbackStateSlice,
  currentTrackSlice,
  clockOffsetSlice,
  resetRoomSlices,
} from "@/hooks/room-store"

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
  userId?: string
}

export interface NeonTubeState {
  roomId: string
  level: number
  fillAmount: number
  fillTarget: number
  totalNeon: number
  prestigeCount?: number
}

export interface RoomEffect {
  type: "aurora" | "neon_rain" | "stardust"
  expiresAt: string
  activatedBy: string
}

export interface SubmitTrackResult {
  ok: boolean
  error?: string
}

// A submit_track awaiting server confirmation. Resolved by a
// submit_result reply, by a queue/request update echo listing the
// submitted track as a new entry, by the per-client announcement
// confirming an approval-policy request, by a recognized
// submit-rejection error reply (SUBMIT_ERROR_MESSAGES), or by the
// confirmation timeout — whichever first.
interface PendingSubmit {
  sourceUrl: string
  resolve: (result: SubmitTrackResult) => void
  timer: ReturnType<typeof setTimeout>
}

// How long to wait for the server to confirm a submit_track before
// reporting failure to the caller.
const SUBMIT_CONFIRM_TIMEOUT_MS = 4000

// The rejections the backend's submit_track handler can emit (mirrors
// its sendError calls; none are produced by any other action). Error
// replies carry no correlation id, so this allowlist is how we tell a
// submit rejection apart from an unrelated per-client error (chat rate
// limit, DJ-only action, ...) arriving during the confirmation window.
// If the backend wording drifts, an unmatched rejection falls back to
// the error toast and the submit resolves via its timeout — degraded
// wording, never lost feedback.
const SUBMIT_ERROR_MESSAGES = new Set([
  "invalid track submission",
  "room not found",
  "requests are closed for this room",
  "failed to save track",
  "failed to add to queue",
])

// Reconnect backoff: exponential from BASE doubling up to CAP, with
// full jitter (each delay is uniform in [0, current cap]) so all the
// clients dropped by a server restart don't stampede back in
// synchronized waves. Retries never give up — a listener riding out a
// long outage should recover the moment the backend/network returns,
// not be stranded on a dead page.
const RECONNECT_BASE_MS = 1000
const RECONNECT_CAP_MS = 30000

// Zombie-socket detection: after a mobile background/resume the socket
// can report OPEN while the connection is actually dead (the OS killed
// it without a FIN ever reaching us), leaving a silent room that never
// recovers. On tab re-focus, a socket that hasn't delivered a server
// frame in this long is force-closed and reconnected. The server's
// keepalive pings are protocol-level (invisible to onmessage) and data
// frames can legitimately pause mid-track, so this can false-positive
// in a quiet room — that just costs one clean reconnect + initial-state
// replay, which the resync markers absorb without blanking the UI.
const ZOMBIE_SILENCE_MS = 45000

export type RoomConnectionStatus = "connected" | "reconnecting" | "offline"

export interface RoomWSState {
  connected: boolean
  // Drives the room's connection banner: "offline" when the browser
  // reports no network, "reconnecting" for any other non-open state.
  connectionStatus: RoomConnectionStatus
  // True once this connection scope (room) has opened at least once.
  // The room page uses it to keep rendering last-received WS data
  // through a disconnect instead of rewinding to the REST snapshot.
  everConnected: boolean
  listenerCount: number
  listeners: ListenerInfo[]
  queue: APIQueueEntry[]
  requestPolicy: string
  pendingRequests: APIQueueEntry[]
  playedTracks: APITrack[]
  roomEnded: boolean
  roomEndedReason: string
  tube: NeonTubeState | null
  lastPowerUp: { newLevel: number; color: string } | null
  supernovaEvent: { prestigeCount: number; activatedBy: string } | null
  activeRoomEffect: RoomEffect | null
  djMicActive: boolean
  djMicPauseMusic: boolean
}

// Fresh per-connection-scope state — used for the initial useState and
// re-applied whenever the connect effect restarts (room change) so one
// room's queue/listeners can't bleed into the next.
function initialWSState(): RoomWSState {
  return {
    connected: false,
    connectionStatus: "reconnecting",
    everConnected: false,
    listenerCount: 0,
    listeners: [],
    queue: [],
    requestPolicy: "open",
    pendingRequests: [],
    playedTracks: [],
    roomEnded: false,
    roomEndedReason: "",
    tube: null,
    lastPowerUp: null,
    supernovaEvent: null,
    activeRoomEffect: null,
    djMicActive: false,
    djMicPauseMusic: false,
  }
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
  // Ref-wrapped like onReaction so the connect effect (deps: slug/djKey/
  // disabled) never captures a stale callback for the connection's lifetime.
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null)
  // Drop playback_state broadcasts closer than this — the server can
  // emit them at ~20Hz on drift correction, which creates needless
  // re-render churn. The audio engine re-syncs on its own 10s timer
  // anyway, so skipping sub-100ms duplicates is safe.
  const lastPlaybackStateAt = useRef(0)
  // Track submissions awaiting server confirmation (see PendingSubmit).
  const pendingSubmitsRef = useRef<PendingSubmit[]>([])
  // Every queue/request entry id seen on this connection (bootstrapped
  // by the initial queue_update on join). Entry ids are minted server-
  // side per submission, so an entry seen BEFORE a submit was sent
  // can't be that submit's echo — this stops a duplicate URL already
  // sitting in the queue from resolving a pending submit prematurely
  // when an unrelated broadcast re-lists it.
  const knownEntryIdsRef = useRef<Set<string>>(new Set())

  // Resolve the oldest pending submission. submit_result replies are
  // per-client and ordered, so FIFO pairs requests with replies.
  function resolveOldestPendingSubmit(result: SubmitTrackResult) {
    const pending = pendingSubmitsRef.current.shift()
    if (!pending) return
    clearTimeout(pending.timer)
    pending.resolve(result)
  }

  // Resolve any pending submissions whose track shows up as a NEW
  // entry in a queue or request update echo — proof the submission
  // landed server-side. Only entries this connection hasn't seen
  // before count: the server never sends the entry's session id, so
  // sourceUrl plus id-freshness is the tightest match available.
  function resolvePendingSubmitsIn(entries: APIQueueEntry[]) {
    if (pendingSubmitsRef.current.length > 0) {
      const newUrls = new Set(
        entries
          .filter((e) => e?.id && !knownEntryIdsRef.current.has(e.id))
          .map((e) => e?.track?.sourceUrl)
          .filter(Boolean)
      )
      const remaining: PendingSubmit[] = []
      for (const pending of pendingSubmitsRef.current) {
        if (newUrls.has(pending.sourceUrl)) {
          clearTimeout(pending.timer)
          pending.resolve({ ok: true })
        } else {
          remaining.push(pending)
        }
      }
      pendingSubmitsRef.current = remaining
    }
    for (const e of entries) {
      if (e?.id) knownEntryIdsRef.current.add(e.id)
    }
  }
  const [state, setState] = useState<RoomWSState>(initialWSState)

  // Reset the external store slices whenever the slug changes so a room
  // transition doesn't flash the previous room's chat/playback.
  useEffect(() => {
    resetRoomSlices()
  }, [slug])

  // Connect — wait until djKey is resolved (undefined = still loading)
  useEffect(() => {
    if (djKey === undefined) return // don't connect yet, waiting for sessionStorage check
    if (disabled) return // room doesn't exist or other reason to skip

    let cancelled = false
    let reconnectCount = 0
    // Set on every socket open, cleared as the server's initial-state
    // replay lands. Lets a reconnect keep showing the last-known data
    // and swap in the fresh snapshot atomically instead of blanking
    // the room (see ws.onopen).
    const resync = { playbackPending: false, requestsPending: false }
    // Wall-clock time of the last server frame (seeded on open). The
    // visibility handler compares it against ZOMBIE_SILENCE_MS to spot
    // dead-but-OPEN sockets after a mobile background/resume.
    let lastMessageAt = 0
    // Count of submit_result rejections already accounted for by their
    // paired legacy error event (rejectSubmit sends both, error first).
    // Without this, the trailing submit_result would resolve the NEXT
    // pending submit with the previous one's failure.
    let swallowSubmitResults = 0

    // Fresh connection scope (mount or room change) — start from a
    // clean slate so a previous room's queue/listeners can't bleed in.
    setState(initialWSState())

    function scheduleReconnect() {
      // Exponential backoff with full jitter, retrying forever (see
      // RECONNECT_BASE_MS above).
      const cap = Math.min(
        RECONNECT_CAP_MS,
        RECONNECT_BASE_MS * 2 ** Math.min(reconnectCount, 10)
      )
      reconnectCount++
      reconnectTimer.current = setTimeout(connect, Math.random() * cap)
    }

    // Immediate retry for the online/visibilitychange handlers below:
    // reset the backoff and skip any pending timer. The immediate
    // reconnect is skipped while a socket is already open or
    // mid-handshake, but the backoff reset still applies — these are
    // external "network is back / user is looking" signals, so if a
    // doomed CONNECTING attempt fails right after one, its retry
    // should start from the base delay, not the stale backoff.
    function reconnectNow() {
      if (cancelled) return
      reconnectCount = 0
      const current = wsRef.current
      if (
        current &&
        (current.readyState === WebSocket.OPEN ||
          current.readyState === WebSocket.CONNECTING)
      ) {
        return
      }
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
        reconnectTimer.current = null
      }
      connect()
    }

    function connect() {
      if (cancelled) return

      // Detach any previous socket first (reconnectNow can fire while
      // one is still CLOSING) so its late onclose can't schedule a
      // second reconnect loop against the fresh connection.
      const stale = wsRef.current
      if (stale) {
        stale.onopen = null
        stale.onclose = null
        stale.onerror = null
        stale.onmessage = null
        try {
          stale.close()
        } catch {}
      }

      const params = new URLSearchParams()
      if (djKey) params.set("djKey", djKey)
      
      // Pass persistent session ID from localStorage (works across browser backgrounding)
      try {
        const sessionId = localStorage.getItem("jukebox_session_id")
        if (sessionId) params.set("session", sessionId)
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
        if (cancelled || wsRef.current !== ws) return
        reconnectCount = 0
        lastMessageAt = Date.now()
        swallowSubmitResults = 0 // per-socket pairing — see declaration
        // The server replays its initial state on every (re)connect
        // (track/playback pair, queue, recent chat, settings, pending
        // requests, listener list). Don't clear anything here — that
        // visibly rewound the room to a blank state on every
        // reconnect. Instead mark a resync and let each replayed event
        // replace its slice atomically; the two markers catch the
        // cases the replay can't express by itself (room went idle,
        // pending requests drained — see queue_update/listener_list).
        resync.playbackPending = true
        resync.requestsPending = true
        setState((s) => ({
          ...s,
          connected: true,
          connectionStatus: "connected",
          everConnected: true,
        }))
      }

      ws.onclose = () => {
        if (cancelled || wsRef.current !== ws) return
        setState((s) => ({
          ...s,
          connected: false,
          connectionStatus:
            typeof navigator !== "undefined" && !navigator.onLine
              ? "offline"
              : "reconnecting",
        }))
        scheduleReconnect()
      }

      ws.onerror = () => {
        ws.close()
      }

      ws.onmessage = (event) => {
        if (cancelled || wsRef.current !== ws) return
        lastMessageAt = Date.now()
        try {
          const msg: WSMessage = JSON.parse(event.data)
          handleMessage(msg)
        } catch (err) {
          console.error("[ws] failed to parse message:", err)
        }
      }
    }

    function handleMessage(msg: WSMessage) {
      // submit_result — the server's direct reply to this client's
      // submit_track. WS CONTRACT (frozen), implemented by the backend
      // (Jukebox-Backend internal/ws/client.go sendSubmitResult):
      // {"type":"submit_result","ok":boolean,"error":string|null},
      // sent bare — also accept it wrapped in the standard
      // {event, payload} envelope in case the backend ever normalizes
      // it. Handled before the switch so it resolves the pending
      // submit ahead of the queue/request-echo and announcement
      // fallbacks below.
      const raw = msg as any
      if (raw.type === "submit_result" || raw.event === "submit_result") {
        const body = raw.type === "submit_result" ? raw : raw.payload ?? {}
        // A rejection whose paired legacy error event (sent first —
        // see rejectSubmit backend-side) already resolved its pending
        // submit is spent; letting it through would fail the NEXT
        // pending submit with this one's error.
        if (!body.ok && swallowSubmitResults > 0) {
          swallowSubmitResults--
          return
        }
        resolveOldestPendingSubmit({
          ok: !!body.ok,
          error: body.error || undefined,
        })
        return
      }

      switch (msg.event) {
        case "initial_state": {
          // WS CONTRACT (frozen): initial_state opens the per-client
          // replay and carries a top-level "serverTime" field (unix
          // epoch ms at send time). clockOffset = serverTime -
          // Date.now(); every playback-position derivation adds it to
          // Date.now(). Tolerate the field being absent (offset 0 —
          // pre-contract servers).
          const serverTime = raw.serverTime
          clockOffsetSlice.set(
            typeof serverTime === "number" && Number.isFinite(serverTime)
              ? serverTime - Date.now()
              : 0
          )
          break
        }

        case "playback_state": {
          resync.playbackPending = false
          const now = Date.now()
          if (now - lastPlaybackStateAt.current < 100) break
          lastPlaybackStateAt.current = now
          playbackStateSlice.set(msg.payload as PlaybackState)
          break
        }

        case "track_changed": {
          resync.playbackPending = false
          const newTrack = msg.payload as APITrack | null
          const prev = currentTrackSlice.get()
          // A reconnect replays track_changed for the track that's
          // already showing — that's a resync, not a change, so don't
          // log it to history or blank the playback state out from
          // under the audio engine.
          const sameTrack = !!prev && !!newTrack && prev.id === newTrack.id
          // Push previous track into played history (hook-level state
          // because it's read alongside other slices on the page).
          if (prev && prev.id !== "placeholder" && !sameTrack) {
            setState((s) => ({
              ...s,
              playedTracks: [prev, ...s.playedTracks].slice(0, 100),
            }))
          }
          currentTrackSlice.set(newTrack)
          // Clear playback state so the audio engine doesn't seek using
          // the PREVIOUS track's startedAt. Server sends a fresh
          // playback_state immediately after.
          if (!sameTrack) {
            playbackStateSlice.set(null)
          }
          break
        }

        case "track_info_updated": {
          const patch = msg.payload as { id: string; infoSnippet: string } | null
          if (!patch) break
          const cur = currentTrackSlice.get()
          if (cur && cur.id === patch.id) {
            currentTrackSlice.set({ ...cur, infoSnippet: patch.infoSnippet })
          }
          break
        }

        case "queue_update": {
          const entries = (msg.payload as APIQueueEntry[]) || []
          resolvePendingSubmitsIn(entries)
          // The initial-state replay emits queue_update strictly after
          // the (optional) track/playback pair — reaching it with
          // playbackPending still set means nothing is playing, so
          // drop the pre-disconnect track instead of "playing" it
          // forever on a room that went idle while we were away.
          if (resync.playbackPending) {
            resync.playbackPending = false
            currentTrackSlice.set(null)
            playbackStateSlice.set(null)
          }
          setState((s) => ({ ...s, queue: entries }))
          break
        }

        case "chat_message": {
          // The server replays the last 50 messages on every
          // (re)connect — dedupe by id so a resync appends only what
          // was missed while disconnected instead of duplicating the
          // whole tail.
          const incoming = msg.payload as APIChatMessage
          chatMessagesSlice.update((prev) =>
            incoming?.id && prev.some((m) => m.id === incoming.id)
              ? prev
              : [...prev.slice(-100), incoming]
          )
          break
        }

        case "reaction":
          // Fire the onReaction callback — state doesn't store reactions
          if (onReactionRef.current && msg.payload?.emoji) {
            onReactionRef.current(msg.payload.emoji as string)
          }
          break

        case "listener_count":
          setState((s) => ({ ...s, listenerCount: msg.payload?.count ?? 0 }))
          break

        case "listener_list": {
          const listeners = (msg.payload as ListenerInfo[]) || []
          // The initial-state replay ends with this listener_list and
          // only re-sends request_update when pending requests still
          // exist — so a resync arriving here with requestsPending set
          // means the list we kept through the disconnect was drained.
          const dropPendingRequests = resync.requestsPending
          resync.requestsPending = false
          setState((s) => ({
            ...s,
            listeners,
            pendingRequests: dropPendingRequests ? [] : s.pendingRequests,
          }))
          break
        }

        case "tube_update":
          setState((s) => ({ ...s, tube: msg.payload as NeonTubeState }))
          break

        case "dj_mic_state":
          setState((s) => ({
            ...s,
            djMicActive: !!(msg.payload as any)?.active,
            djMicPauseMusic: !!(msg.payload as any)?.pauseMusic,
          }))
          break

        case "power_up":
          setState((s) => ({ ...s, lastPowerUp: msg.payload as { newLevel: number; color: string } }))
          // Clear after animation
          setTimeout(() => setState((s) => ({ ...s, lastPowerUp: null })), 4000)
          break

        case "supernova_complete":
          setState((s) => ({ ...s, supernovaEvent: msg.payload as { prestigeCount: number; activatedBy: string } }))
          setTimeout(() => setState((s) => ({ ...s, supernovaEvent: null })), 8000)
          break

        case "room_effect_update":
          setState((s) => ({ ...s, activeRoomEffect: (msg.payload as RoomEffect) || null }))
          break

        // Presence/tip activity goes to its own slice — NOT the chat
        // slice — so joins/leaves in a busy room don't invalidate the
        // rendered message list (the chat feed filters them out anyway).
        case "neon_gift":
          if (msg.payload?.from && msg.payload?.amount) {
            const giftMsg: APIChatMessage = {
              id: `neon-${Date.now()}-${Math.random()}`,
              roomId: "",
              username: msg.payload.from,
              avatarColor: "oklch(0.72 0.18 195)",
              message: `sent ${msg.payload.amount} Neon`,
              type: "activity_tip",
              timestamp: new Date().toISOString(),
            }
            activityEventsSlice.update((prev) => [...prev.slice(-100), giftMsg])
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
              type: "activity_join",
              timestamp: new Date().toISOString(),
            }
            activityEventsSlice.update((prev) => [...prev.slice(-100), joinMsg])
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
              type: "activity_leave",
              timestamp: new Date().toISOString(),
            }
            activityEventsSlice.update((prev) => [...prev.slice(-100), leaveMsg])
          }
          break

        case "room_settings":
          setState((s) => ({
            ...s,
            requestPolicy: msg.payload?.requestPolicy ?? s.requestPolicy,
          }))
          break

        case "announcement":
          if (msg.payload?.message) {
            // Deliberately NOT a submit confirmation: the backend always
            // sends the contractual submit_result BEFORE this per-client
            // announcement, so the pending submit is already resolved by
            // the time it arrives — resolving again here would falsely
            // confirm the NEXT in-flight submit when two are pending.
            const announcement: APIChatMessage = {
              id: `ann-${Date.now()}`,
              roomId: "",
              username: "System",
              avatarColor: "oklch(0.82 0.18 80)",
              message: msg.payload.message,
              type: "announcement",
              timestamp: new Date().toISOString(),
            }
            chatMessagesSlice.update((prev) => [...prev.slice(-100), announcement])
          }
          break

        case "request_update":
          resync.requestsPending = false
          // Could be a single new pending request or a full list
          if (Array.isArray(msg.payload)) {
            resolvePendingSubmitsIn(msg.payload as APIQueueEntry[])
            setState((s) => ({ ...s, pendingRequests: msg.payload as APIQueueEntry[] }))
          } else if (msg.payload) {
            // Single new request — append
            resolvePendingSubmitsIn([msg.payload as APIQueueEntry])
            setState((s) => ({
              ...s,
              pendingRequests: [...s.pendingRequests, msg.payload as APIQueueEntry],
            }))
          }
          break

        case "error": {
          const message = msg.payload?.message || "Unknown error"
          // A known submit_track rejection arriving while a submit
          // awaits confirmation is that submit's rejection — surface it
          // through the pending promise (inline in the modal) instead
          // of a toast followed by a misleading confirmation timeout.
          // Anything else (chat rate limit, DJ-only action, ...) must
          // NOT be misattributed to the submit, so it takes the normal
          // toast path even while a submit is pending.
          if (
            pendingSubmitsRef.current.length > 0 &&
            SUBMIT_ERROR_MESSAGES.has(message)
          ) {
            resolveOldestPendingSubmit({ ok: false, error: message })
            // The backend pairs this legacy error with a contractual
            // submit_result (error first, per-client ordered) — that
            // reply is now accounted for, so mark it to be swallowed.
            swallowSubmitResults++
          } else {
            onErrorRef.current?.(message)
          }
          break
        }

        case "room_ended":
          currentTrackSlice.set(null)
          playbackStateSlice.set(null)
          setState((s) => ({
            ...s,
            roomEnded: true,
            roomEndedReason: msg.payload?.reason || "The session has ended",
          }))
          break
      }
    }

    // Reconnect immediately when connectivity returns or the tab comes
    // back to the foreground (mobile browsers routinely kill sockets
    // while backgrounded/locked) instead of waiting out the backoff.
    const handleOnline = () => reconnectNow()
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return
      // Zombie-socket check: after a background/resume the socket can
      // still report OPEN even though the connection died while the
      // page was frozen. readyState can't be trusted here, so use
      // server silence as the tell — force-close and let reconnectNow
      // open a fresh socket (connect() detaches this one's handlers,
      // so its late onclose can't double-schedule; `connected` stays
      // true until the replacement resolves, keeping the banner calm).
      const current = wsRef.current
      if (
        current &&
        current.readyState === WebSocket.OPEN &&
        Date.now() - lastMessageAt > ZOMBIE_SILENCE_MS
      ) {
        try {
          current.close()
        } catch {}
      }
      reconnectNow()
    }
    // While already disconnected, relabel the banner from
    // "reconnecting" to "offline" right away — the next onclose (which
    // would recompute it) may be a full backoff interval out. A socket
    // still reporting connected is left alone: a dead network can take
    // the socket seconds to notice, and onclose sets the status from a
    // fresh navigator.onLine check when it does.
    const handleOffline = () => {
      setState((s) => (s.connected ? s : { ...s, connectionStatus: "offline" }))
    }
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    document.addEventListener("visibilitychange", handleVisibility)

    connect()

    return () => {
      cancelled = true
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      document.removeEventListener("visibilitychange", handleVisibility)
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      // Flush submissions still awaiting confirmation — the socket is
      // going away, so no reply or echo can arrive for them.
      for (const pending of pendingSubmitsRef.current) {
        clearTimeout(pending.timer)
        pending.resolve({ ok: false, error: "Connection closed before the server confirmed the request." })
      }
      pendingSubmitsRef.current = []
      // Fresh connection (room change / remount) — the next room's
      // entries are unrelated, so start the seen-entry set over.
      knownEntryIdsRef.current = new Set()
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
    (message: string, media?: { mediaUrl: string; mediaType: string }) =>
      send("send_chat", { message, ...media }),
    [send]
  )

  // Submit a track and wait for server confirmation. Resolves ok:true
  // on a submit_result reply, a queue/request update echo listing the
  // track as a new entry, or the pending-approval announcement;
  // resolves ok:false on a recognized submit-rejection error reply, a
  // dropped connection, or the confirmation timeout. Never resolves
  // with a false success.
  const submitTrack = useCallback(
    (track: { title: string; artist: string; duration: number; source: string; sourceUrl: string }): Promise<SubmitTrackResult> => {
      const ws = wsRef.current
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return Promise.resolve({ ok: false, error: "Not connected — try again in a moment." })
      }
      return new Promise<SubmitTrackResult>((resolve) => {
        const pending: PendingSubmit = {
          sourceUrl: track.sourceUrl,
          resolve,
          timer: setTimeout(() => {
            pendingSubmitsRef.current = pendingSubmitsRef.current.filter((p) => p !== pending)
            resolve({
              ok: false,
              error: "The server didn't confirm your request — it may not have gone through.",
            })
          }, SUBMIT_CONFIRM_TIMEOUT_MS),
        }
        pendingSubmitsRef.current.push(pending)
        send("submit_track", track)
      })
    },
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

  const djSetMic = useCallback(
    (active: boolean, pauseMusic: boolean) => send("dj_mic", { active, pauseMusic }),
    [send]
  )

  const sendReaction = useCallback(
    (emoji: string) => send("reaction", { emoji }),
    [send]
  )

  const sendAutoplayEnd = useCallback(() => send("autoplay_track_ended"), [send])

  const reportDuration = useCallback(
    (trackId: string, duration: number) => send("report_duration", { trackId, duration }),
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
    djSetMic,
    sendReaction,
    sendAutoplayEnd,
    reportDuration,
  }
}
