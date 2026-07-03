/**
 * Music-domain types for the discover surface.
 *
 * Interim home for the shapes previously imported from lib/mock-data.ts
 * (slated for deletion). Kept structurally identical to the originals so
 * rooms produced by toFrontendRoom() in lib/api.ts remain assignable.
 */

export type TrackSource = "youtube" | "soundcloud" | "mp3"
export type RequestPolicy = "closed" | "open" | "approval"
export type ChatMessageType = "message" | "request" | "announcement" | "activity_join" | "activity_tip" | "activity_leave"

export interface Track {
  id: string
  title: string
  artist: string
  duration: number // seconds
  source: TrackSource
  sourceUrl: string
  submittedBy: string
  albumGradient: string // CSS gradient for placeholder art
  infoSnippet?: string // optional admin-authored blurb shown to listeners
}

export interface ChatMessage {
  id: string
  username: string
  avatarColor: string
  message: string
  timestamp: Date
  type: ChatMessageType
  mediaUrl?: string
  mediaType?: string
}

export interface Room {
  id: string
  slug: string
  name: string
  description: string
  djName: string
  djUsername: string
  djAvatarColor: string
  creatorUserId?: string
  coverGradient: string
  genre: string
  isLive: boolean
  listenerCount: number
  isOfficial: boolean
  requestPolicy: RequestPolicy
  nowPlaying: Track
  queue: Track[]
  chatMessages: ChatMessage[]
  vibes: string[] // Up to 3 DJ-selected mood/vibe tags
  coverArt?: string // Optional uploaded artwork URL/data-URL
  scheduledStart?: Date // For upcoming shows
  lastActive?: Date // For recently active rooms
  endedAt?: Date // When the session was ended
  isFeatured?: boolean // Admin-selected featured room
  isAutoplay?: boolean // 24/7 autoplay room
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function formatListenerCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`
  }
  return count.toString()
}
