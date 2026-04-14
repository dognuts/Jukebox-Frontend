"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { HomeHero } from "@/components/discover/home-hero"
import { FeaturedRoomCard } from "@/components/discover/featured-room-card"
import { LiveRoomGrid } from "@/components/discover/live-room-grid"
import { ActivityFeed } from "@/components/discover/activity-feed"
import { WelcomePopup } from "@/components/welcome-popup"
import { useAuth } from "@/lib/auth-context"

import { ScrollReveal } from "@/components/effects/scroll-reveal"
import { EmptyState } from "@/components/ui/empty-state"
import { type Room } from "@/lib/mock-data"
import {
  listRooms,
  toFrontendRoom,
  getSession,
  getSessionId,
} from "@/lib/api"

// Fallback to mock data if backend is unreachable
import {
  getLiveRooms as getMockLive,
  getUpcomingRooms as getMockUpcoming,
  getRecentlyActiveRooms as getMockRecent,
} from "@/lib/mock-data"

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
          setAllRooms(apiRooms.map((r) => toFrontendRoom(r, r.nowPlaying, undefined, r.recentChat)))
          setLoaded(true)
        }
      } catch {
        // Backend unavailable — silently fall back to mock data
        if (!cancelled) {
          setUsingMock(true)
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
      key: "/",
      description: "Focus search",
      action: () => {
        const searchInput = document.querySelector(
          'input[type="text"][placeholder*="search" i]'
        ) as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
          toast.info("Type to search rooms")
        }
      },
    })

    registerShortcut({
      key: "?",
      shift: true,
      description: "Show keyboard shortcuts",
      action: () => {
        toast.info(
          "Keyboard Shortcuts:\n/ - Focus search\nShift+? - This help message"
        )
      },
    })

    registerShortcut({
      key: "c",
      description: "Clear filters",
      action: () => {
        if (selectedGenre) {
          setSelectedGenre(null)
          toast.success("Filters cleared")
        }
      },
    })
  }, [registerShortcut, selectedGenre])

  const liveRooms = useMemo(
    () => allRooms.filter((r) => r.isLive),
    [allRooms]
  )

  // Featured room: manually featured wins, otherwise pick the one with the
  // most listeners.
  const featuredRoom = useMemo(() => {
    if (liveRooms.length === 0) return null
    const featured = liveRooms.find((r) => (r as any).isFeatured)
    if (featured) return featured
    return [...liveRooms].sort(
      (a, b) => b.listenerCount - a.listenerCount
    )[0]
  }, [liveRooms])

  const filteredLiveRooms = useMemo(() => {
    if (!selectedGenre) return liveRooms
    return liveRooms.filter((r) => r.genre === selectedGenre)
  }, [selectedGenre, liveRooms])

  const liveCount = liveRooms.length

  return (
    <div className="relative min-h-screen" style={{ background: "#0d0b10" }}>
      <WelcomePopup isLoggedIn={isLoggedIn} />
      <div className="relative z-10">
        <Navbar />

        <main
          className="shell"
          style={{ paddingBottom: "var(--space-3xl)" }}
        >
          {/* Connection status banner */}
          {loaded && usingMock && (
            <div
              className="rounded-xl text-center"
              style={{
                marginTop: "var(--space-md)",
                paddingBlock: "var(--space-sm)",
                paddingInline: "var(--space-md)",
                background: "rgba(232,154,60,0.1)",
                border: "0.5px solid rgba(232,154,60,0.25)",
                color: "#e89a3c",
                fontSize: "var(--fs-small)",
              }}
            >
              Backend offline — showing demo data. Start the Go server to see live rooms.
            </div>
          )}

          {/* Hero */}
          <HomeHero
            liveCount={loaded ? liveCount : null}
            selectedGenre={selectedGenre}
            onSelectGenre={setSelectedGenre}
          />

          {/* Featured room card — hidden while loading or filtering by genre */}
          {loaded && !selectedGenre && featuredRoom && (
            <div style={{ marginBottom: "var(--space-2xl)" }}>
              <ScrollReveal>
                <FeaturedRoomCard room={featuredRoom} />
              </ScrollReveal>
            </div>
          )}

          {/* Live now grid */}
          {loaded && (
            <div style={{ marginBottom: "var(--space-2xl)" }}>
              <ScrollReveal delay={100}>
                <LiveRoomGrid
                  rooms={filteredLiveRooms}
                  headerLabel={selectedGenre ? `${selectedGenre} rooms live` : "Live now"}
                  emptyLabel={
                    selectedGenre
                      ? `No ${selectedGenre} rooms streaming right now`
                      : "No rooms live right now"
                  }
                />
              </ScrollReveal>
            </div>
          )}

          {/* Activity feed — hidden while filtering */}
          {loaded && !selectedGenre && (
            <div style={{ marginBottom: "var(--space-xl)" }}>
              <ScrollReveal delay={200}>
                <ActivityFeed rooms={allRooms} />
              </ScrollReveal>
            </div>
          )}

          {/* No rooms at all */}
          {loaded && !usingMock && allRooms.length === 0 && (
            <div style={{ marginTop: "var(--space-lg)" }}>
              <EmptyState
                variant="no-rooms"
                title="No rooms live"
                description="All DJs are taking a break. Check back soon or start your own session!"
              />
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  )
}
