import type { Metadata } from "next"
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

  // For user-created rooms, try fetching room data from the Go backend.
  // The endpoint returns RoomDetail: { room, nowPlaying, queue, recentChat, playbackState }
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || ""
    if (apiBase) {
      const res = await fetch(`${apiBase}/api/rooms/${slug}`, {
        next: { revalidate: 60 },
      })
      if (res.ok) {
        const data = (await res.json()) as {
          room?: { name?: string; genre?: string; description?: string }
        }
        const room = data?.room
        if (room?.name) {
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
      }
    }
  } catch {
    // Backend unreachable at build/SSR time — fall through to generic.
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
  return <RoomClient slug={slug} />
}
