import { cache } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import type { RoomDetail } from "@/lib/api"
import { RoomClient } from "./room-client"

const ROOM_SEO: Record<
  string,
  { title: string; description: string; keywords: string[] }
> = {
  "the-b-side": {
    title: "B-Side — Old School Hip-Hop Deep Cuts",
    description:
      "The album tracks that never got a single push, the verses your favorite rapper's favorite rapper wrote. No hits, no skips — just the records real heads know.",
    keywords: [
      "hip hop deep cuts",
      "old school hip hop",
      "underground hip hop room",
      "B-side tracks",
    ],
  },
  sourcecode: {
    title: "Sourcecode — Hear the Sample, Then the Beat It Became",
    description:
      "The original jazz lick, then the boom-bap beat that flipped it. The DNA of hip-hop production, decoded in real time.",
    keywords: [
      "hip hop samples",
      "sample origins",
      "crate digging",
      "beat breakdown",
      "sample room",
    ],
  },
}

// Server-side fetch of the full RoomDetail: { room, nowPlaying, queue,
// recentChat, playbackState }. Wrapped in React cache() so generateMetadata
// and the page component share a single request per render; the fetch's
// revalidate keeps the payload in the Next data cache for 60s across
// requests. Distinguishes a genuine 404 (deleted room / bad slug) from the
// backend being unreachable — the former renders the not-found page, the
// latter falls back to RoomClient's client-side fetch.
type RoomDetailResult =
  | { status: "found"; detail: RoomDetail }
  | { status: "not-found" }
  | { status: "unavailable" }

const getRoomDetail = cache(async (slug: string): Promise<RoomDetailResult> => {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || ""
  // No API base configured (e.g. same-origin proxy in dev) — the server
  // can't resolve a relative URL, so let the client fetch instead.
  if (!apiBase) return { status: "unavailable" }
  try {
    const res = await fetch(`${apiBase}/api/rooms/${slug}`, {
      next: { revalidate: 60 },
    })
    if (res.status === 404) return { status: "not-found" }
    if (!res.ok) return { status: "unavailable" }
    const detail = (await res.json()) as RoomDetail
    if (!detail?.room) return { status: "unavailable" }
    return { status: "found", detail }
  } catch {
    // Backend unreachable at build/SSR time.
    return { status: "unavailable" }
  }
})

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const canonical = `https://jukebox-app.com/room/${slug}`

  const seo = ROOM_SEO[slug]
  if (seo) {
    return {
      title: seo.title,
      description: seo.description,
      keywords: seo.keywords,
      openGraph: {
        title: seo.title,
        description: seo.description,
        url: canonical,
      },
      twitter: {
        card: "summary_large_image",
        title: seo.title,
        description: seo.description,
      },
      alternates: { canonical },
    }
  }

  // For user-created rooms, build metadata from the shared room fetch
  // (deduped with the page component via cache()). Falls through to the
  // generic copy when the backend is unreachable.
  const result = await getRoomDetail(slug)
  // notFound() here (before streaming starts) makes dead room URLs real
  // HTTP 404s; thrown from the page body alone, the loading.tsx shell has
  // already flushed a 200 by the time it renders the not-found UI.
  if (result.status === "not-found") notFound()
  if (result.status === "found" && result.detail.room.name) {
    const room = result.detail.room
    const title = `${room.name} — Live Listening Room`
    const description = room.description
      ? `${room.description} Join ${room.name} on Jukebox and listen to ${room.genre || "music"} together in real time.`
      : `Join ${room.name} on Jukebox. Listen to ${room.genre || "music"} together in real time.`
    return {
      title,
      description,
      openGraph: {
        title: `${room.name} — Jukebox`,
        description: `Live ${room.genre || "music"} room on Jukebox`,
        url: canonical,
      },
      alternates: { canonical },
    }
  }

  return {
    title: `${slug} — Live Listening Room`,
    description:
      "Join this live listening room on Jukebox. Listen together in real time. Free.",
    alternates: { canonical },
  }
}

export default async function RoomPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  // Shares the generateMetadata request via cache() — one backend hit
  // per page view instead of two, and the server-rendered HTML carries
  // the real room shell (name, now-playing, queue, recent chat).
  const result = await getRoomDetail(slug)
  if (result.status === "not-found") notFound()
  return (
    <RoomClient
      slug={slug}
      initialData={result.status === "found" ? result.detail : null}
    />
  )
}
