import { cache } from "react"
import { HomeClient } from "@/components/discover/home-client"
import { SEOContent, HomeStructuredData } from "./seo-content"
import type { APIRoom } from "@/lib/api"
import {
  LIST_DATA_URL_MAX_CHARS,
  stripOversizedDataUrl,
} from "@/lib/strip-oversized-data-urls"

// Fetch the rooms list on the server so the first HTML paint already shows
// the featured card, live grid and activity feed (no client-fetch layout
// shift, and crawlers see live-room content). cache() dedupes within a
// render; revalidate keeps the payload fresh enough for a landing page.
// Returns null when the backend is unreachable — the client component then
// fetches on its own and shows skeletons/offline states.
const getInitialRooms = cache(async (): Promise<APIRoom[] | null> => {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || ""
  if (!apiBase) return null
  try {
    const res = await fetch(`${apiBase}/api/rooms`, {
      next: { revalidate: 30 },
    })
    if (!res.ok) return null
    return (await res.json()) as APIRoom[]
  } catch {
    return null
  }
})

// Defensive cap on the ISR payload: strip any oversized `data:` cover (or chat
// media) URL before it's embedded into the prerendered homepage. A rooms list
// embeds many rooms at once, so this uses the tighter 128KB list cap — 50
// rooms × 512KB would still exceed Vercel's 20MB ISR limit. Only `data:` URLs
// over the cap are replaced with ""; https covers pass through untouched. The
// only `data:`-capable fields on APIRoom are `coverArt` and each recent-chat
// message's `mediaUrl` (APITrack carries only a CSS `albumGradient`, never an
// image data URL).
function stripOversizedRoomListDataUrls(rooms: APIRoom[]): APIRoom[] {
  return rooms.map((room) => ({
    ...room,
    coverArt: stripOversizedDataUrl(room.coverArt, LIST_DATA_URL_MAX_CHARS),
    recentChat: room.recentChat?.map((message) => ({
      ...message,
      mediaUrl: stripOversizedDataUrl(message.mediaUrl, LIST_DATA_URL_MAX_CHARS),
    })),
  }))
}

export default async function HomePage() {
  const rooms = await getInitialRooms()
  const initialRooms = rooms ? stripOversizedRoomListDataUrls(rooms) : null
  return (
    <>
      <HomeStructuredData />
      <HomeClient seoSlot={<SEOContent />} initialRooms={initialRooms} />
    </>
  )
}
