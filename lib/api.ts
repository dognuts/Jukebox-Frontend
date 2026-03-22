/**
 * Jukebox API client
 * Talks to the Go backend at /api/...
 * Session ID persisted in localStorage for cross-origin stability.
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || ""

function getToken(): string | null {
  return typeof window !== "undefined"
    ? localStorage.getItem("jukebox_access_token")
    : null
}

/** Get stored session ID (persists across browser backgrounding on mobile) */
export function getSessionId(): string | null {
  return typeof window !== "undefined"
    ? localStorage.getItem("jukebox_session_id")
    : null
}

/** Store session ID */
export function setSessionId(id: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("jukebox_session_id", id)
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const sessionId = getSessionId()
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include", // send session cookie
    headers: {
      "Content-Type": "application/json",
      ...(sessionId ? { "X-Session-ID": sessionId } : {}),
      ...options?.headers,
    },
    ...options,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`API ${res.status}: ${text}`)
  }

  return res.json()
}

/** Authenticated request — includes JWT Bearer token. */
export async function authRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  return request<T>(path, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
}

// ---------- Session ----------

export interface Session {
  id: string
  displayName: string
  avatarColor: string
  createdAt: string
  expiresAt: string
}

export async function getSession(): Promise<Session> {
  const session = await request<Session>("/api/session")
  if (session?.id) setSessionId(session.id)
  return session
}

export async function updateDisplayName(displayName: string): Promise<Session> {
  return request<Session>("/api/session", {
    method: "PATCH",
    body: JSON.stringify({ displayName }),
  })
}

// ---------- Rooms ----------

export interface APITrack {
  id: string
  title: string
  artist: string
  duration: number
  source: "youtube" | "soundcloud" | "mp3"
  sourceUrl: string
  albumGradient: string
}

export interface APIRoom {
  id: string
  slug: string
  name: string
  description: string
  genre: string
  vibes: string[]
  coverGradient: string
  coverArt?: string
  requestPolicy: "open" | "approval" | "closed"
  isLive: boolean
  isOfficial: boolean
  listenerCount: number
  djName: string
  djAvatarColor: string
  creatorUserId?: string
  createdAt: string
  scheduledStart?: string
  lastActive?: string
  endedAt?: string
  isFeatured?: boolean
  isAutoplay?: boolean
  expiresAt?: string
  nowPlaying?: APITrack | null
}

export interface APIQueueEntry {
  id: string
  roomId: string
  track: APITrack
  submittedBy: string
  status: "pending" | "approved" | "rejected" | "played"
  position: number
  createdAt: string
}

export interface APIChatMessage {
  id: string
  roomId: string
  username: string
  avatarColor: string
  message: string
  type: "message" | "request" | "announcement"
  timestamp: string
}

export interface PlaybackState {
  roomId: string
  trackId: string
  startedAt: number // unix millis
  isPlaying: boolean
  pausePosition: number
}

export interface RoomDetail {
  room: APIRoom
  nowPlaying: APITrack | null
  queue: APIQueueEntry[]
  recentChat: APIChatMessage[]
  playbackState: PlaybackState
}

export interface CreateRoomResponse {
  room: APIRoom
  djKey: string
}

export async function listRooms(opts?: { live?: boolean; genre?: string }): Promise<APIRoom[]> {
  const params = new URLSearchParams()
  if (opts?.live) params.set("live", "true")
  if (opts?.genre) params.set("genre", opts.genre)
  const qs = params.toString()
  return request<APIRoom[]>(`/api/rooms${qs ? `?${qs}` : ""}`)
}

export async function getRoom(slug: string): Promise<RoomDetail> {
  return request<RoomDetail>(`/api/rooms/${slug}`)
}

