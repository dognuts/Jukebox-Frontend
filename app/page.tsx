"use client"

import { useState, useMemo, useEffect } from "react"
import { ArrowLeft } from "lucide-react"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { FeaturedRoom } from "@/components/discover/featured-room"
import { GenrePills } from "@/components/discover/genre-pills"
import { RoomGrid } from "@/components/discover/room-grid"
import { BubbleBackground } from "@/components/effects/bubble-background"
import { ScrollReveal } from "@/components/effects/scroll-reveal"
import { FeaturedRoomSkeleton, RoomCardSkeleton, GenrePillsSkeleton } from "@/components/ui/skeleton"
import { type Room } from "@/lib/mock-data"
import { listRooms, toFrontendRoom } from "@/lib/api"

// Fallback to mock data if backend is unreachable
import { getLiveRooms as getMockLive, getUpcomingRooms as getMockUpcoming, getRecentlyActiveRooms as getMockRecent } from "@/lib/mock-data"

export default function HomePage() {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)
  const [allRooms, setAllRooms] = useState<Room[]>([])
  const [loaded, setLoaded] = useState(false)
  const [usingMock, setUsingMock] = useState(false)

  // Fetch rooms from backend
  useEffect(() => {
    let cancelled = false
    async function fetchRooms() {
      try {
        const apiRooms = await listRooms()
        if (!cancelled) {
          setAllRooms(apiRooms.map((r) => toFrontendRoom(r, r.nowPlaying)))
          setLoaded(true)
        }
      } catch (err) {
        console.warn("[jukebox] Backend unreachable, falling back to mock data:", err)
        if (!cancelled) {
          setUsingMock(true)
          // Combine all mock rooms as fallback
          const live = getMockLive()
          const upcoming = getMockUpcoming()
          const recent = getMockRecent()
          const seen = new Set<string>()
          const combined: Room[] = []
          for (const r of [...live, ...upcoming, ...recent]) {
            if (!seen.has(r.id)) {
              seen.add(r.id)
              combined.push(r)
            }
          }
          setAllRooms(combined)
          setLoaded(true)
        }
      }
    }
    fetchRooms()
    // Re-fetch every 30s
    const interval = setInterval(fetchRooms, 30000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const liveRooms = useMemo(() => allRooms.filter((r) => r.isLive), [allRooms])
  const upcomingRooms = useMemo(
    () =>
      allRooms
        .filter((r) => r.scheduledStart && !r.isLive)
        .sort((a, b) => (a.scheduledStart?.getTime() ?? 0) - (b.scheduledStart?.getTime() ?? 0)),
    [allRooms]
  )
  const recentlyPlayedRooms = useMemo(
    () =>
      allRooms
        .filter((r) => !r.isLive && (r.endedAt || r.lastActive))
        .sort((a, b) => {
          const aTime = a.endedAt?.getTime() ?? a.lastActive?.getTime() ?? 0
          const bTime = b.endedAt?.getTime() ?? b.lastActive?.getTime() ?? 0
          return bTime - aTime
        }),
    [allRooms]
  )

  // Featured room: manually set featured, or auto-pick by most listeners
  const featuredRoom = useMemo(() => {
    if (liveRooms.length === 0) return null
    // Prefer manually featured room
    const featured = liveRooms.find((r) => (r as any).isFeatured)
    if (featured) return featured
    // Auto-pick: most listeners
    return [...liveRooms].sort((a, b) => b.listenerCount - a.listenerCount)[0]
  }, [liveRooms])

  const filteredLiveRooms = useMemo(() => {
    if (!selectedGenre) return liveRooms
    return liveRooms.filter((r) => r.genre === selectedGenre)
  }, [selectedGenre, liveRooms])

  return (
    <div className="relative min-h-screen">
      <BubbleBackground />
      <div className="relative z-10">
        <Navbar />

        <main className="mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-8 lg:px-6">
          {/* Connection status banner */}
          {loaded && usingMock && (
            <div
              className="mb-4 rounded-xl px-4 py-2 text-center font-sans text-xs"
              style={{
                background: "oklch(0.30 0.10 60 / 0.2)",
                border: "1px solid oklch(0.50 0.15 60 / 0.3)",
                color: "oklch(0.75 0.12 60)",
              }}
            >
              Backend offline — showing demo data. Start the Go server to see live rooms.
            </div>
          )}

          {/* Hero featured room (hidden when filtering) */}
          {!loaded && !selectedGenre && (
            <div className="mb-8 sm:mb-10">
              <FeaturedRoomSkeleton />
            </div>
          )}
          {loaded && !selectedGenre && featuredRoom && (
            <ScrollReveal className="mb-8 sm:mb-10">
              <FeaturedRoom room={featuredRoom} />
            </ScrollReveal>
          )}

          {/* Genre filters */}
          <ScrollReveal delay={100} className="mb-6 sm:mb-8">
            {selectedGenre ? (
              <div className="mb-3 flex items-center gap-3">
                <button
                  onClick={() => setSelectedGenre(null)}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-sans text-sm font-medium transition-all border"
                  style={{
                    background: "oklch(0.16 0.015 280 / 0.6)",
                    borderColor: "oklch(0.25 0.02 280 / 0.5)",
                    color: "oklch(0.65 0.02 280)",
                  }}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </button>
                <h2 className="font-sans text-lg font-bold text-foreground">
                  {selectedGenre} Rooms
                </h2>
              </div>
            ) : (
              <h2 className="mb-3 font-sans text-lg font-bold text-foreground">
                Browse by Genre
              </h2>
            )}
            {!loaded ? <GenrePillsSkeleton /> : <GenrePills selected={selectedGenre} onSelect={setSelectedGenre} />}
          </ScrollReveal>

          {/* Live Now */}
          {!loaded ? (
            <div className="mb-8 sm:mb-10">
              <h2 className="mb-4 font-sans text-lg font-bold text-foreground">Live Now</h2>
              <div className="flex gap-4 overflow-hidden">
                {[...Array(4)].map((_, i) => (
                  <RoomCardSkeleton key={i} />
                ))}
              </div>
            </div>
          ) : (
            <ScrollReveal delay={200} className="mb-8 sm:mb-10">
              <RoomGrid
                rooms={filteredLiveRooms}
                title={selectedGenre ? `Live ${selectedGenre} Rooms` : "Live Now"}
                subtitle={
                  selectedGenre
                    ? `${filteredLiveRooms.length} room${filteredLiveRooms.length !== 1 ? "s" : ""} streaming`
                    : "Streaming right now"
                }
              />
            </ScrollReveal>
          )}

          {/* Upcoming */}
          {!selectedGenre && upcomingRooms.length > 0 && (
            <ScrollReveal delay={300} className="mb-8 sm:mb-10">
              <RoomGrid
                rooms={upcomingRooms}
                title="Upcoming"
                subtitle="Scheduled shows starting soon"
              />
            </ScrollReveal>
          )}

          {/* Recently Played */}
          {!selectedGenre && recentlyPlayedRooms.length > 0 && (
            <ScrollReveal delay={400} className="mb-8 sm:mb-10">
              <RoomGrid
                rooms={recentlyPlayedRooms}
                title="Recently Played"
                subtitle="Sessions from the last 24 hours"
              />
            </ScrollReveal>
          )}

          {/* No rooms at all */}
          {loaded && !usingMock && allRooms.length === 0 && (
            <div className="text-center py-20">
              <p className="font-sans text-lg text-muted-foreground mb-2">No rooms yet</p>
              <p className="font-sans text-sm text-muted-foreground">
                Create the first room to get started!
              </p>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  )
}
