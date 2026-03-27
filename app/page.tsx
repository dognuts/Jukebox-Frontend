"use client"
// Cache clear v4 - Reimagined homepage
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronRight, Play, Radio } from "lucide-react"
import { toast } from "sonner"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { FeaturedRoom } from "@/components/discover/featured-room"
import { GenrePills } from "@/components/discover/genre-pills"
import { RoomGrid } from "@/components/discover/room-grid"
import { WelcomePopup } from "@/components/welcome-popup"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"


import { ScrollReveal } from "@/components/effects/scroll-reveal"
import { FeaturedRoomSkeleton, RoomCardSkeleton, GenrePillsSkeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { SectionDivider } from "@/components/ui/section-divider"
import { type Room, formatListenerCount } from "@/lib/mock-data"
import { listRooms, toFrontendRoom, getSession, getSessionId } from "@/lib/api"

// Fallback to mock data if backend is unreachable
import { getLiveRooms as getMockLive, getUpcomingRooms as getMockUpcoming, getRecentlyActiveRooms as getMockRecent } from "@/lib/mock-data"

// DJ Avatar colors for Live DJs section
const djAvatarColors = [
  "oklch(0.70 0.18 70)",   // amber/orange
  "oklch(0.70 0.15 290)",  // purple/lavender  
  "oklch(0.75 0.12 170)",  // teal/mint
]

// Live DJs component for hero
function LiveDJs({ rooms }: { rooms: Room[] }) {
  // Get top 3 live rooms sorted by listeners
  const topDJs = [...rooms]
    .filter(r => r.isLive)
    .sort((a, b) => b.listenerCount - a.listenerCount)
    .slice(0, 3)

  if (topDJs.length === 0) return null

  return (
    <div className="flex flex-col items-center lg:items-start gap-3">
      <span 
        className="font-sans text-xs font-semibold tracking-widest uppercase"
        style={{ color: "oklch(0.55 0.02 280)" }}
      >
        Live DJs
      </span>
      <div className="flex items-center gap-4">
        {topDJs.map((room, i) => (
          <Link key={room.id} href={`/room/${room.slug}`} className="group flex flex-col items-center gap-2">
            {/* Avatar with ring */}
            <div 
              className="relative flex items-center justify-center w-14 h-14 rounded-full transition-transform group-hover:scale-110"
              style={{
                background: "oklch(0.12 0.01 280)",
                boxShadow: `0 0 0 3px oklch(0.18 0.01 280), 0 0 0 4px ${djAvatarColors[i % djAvatarColors.length]}`
              }}
            >
              <div 
                className="flex items-center justify-center w-11 h-11 rounded-full font-sans text-lg font-bold"
                style={{ 
                  background: djAvatarColors[i % djAvatarColors.length],
                  color: "oklch(0.12 0.02 280)"
                }}
              >
                {room.dj.displayName.charAt(0).toUpperCase()}
              </div>
            </div>
            {/* Name and listeners */}
            <div className="flex flex-col items-center">
              <span 
                className="font-sans text-xs font-medium truncate max-w-[80px]"
                style={{ color: "oklch(0.85 0.02 280)" }}
              >
                {room.dj.displayName}
              </span>
              <span 
                className="font-sans text-[10px]"
                style={{ color: "oklch(0.55 0.02 280)" }}
              >
                {formatListenerCount(room.listenerCount)} listening
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function HomePage() {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)
  const [allRooms, setAllRooms] = useState<Room[]>([])
  const [loaded, setLoaded] = useState(false)
  const [usingMock, setUsingMock] = useState(false)
  const { registerShortcut } = useKeyboardShortcuts()
  const { isLoggedIn } = useAuth()

  // Ensure anonymous session ID is stored before any WS connections
  useEffect(() => {
    if (!getSessionId()) {
      getSession().catch(() => {})
    }
  }, [])

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
      } catch {
        // Backend unavailable - silently fall back to mock data
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
    // Also re-fetch when user returns to this tab
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchRooms()
    }
    document.addEventListener("visibilitychange", handleVisibility)
    return () => {
      cancelled = true
      clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [])

  // Register keyboard shortcuts
  useEffect(() => {
    registerShortcut({
      key: '/',
      description: 'Focus search',
      action: () => {
        const searchInput = document.querySelector('input[type="text"][placeholder*="search" i]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
          toast.info('Type to search rooms')
        }
      },
    })

    registerShortcut({
      key: '?',
      shift: true,
      description: 'Show keyboard shortcuts',
      action: () => {
        toast.info('Keyboard Shortcuts:\n/ - Focus search\nShift+? - This help message')
      },
    })

    registerShortcut({
      key: 'c',
      description: 'Clear filters',
      action: () => {
        if (selectedGenre) {
          setSelectedGenre(null)
          toast.success('Filters cleared')
        }
      },
    })
  }, [registerShortcut, selectedGenre])

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
  // Rooms created but not yet live (no scheduledStart, no endedAt)
  const waitingRooms = useMemo(
    () =>
      allRooms.filter(
        (r) => !r.isLive && !r.scheduledStart && !r.endedAt && !r.lastActive
      ),
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
      <WelcomePopup isLoggedIn={isLoggedIn} />
      <div className="relative z-10">
        <Navbar />

        {/* Immersive Hero Section */}
        {!selectedGenre && (
          <section className="relative overflow-hidden">
            {/* Dramatic gradient backdrop */}
            <div className="absolute inset-0 z-0">
              <div 
                className="absolute inset-0"
                style={{
                  background: `
                    radial-gradient(ellipse 80% 50% at 50% 0%, oklch(0.25 0.12 80 / 0.3) 0%, transparent 60%),
                    radial-gradient(ellipse 60% 40% at 20% 100%, oklch(0.20 0.15 350 / 0.2) 0%, transparent 50%),
                    radial-gradient(ellipse 50% 35% at 80% 80%, oklch(0.18 0.12 250 / 0.15) 0%, transparent 50%)
                  `,
                }}
              />
              {/* Animated neon lines */}
              <div className="absolute top-0 left-0 right-0 h-px" style={{ 
                background: "linear-gradient(90deg, transparent 0%, oklch(0.82 0.18 80 / 0.5) 20%, oklch(0.70 0.22 350 / 0.5) 50%, oklch(0.72 0.18 250 / 0.5) 80%, transparent 100%)",
                boxShadow: "0 0 20px oklch(0.82 0.18 80 / 0.3), 0 0 40px oklch(0.70 0.22 350 / 0.2)"
              }} />
            </div>

            <div className="relative z-10 mx-auto max-w-7xl px-4 pt-12 pb-16 sm:pt-16 sm:pb-20 lg:px-6">
              {/* Main hero content - two column layout */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10 lg:gap-16">
                {/* Left column - text and CTA */}
                <div className="flex flex-col items-center lg:items-start text-center lg:text-left max-w-2xl">
                  {/* Subtitle */}
                  <span 
                    className="font-sans text-xs sm:text-sm font-semibold tracking-widest uppercase mb-4 animate-fade-in-up"
                    style={{ color: "oklch(0.65 0.12 175)" }}
                  >
                    Listen together, live
                  </span>

                  {/* Main headline with sheen effect on "frequency" */}
                  <h1 
                    className="font-sans text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-5 animate-fade-in-up"
                    style={{ 
                      color: "oklch(0.95 0.01 280)",
                      animationDelay: "50ms"
                    }}
                  >
                    Find your{" "}
                    <span className="text-sheen inline-block" style={{ color: "oklch(0.82 0.18 75)" }}>
                      frequency
                    </span>
                    .
                  </h1>

                  <p 
                    className="font-sans text-base sm:text-lg text-pretty mb-8 max-w-lg animate-fade-in-up"
                    style={{ 
                      color: "oklch(0.60 0.02 280)",
                      animationDelay: "100ms"
                    }}
                  >
                    Join live rooms, discover music with other heads, and vibe together in real time.
                  </p>

                  {/* CTA button */}
                  <div className="animate-fade-in-up" style={{ animationDelay: "150ms" }}>
                    {featuredRoom ? (
                      <Link href={`/room/${featuredRoom.slug}`}>
                        <Button
                          size="lg"
                          className="gap-3 rounded-xl font-sans text-base font-semibold px-8 py-6 group transition-all hover:scale-[1.02] active:scale-[0.98]"
                          style={{
                            background: "oklch(0.75 0.16 75)",
                            color: "oklch(0.12 0.02 80)",
                            boxShadow: "0 4px 20px oklch(0.75 0.16 75 / 0.3)",
                          }}
                        >
                          <Play className="h-5 w-5 fill-current" />
                          Jump into the most active room
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        size="lg"
                        className="gap-3 rounded-xl font-sans text-base font-semibold px-8 py-6"
                        style={{
                          background: "oklch(0.75 0.16 75)",
                          color: "oklch(0.12 0.02 80)",
                          boxShadow: "0 4px 20px oklch(0.75 0.16 75 / 0.3)",
                        }}
                      >
                        <Play className="h-5 w-5 fill-current" />
                        Explore rooms
                      </Button>
                    )}
                  </div>
                </div>

                {/* Right column - Live DJs */}
                <div className="animate-fade-in-up lg:flex-shrink-0" style={{ animationDelay: "200ms" }}>
                  <LiveDJs rooms={liveRooms} />
                </div>
              </div>
            </div>

            {/* Bottom gradient fade */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-32 z-10 pointer-events-none"
              style={{
                background: "linear-gradient(to top, oklch(0.11 0.01 280), transparent)"
              }}
            />
          </section>
        )}

        <main className="mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-8 lg:px-6">
          {/* Connection status banner */}
          {loaded && usingMock && (
            <div
              className="mb-6 rounded-xl px-4 py-3 text-center font-sans text-xs"
              style={{
                background: "oklch(0.30 0.10 60 / 0.15)",
                border: "1px solid oklch(0.50 0.15 60 / 0.25)",
                color: "oklch(0.75 0.12 60)",
              }}
            >
              Backend offline — showing demo data. Start the Go server to see live rooms.
            </div>
          )}

          {/* Featured Room (only when not filtering and no hero displayed) */}
          {!loaded && !selectedGenre && (
            <div className="mb-10">
              <FeaturedRoomSkeleton />
            </div>
          )}
          {loaded && !selectedGenre && featuredRoom && (
            <ScrollReveal className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="flex items-center gap-1.5 rounded px-2.5 py-1" 
                    style={{ 
                      background: "oklch(0.08 0.01 280 / 0.95)", 
                      border: "1.5px solid oklch(0.50 0.24 30)",
                      boxShadow: "0 0 8px oklch(0.50 0.24 30 / 0.5)"
                    }}
                  >
                    <div className="h-2 w-2 rounded-full animate-live-pulse" style={{ background: "oklch(0.58 0.26 30)" }} />
                    <span className="font-sans text-xs font-bold tracking-wide" style={{ color: "oklch(0.58 0.26 30)" }}>
                      FEATURED
                    </span>
                  </div>
                  <h2 className="font-sans text-xl font-bold text-foreground">
                    Now Playing
                  </h2>
                </div>
              </div>
              <FeaturedRoom room={featuredRoom} />
            </ScrollReveal>
          )}

          {/* Genre filters with enhanced styling */}
          <ScrollReveal delay={100} className="mb-8">
            {selectedGenre ? (
              <div className="mb-4 flex items-center gap-3">
                <button
                  onClick={() => setSelectedGenre(null)}
                  className="flex items-center gap-1.5 rounded-full px-4 py-2 font-sans text-sm font-medium transition-all border group"
                  style={{
                    background: "oklch(0.16 0.015 280 / 0.8)",
                    borderColor: "oklch(0.30 0.02 280 / 0.5)",
                    color: "oklch(0.75 0.02 280)",
                  }}
                >
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  Back to All
                </button>
                <h2 className="font-sans text-xl font-bold text-foreground">
                  {selectedGenre}
                </h2>
              </div>
            ) : (
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-sans text-xl font-bold text-foreground">
                  Browse by Genre
                </h2>
              </div>
            )}
            {!loaded ? <GenrePillsSkeleton /> : <GenrePills selected={selectedGenre} onSelect={setSelectedGenre} />}
          </ScrollReveal>

          {/* Live Now Section with enhanced header */}
          {!loaded ? (
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <div className="h-3 w-3 rounded-full" style={{ background: "oklch(0.58 0.26 30)" }} />
                  <div className="absolute inset-0 h-3 w-3 rounded-full animate-ping" style={{ background: "oklch(0.58 0.26 30 / 0.4)" }} />
                </div>
                <h2 className="font-sans text-xl font-bold text-foreground">Live Now</h2>
              </div>
              <div className="flex gap-4 overflow-hidden">
                {[...Array(4)].map((_, i) => (
                  <RoomCardSkeleton key={i} />
                ))}
              </div>
            </div>
          ) : (
            <ScrollReveal delay={200} className="mb-10">
              <RoomGrid
                rooms={filteredLiveRooms}
                title={selectedGenre ? `Live ${selectedGenre} Rooms` : "Live Now"}
                subtitle={
                  selectedGenre
                    ? `${filteredLiveRooms.length} room${filteredLiveRooms.length !== 1 ? "s" : ""} streaming`
                    : `${liveRooms.length} rooms streaming right now`
                }
                showEmptyState={!!selectedGenre}
                emptyStateTitle={`No ${selectedGenre} rooms live`}
                emptyStateDescription={`There are no ${selectedGenre} rooms streaming right now. Check back later or explore other genres.`}
                onClearFilters={() => setSelectedGenre(null)}
              />
            </ScrollReveal>
          )}

          {/* Upcoming Section */}
          {!selectedGenre && upcomingRooms.length > 0 && (
            <>
              <SectionDivider />
              <ScrollReveal delay={300} className="mb-10">
                <RoomGrid
                  rooms={upcomingRooms}
                  title="Coming Up"
                  subtitle="Scheduled shows starting soon"
                />
              </ScrollReveal>
            </>
          )}

          {/* Waiting to Go Live */}
          {!selectedGenre && waitingRooms.length > 0 && (
            <>
              <SectionDivider />
              <ScrollReveal delay={350} className="mb-10">
                <RoomGrid
                  rooms={waitingRooms}
                  title="Ready to Go Live"
                  subtitle="Newly created rooms waiting for their DJ"
                />
              </ScrollReveal>
            </>
          )}

          {/* Recently Played */}
          {!selectedGenre && recentlyPlayedRooms.length > 0 && (
            <>
              <SectionDivider />
              <ScrollReveal delay={400} className="mb-10">
                <RoomGrid
                  rooms={recentlyPlayedRooms}
                  title="Recently Played"
                  subtitle="Sessions from the last 24 hours"
                />
              </ScrollReveal>
            </>
          )}

          {/* No rooms at all - Enhanced empty state */}
          {loaded && !usingMock && allRooms.length === 0 && (
            <div className="py-16 flex flex-col items-center text-center">
              <div className="mb-6 opacity-50">
                <HeroSoundBars />
              </div>
              <EmptyState
                variant="no-rooms"
                title="No rooms live"
                description="All DJs are taking a break. Check back soon or start your own session!"
              />
            </div>
          )}

          {/* Bottom CTA Section */}
          {!selectedGenre && loaded && (
            <ScrollReveal delay={500}>
              <section 
                className="mt-16 mb-8 rounded-2xl p-8 sm:p-12 text-center relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, oklch(0.14 0.02 280), oklch(0.12 0.015 280))",
                  border: "1px solid oklch(0.25 0.02 280 / 0.5)",
                }}
              >
                {/* Decorative elements */}
                <div 
                  className="absolute top-0 left-0 w-64 h-64 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
                  style={{ background: "oklch(0.82 0.18 80 / 0.08)" }}
                />
                <div 
                  className="absolute bottom-0 right-0 w-48 h-48 translate-x-1/4 translate-y-1/4 rounded-full blur-3xl"
                  style={{ background: "oklch(0.70 0.22 350 / 0.08)" }}
                />

                <div className="relative z-10">
                  <h3 
                    className="font-sans text-2xl sm:text-3xl font-bold mb-3 text-balance"
                    style={{ color: "oklch(0.95 0.01 80)" }}
                  >
                    Ready to drop the needle?
                  </h3>
                  <p 
                    className="font-sans text-base mb-6 max-w-md mx-auto text-pretty"
                    style={{ color: "oklch(0.65 0.02 280)" }}
                  >
                    Create your own room and share your favorite tracks with listeners worldwide.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    {isLoggedIn ? (
                      <Link href="/create">
                        <Button
                          size="lg"
                          className="gap-2 rounded-full font-sans font-semibold px-8"
                          style={{
                            background: "linear-gradient(135deg, oklch(0.82 0.18 80), oklch(0.75 0.20 70))",
                            color: "oklch(0.12 0.02 80)",
                            boxShadow: "0 0 20px oklch(0.82 0.18 80 / 0.3)",
                          }}
                        >
                          <Radio className="h-4 w-4" />
                          Start Broadcasting
                        </Button>
                      </Link>
                    ) : (
                      <Link href="/signup">
                        <Button
                          size="lg"
                          className="gap-2 rounded-full font-sans font-semibold px-8"
                          style={{
                            background: "linear-gradient(135deg, oklch(0.82 0.18 80), oklch(0.75 0.20 70))",
                            color: "oklch(0.12 0.02 80)",
                            boxShadow: "0 0 20px oklch(0.82 0.18 80 / 0.3)",
                          }}
                        >
                          Get Started Free
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                    <Link href="/pricing">
                      <Button
                        size="lg"
                        variant="ghost"
                        className="gap-2 rounded-full font-sans font-medium"
                        style={{ color: "oklch(0.70 0.02 280)" }}
                      >
                        View Plans
                      </Button>
                    </Link>
                  </div>
                </div>
              </section>
            </ScrollReveal>
          )}
        </main>

        <Footer />
      </div>
    </div>
  )
}
