import type { Metadata } from "next"
import { RoomClient } from "./room-client"

const ROOM_SEO: Record<
  string,
  { title: string; description: string; keywords: string[] }
> = {
  "lo-fi": {
    title: "Lo-fi Listening Room — Chill Beats to Study & Relax To",
    description:
      "Join a live lo-fi hip hop listening room. Study, relax, or work alongside others with chill beats in real time. Free, no account needed.",
    keywords: [
      "lo-fi listening room",
      "lo-fi beats to study to",
      "chill study music room",
      "lo-fi hip hop room",
    ],
  },
  "hip-hop": {
    title: "Hip-Hop Listening Room — Discover & Vibe Together",
    description:
      "Live hip-hop listening room. Discover new tracks, share classics, and vibe with hip-hop heads in real time. Free to join.",
    keywords: [
      "hip hop listening room",
      "hip hop music community",
      "listen to hip hop together",
    ],
  },
  jazz: {
    title: "Jazz Listening Room — Smooth Jazz & Standards Live",
    description:
      "Step into a live jazz listening room. Enjoy smooth jazz, standards, and modern jazz with fellow jazz lovers in real time.",
    keywords: [
      "jazz listening room online",
      "listen to jazz together",
      "jazz music community",
    ],
  },
  electronic: {
    title: "Electronic Music Room — Live Beats & Energy",
    description:
      "Live electronic music room. From house to techno to ambient, ride the energy with electronic music fans in real time.",
    keywords: [
      "electronic music room",
      "electronic listening room",
      "edm community online",
    ],
  },
  indie: {
    title: "Indie Listening Room — Discover Underground Artists",
    description:
      "Live indie music listening room. Discover underground artists and deep cuts with fellow indie music lovers. Free.",
    keywords: [
      "indie music listening room",
      "indie music community",
      "discover indie music",
    ],
  },
  soul: {
    title: "Soul Music Room — Smooth Vibes & Timeless Grooves",
    description:
      "Live soul music listening room. Classic soul, neo-soul, and R&B — share the groove with soul music fans in real time.",
    keywords: [
      "soul music listening room",
      "soul music community",
      "listen to soul together",
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
