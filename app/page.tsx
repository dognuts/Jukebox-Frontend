import { cache } from "react"
import { HomeClient } from "@/components/discover/home-client"
import { SEOContent, HomeStructuredData } from "./seo-content"
import type { APIRoom } from "@/lib/api"

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

export default async function HomePage() {
  const initialRooms = await getInitialRooms()
  return (
    <>
      <HomeStructuredData />
      <HomeClient seoSlot={<SEOContent />} initialRooms={initialRooms} />
    </>
  )
}
