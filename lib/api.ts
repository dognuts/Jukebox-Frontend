/**
 * Jukebox API client
 * Talks to the Go backend at /api/...
 * Session ID persisted in localStorage for cross-origin stability.
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || ""

const TOKEN_KEY = "jukebox_access_token"
const REFRESH_KEY = "jukebox_refresh_token"

// Name of the window event fired when api.ts force-clears auth tokens.
// AuthProvider listens for this to sync React state (setUser(null), etc).
export const AUTH_LOGOUT_EVENT = "jukebox:auth-logout"

function getToken(): string | null {
  return typeof window !== "undefined"
    ? localStorage.getItem(TOKEN_KEY)
    : null
}

function clearAuthTokens() {
  if (typeof window === "undefined") return
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
  window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT))
}

// Deduplicates concurrent refresh attempts. When many authRequests hit 401
// simultaneously, only the first fires a refresh; the rest await the same
// promise. Otherwise we'd blow through refresh tokens (each rotation revokes
// the previous) and log the user out under normal conditions.
let refreshInFlight: Promise<boolean> | null = null

/**
 * refreshTokens exchanges the stored refresh token for a new access + refresh
 * pair, writing them to localStorage. Returns true on success.
 *
 * On ANY failure — HTTP error, network error, missing refresh token — clears
 * localStorage and fires AUTH_LOGOUT_EVENT so listeners can update state.
 * (Previously the network-error case was silently swallowed, which left the
 * client with a stale access token that appeared valid until expiry — the
 * cause of the expired-session save failures seen on 2026-04-22.)
 */
export async function refreshTokens(): Promise<boolean> {
  if (typeof window === "undefined") return false
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    const refreshToken = localStorage.getItem(REFRESH_KEY)
    if (!refreshToken) {
      clearAuthTokens()
      return false
    }
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      })
      if (!res.ok) {
        clearAuthTokens()
        return false
      }
      const data = (await res.json()) as { accessToken: string; refreshToken: string }
      localStorage.setItem(TOKEN_KEY, data.accessToken)
      localStorage.setItem(REFRESH_KEY, data.refreshToken)
      return true
    } catch {
      // Network error — previously swallowed silently. Treat as a logout
      // so the UI reflects the broken session instead of limping along
      // with expired credentials.
      clearAuthTokens()
      return false
    }
  })()

  try {
    return await refreshInFlight
  } finally {
    refreshInFlight = null
  }
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

  // Merge headers properly — don't let ...options overwrite the headers object
  const mergedHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(sessionId ? { "X-Session-ID": sessionId } : {}),
    ...(options?.headers as Record<string, string> ?? {}),
  }

  const { headers: _dropHeaders, ...restOptions } = options ?? {}

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include", // send session cookie
    ...restOptions,
    headers: mergedHeaders,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`API ${res.status}: ${text}`)
  }

  return res.json()
}

/**
 * Authenticated request — includes JWT Bearer token. On 401 (expired or
 * missing user in server context), attempts one refresh and retries the
 * request. If the refresh fails, throws the original 401 and fires
 * AUTH_LOGOUT_EVENT via refreshTokens().
 */
export async function authRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const doFetch = async (): Promise<Response> => {
    const token = getToken()
    const sessionId = getSessionId()
    const mergedHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(sessionId ? { "X-Session-ID": sessionId } : {}),
      ...((options?.headers as Record<string, string>) ?? {}),
    }
    const { headers: _dropHeaders, ...restOptions } = options ?? {}
    return fetch(`${API_BASE}${path}`, {
      credentials: "include",
      ...restOptions,
      headers: mergedHeaders,
    })
  }

  let res = await doFetch()
  if (res.status === 401) {
    // The access token is expired or no longer recognized server-side.
    // Try one refresh and replay. refreshTokens() dedupes concurrent calls,
    // so a page full of authRequests hitting 401 at once only triggers one
    // /api/auth/refresh round trip.
    const refreshed = await refreshTokens()
    if (refreshed) {
      res = await doFetch()
    }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`API ${res.status}: ${text}`)
  }

  return res.json()
}

// ---------- Admin: bulk track search ----------

export interface TrackCandidate {
  title: string
  artist: string
  duration: number
  source: string
  sourceUrl: string
  thumbnail: string
  channel: string
}

export type AdminSearchTrackResult =
  | { ok: true; primary: TrackCandidate; alternatives: TrackCandidate[] }
  | {
      ok: false
      reason: "no_results" | "quota" | "not_configured" | "error"
      message?: string
    }

/**
 * GET /api/admin/search-track?q=... — admin-only endpoint that resolves a
 * free-form query to a YouTube Data API match + alternatives.
 * Returns a discriminated union so callers can handle 204 (no results),
 * 429 (quota), 503 (not configured), and generic errors distinctly without
 * the throw-on-non-2xx behavior of authRequest.
 */
export async function adminSearchTrack(query: string): Promise<AdminSearchTrackResult> {
  const doFetch = async (): Promise<Response> => {
    const token = getToken()
    const sessionId = getSessionId()
    return fetch(
      `${API_BASE}/api/admin/search-track?q=${encodeURIComponent(query)}`,
      {
        credentials: "include",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(sessionId ? { "X-Session-ID": sessionId } : {}),
        },
      },
    )
  }

  let res = await doFetch()
  // Same refresh-then-retry pattern as authRequest. Without this, a 40-track
  // bulk import started near token expiry would lose every row that landed
  // post-expiry to a 401 that the batch treats as a generic error.
  if (res.status === 401) {
    const refreshed = await refreshTokens()
    if (refreshed) {
      res = await doFetch()
    }
  }

  if (res.status === 204) return { ok: false, reason: "no_results" }
  if (res.status === 429) {
    return { ok: false, reason: "quota", message: await res.text().catch(() => "") }
  }
  if (res.status === 503) {
    return {
      ok: false,
      reason: "not_configured",
      message: await res.text().catch(() => ""),
    }
  }
  if (!res.ok) {
    return {
      ok: false,
      reason: "error",
      message: `${res.status}: ${await res.text().catch(() => res.statusText)}`,
    }
  }
  const data = (await res.json()) as {
    primary: TrackCandidate
    alternatives: TrackCandidate[]
  }
  return { ok: true, primary: data.primary, alternatives: data.alternatives }
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
  infoSnippet?: string
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
  recentChat?: APIChatMessage[]
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
  mediaUrl?: string
  mediaType?: string
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
  playlistId?: string
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
          infoSnippet: nowPlaying.infoSnippet,
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
