import type { Metadata } from "next"
import { cache } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Calendar, Music, Play, Radio, Users } from "lucide-react"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { SmartImage } from "@/components/smart-image"
import {
  DETAIL_DATA_URL_MAX_CHARS,
  stripOversizedDataUrl,
} from "@/lib/strip-oversized-data-urls"
import { FollowButton } from "./follow-button"

interface DJProfile {
  username: string
  displayName: string
  bio: string | null
  avatarUrl: string | null
  isLive: boolean
  currentRoomSlug: string | null
  genre: string | null
  stats: {
    totalShows: number
    totalListeners: number
  }
  recentShows: {
    date: string
    roomName: string
    trackCount: number
  }[]
}

// Shared by generateMetadata and the page — cache() dedupes the fetch
// within a single request; `revalidate` handles cross-request caching.
const getDJProfile = cache(async (username: string): Promise<DJProfile | null> => {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || ""
  if (!apiBase) return null

  const res = await fetch(`${apiBase}/api/djs/${encodeURIComponent(username)}`, {
    next: { revalidate: 300 },
  })
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`Failed to load DJ profile for ${username}: ${res.status}`)
  }
  return (await res.json()) as DJProfile
})

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  const { username } = await params
  const profile = await getDJProfile(username)
  if (!profile) notFound()

  // Defensive cap: an oversized `data:` avatar would bloat the OG image tag in
  // the prerendered <head>. Strip it before embedding (https avatars pass
  // through untouched).
  const avatarUrl = stripOversizedDataUrl(
    profile.avatarUrl,
    DETAIL_DATA_URL_MAX_CHARS,
  )

  const canonical = `https://jukebox-app.com/dj/${profile.username}`
  const title = `${profile.displayName} (@${profile.username}) — DJ on Jukebox`
  const description =
    profile.bio ||
    `${profile.displayName} is a DJ on Jukebox. Tune in and listen${
      profile.genre ? ` to ${profile.genre}` : ""
    } together in real time.`

  return {
    title,
    description,
    openGraph: {
      title: `${profile.displayName} on Jukebox`,
      description,
      url: canonical,
      ...(avatarUrl ? { images: [avatarUrl] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: { canonical },
  }
}

function formatStat(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toString()
}

function formatShowDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default async function DJProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const profile = await getDJProfile(username)
  if (!profile) notFound()

  // Defensive cap on the ISR payload: strip an oversized `data:` avatar before
  // it's embedded into the prerendered <img src>. Only `data:` URLs over the
  // 512KB detail cap are replaced with "" (https avatars pass through); the ""
  // falls through to the initials placeholder below.
  const avatarUrl = stripOversizedDataUrl(
    profile.avatarUrl,
    DETAIL_DATA_URL_MAX_CHARS,
  )

  const liveRoomHref =
    profile.isLive && profile.currentRoomSlug
      ? `/room/${profile.currentRoomSlug}`
      : null

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10">
        <Navbar />

        <main className="mx-auto max-w-4xl px-4 py-8 lg:px-6">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 font-sans text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Discover
          </Link>

          {/* DJ Header */}
          <div className="mb-10 rounded-2xl border border-border/30 p-6 glass-panel sm:p-8">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-8">
              {/* Avatar */}
              <div className="relative shrink-0">
                {avatarUrl ? (
                  <div className="relative h-28 w-28 overflow-hidden rounded-full sm:h-36 sm:w-36">
                    <SmartImage
                      src={avatarUrl}
                      alt={`${profile.displayName}'s avatar`}
                      fill
                      sizes="144px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div
                    aria-hidden="true"
                    className="flex h-28 w-28 items-center justify-center rounded-full bg-muted sm:h-36 sm:w-36"
                  >
                    <span className="font-sans text-4xl font-bold text-muted-foreground sm:text-5xl">
                      {profile.displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                {/* Live indicator */}
                {profile.isLive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-0.5 border border-secondary/30">
                    <span className="h-2 w-2 rounded-full bg-secondary animate-live-pulse" />
                    <span className="font-sans text-[10px] font-bold text-secondary">
                      LIVE
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex flex-1 flex-col items-center gap-4 sm:items-start">
                <div className="text-center sm:text-left">
                  <h1 className="font-sans text-2xl font-bold text-foreground sm:text-3xl">
                    {profile.displayName}
                  </h1>
                  <p className="mt-0.5 font-sans text-sm text-muted-foreground">
                    @{profile.username}
                  </p>
                  {profile.genre && (
                    <span className="mt-2 inline-block rounded-full border border-border/40 px-2.5 py-0.5 font-sans text-xs text-muted-foreground">
                      {profile.genre}
                    </span>
                  )}
                </div>

                {profile.bio && (
                  <p className="max-w-lg text-center font-sans text-sm text-foreground/70 leading-relaxed sm:text-left text-pretty">
                    {profile.bio}
                  </p>
                )}

                {/* Stats */}
                <div className="flex flex-wrap items-center gap-5">
                  <div className="flex items-center gap-1.5">
                    <Radio className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-sm font-semibold text-foreground">
                      {formatStat(profile.stats.totalShows)}
                    </span>
                    <span className="font-sans text-xs text-muted-foreground">
                      shows
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-sm font-semibold text-foreground">
                      {formatStat(profile.stats.totalListeners)}
                    </span>
                    <span className="font-sans text-xs text-muted-foreground">
                      total listeners
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <FollowButton displayName={profile.displayName} />
                  {liveRoomHref && (
                    <Link href={liveRoomHref}>
                      <Button
                        variant="outline"
                        className="gap-2 rounded-full border-secondary/40 text-secondary hover:bg-secondary/10"
                      >
                        <Play className="h-4 w-4" />
                        Tune In
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Currently live room */}
          {liveRoomHref && (
            <div className="mb-10">
              <h2 className="mb-4 font-sans text-lg font-bold text-foreground">
                Currently Live
              </h2>
              <Link
                href={liveRoomHref}
                className="group flex max-w-sm items-center gap-4 rounded-2xl border border-secondary/30 p-4 glass-panel transition-colors hover:border-secondary/60"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/10">
                  <span className="h-2.5 w-2.5 rounded-full bg-secondary animate-live-pulse" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="font-sans text-sm font-semibold text-foreground">
                    {profile.displayName} is live right now
                  </span>
                  <span className="truncate font-sans text-xs text-muted-foreground group-hover:text-secondary transition-colors">
                    Join the room →
                  </span>
                </span>
              </Link>
            </div>
          )}

          {/* Recent shows */}
          {profile.recentShows.length > 0 && (
            <div className="rounded-2xl border border-border/30 p-6 glass-panel">
              <div className="flex flex-col gap-4">
                <h2 className="font-sans text-lg font-bold text-foreground">
                  Recent Shows
                </h2>
                <div className="flex flex-col gap-3">
                  {profile.recentShows.map((show, i) => (
                    <div
                      key={`${show.date}-${i}`}
                      className="group flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-muted/20 border border-border/20 hover:border-border/40"
                    >
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted/40">
                        <Radio className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <h3 className="truncate font-sans text-sm font-semibold text-foreground">
                          {show.roomName}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="flex items-center gap-1 font-sans text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatShowDate(show.date)}
                          </span>
                          <span className="flex items-center gap-1 font-sans text-xs text-muted-foreground">
                            <Music className="h-3 w-3" />
                            {show.trackCount} tracks
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  )
}