export async function createRoom(data: {
  name: string
  description?: string
  genre: string
  vibes?: string[]
  requestPolicy: string
  scheduledStart?: string
  coverArt?: string
  coverGradient?: string
}): Promise<CreateRoomResponse> {
  return authRequest<CreateRoomResponse>("/api/rooms", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function goLive(
  slug: string,
  djKey: string,
  track: { trackTitle: string; trackArtist: string; trackDuration: number; trackSource: string; trackSourceUrl: string }
) {
  return request(`/api/rooms/${slug}/go-live`, {
    method: "POST",
    headers: { "X-DJ-Key": djKey },
    body: JSON.stringify(track),
  })
}

export async function endSession(slug: string, djKey: string) {
  return request(`/api/rooms/${slug}/end`, {
    method: "POST",
    headers: { "X-DJ-Key": djKey },
  })
}

// ---------- Queue ----------

export async function getQueue(slug: string): Promise<APIQueueEntry[]> {
  return request<APIQueueEntry[]>(`/api/rooms/${slug}/queue`)
}

export async function submitTrack(
  slug: string,
  track: { title: string; artist: string; duration: number; source: string; sourceUrl: string },
  djKey?: string,
): Promise<APIQueueEntry> {
  const headers: Record<string, string> = {}
  if (djKey) headers["X-DJ-Key"] = djKey
  return request<APIQueueEntry>(`/api/rooms/${slug}/queue`, {
    method: "POST",
    headers,
    body: JSON.stringify(track),
  })
}

export async function getPendingRequests(slug: string, djKey: string): Promise<APIQueueEntry[]> {
  return request<APIQueueEntry[]>(`/api/rooms/${slug}/requests`, {
    headers: { "X-DJ-Key": djKey },
  })
}

// ---------- Helpers ----------

/**
 * Convert API room to the shape the existing components expect (Room from mock-data).
 * This is a bridge so we don't have to rewrite every component at once.
 */
export function toFrontendRoom(r: APIRoom, nowPlaying?: APITrack | null, queue?: APIQueueEntry[], chat?: APIChatMessage[]): import("@/lib/mock-data").Room {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    djName: r.djName || "DJ",
    creatorUserId: r.creatorUserId || "",
    djUsername: r.slug, // placeholder
    djAvatarColor: r.djAvatarColor || "oklch(0.70 0.18 30)",
    coverGradient: r.coverGradient || "linear-gradient(160deg, oklch(0.25 0.08 30), oklch(0.15 0.12 350))",
    coverArt: r.coverArt,
    genre: r.genre,
    vibes: r.vibes || [],
    isLive: r.isLive,
    listenerCount: r.listenerCount,
    isOfficial: r.isOfficial,
    requestPolicy: r.requestPolicy,
    nowPlaying: nowPlaying
      ? {
          id: nowPlaying.id,
          title: nowPlaying.title,
          artist: nowPlaying.artist,
          duration: nowPlaying.duration,
          source: nowPlaying.source,
          sourceUrl: nowPlaying.sourceUrl,
          submittedBy: "DJ",
          albumGradient: nowPlaying.albumGradient || "linear-gradient(135deg, oklch(0.45 0.15 30), oklch(0.35 0.20 350))",
        }
      : {
          id: "placeholder",
          title: "No track playing",
          artist: "—",
          duration: 0,
          source: "mp3",
          sourceUrl: "#",
          submittedBy: "",
          albumGradient: "linear-gradient(135deg, oklch(0.3 0.05 280), oklch(0.2 0.05 280))",
        },
    queue: (queue || []).map((e) => ({
      id: e.track.id,
      title: e.track.title,
      artist: e.track.artist,
      duration: e.track.duration,
      source: e.track.source,
      sourceUrl: e.track.sourceUrl,
      submittedBy: e.submittedBy,
      albumGradient: e.track.albumGradient || "linear-gradient(135deg, oklch(0.45 0.15 30), oklch(0.35 0.20 350))",
    })),
    chatMessages: (chat || []).map((m) => ({
      id: m.id,
      username: m.username,
      avatarColor: m.avatarColor,
      message: m.message,
      timestamp: new Date(m.timestamp),
      type: m.type,
    })),
    scheduledStart: r.scheduledStart ? new Date(r.scheduledStart) : undefined,
    lastActive: r.lastActive ? new Date(r.lastActive) : undefined,
    endedAt: r.endedAt ? new Date(r.endedAt) : undefined,
    isFeatured: r.isFeatured,
    isAutoplay: r.isAutoplay,
  }
}
