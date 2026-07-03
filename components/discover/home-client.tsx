"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import {
  useKeyboardShortcuts,
  type KeyboardShortcut,
} from "@/hooks/use-keyboard-shortcuts"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { HomeHero } from "@/components/discover/home-hero"
import { FeaturedRoomCard } from "@/components/discover/featured-room-card"
import { LiveRoomGrid } from "@/components/discover/live-room-grid"
import { ActivityFeed } from "@/components/discover/activity-feed"
import {
  FeaturedRoomCardSkeleton,
  LiveRoomGridSkeleton,
} from "@/components/discover/home-skeletons"
import { WelcomePopup } from "@/components/welcome-popup"
import { useAuth } from "@/lib/auth-context"

import { EmptyState } from "@/components/ui/empty-state"
import { type Room } from "@/components/discover/types"
import {
  API_BASE,
  type APIRoom,
  toFrontendRoom,
  getSession,
  getSessionId,
} from "@/lib/api"

// Human-readable key sequence for the shortcuts help dialog, e.g.
// ["Shift", "?"] or ["/"].
function formatShortcutKeys(shortcut: KeyboardShortcut): string[] {
  const keys: string[] = []
  if (shortcut.ctrl) keys.push("Ctrl")
  if (shortcut.meta) keys.push("Cmd")
  if (shortcut.alt) keys.push("Alt")
  if (shortcut.shift) keys.push("Shift")
  keys.push(
    shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key
  )
  return keys
}

function mapRooms(apiRooms: APIRoom[]): Room[] {
  return apiRooms.map((r) =>
    toFrontendRoom(r, r.nowPlaying, undefined, r.recentChat)
  )
}

// Direct fetch instead of listRooms() so the poll can pass an AbortSignal
// (lib/api.ts request() doesn't accept one).
async function fetchRoomList(signal: AbortSignal): Promise<APIRoom[]> {
  const sessionId = getSessionId()
  const res = await fetch(`${API_BASE}/api/rooms`, {
    credentials: "include",
    headers: sessionId ? { "X-Session-ID": sessionId } : undefined,
    signal,
  })
  if (!res.ok) {
    throw new Error(`API ${res.status}`)
  }
  return res.json()
}

export function HomeClient({
  seoSlot,
  initialRooms,
}: {
  seoSlot?: React.ReactNode
  // Rooms fetched by the server component (app/page.tsx) so the first HTML
  // paint already contains the featured card, grid and activity feed. `null`
  // when the server-side fetch failed — the client poll below recovers.
  initialRooms: APIRoom[] | null
}) {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)
  const [allRooms, setAllRooms] = useState<Room[]>(() =>
    initialRooms ? mapRooms(initialRooms) : []
  )
  const [loaded, setLoaded] = useState(initialRooms !== null)
  const [offline, setOffline] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const { registerShortcut, shortcuts } = useKeyboardShortcuts()
  const { isLoggedIn } = useAuth()

  // Raw payload of the last applied fetch — polls whose response is
  // byte-identical skip setState entirely so the hero, featured card, grid
  // and activity feed don't re-render every 30s when nothing changed.
  const lastPayloadRef = useRef<string | null>(
    initialRooms ? JSON.stringify(initialRooms) : null
  )

  // Ensure anonymous session ID is stored before any WS connections
  useEffect(() => {
    if (!getSessionId()) {
      getSession().catch(() => {})
    }
  }, [])

  // Poll rooms from the backend (initial refresh + every 30s)
  useEffect(() => {
    let disposed = false
    let inFlight: AbortController | null = null

    async function fetchRooms() {
      // Don't burn network/battery while the tab is hidden — the
      // visibilitychange handler below refetches on return.
      if (document.visibilityState === "hidden") return

      // One request at a time: a stalled previous tick is aborted instead of
      // stacking unbounded in-flight requests.
      inFlight?.abort()
      const controller = new AbortController()
      inFlight = controller
      const timeout = setTimeout(() => controller.abort(), 10_000)

      try {
        const apiRooms = await fetchRoomList(controller.signal)
        if (disposed || inFlight !== controller) return
        setOffline(false)
        setLoaded(true)
        const payload = JSON.stringify(apiRooms)
        if (payload !== lastPayloadRef.current) {
          lastPayloadRef.current = payload
          setAllRooms(mapRooms(apiRooms))
        }
      } catch {
        // Aborted by unmount or a newer tick — not a connectivity signal.
        if (disposed || inFlight !== controller) return
        // `loaded` stays as-is: with data we keep showing the last known
        // rooms, without it the skeletons stay up while the poll retries.
        setOffline(true)
      } finally {
        clearTimeout(timeout)
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
      disposed = true
      inFlight?.abort()
      clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [])

  // Register keyboard shortcuts. Re-registering the same combo replaces the
  // previous entry (see use-keyboard-shortcuts), so re-running this effect on
  // selectedGenre changes keeps the "Clear filters" closure fresh instead of
  // accumulating stale duplicates.
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
      action: () => setShortcutsOpen(true),
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
    const featured = liveRooms.find((r) => r.isFeatured)
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

      {/* Keyboard shortcuts help (Shift+?) */}
      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent
          className="border-border/30 sm:max-w-sm"
          style={{
            background: "oklch(0.14 0.01 280 / 0.95)",
            backdropFilter: "blur(10px)",
          }}
        >
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
            <DialogDescription>
              Available while browsing rooms on this page.
            </DialogDescription>
          </DialogHeader>
          <dl className="flex flex-col gap-3">
            {shortcuts.map((shortcut) => {
              const keys = formatShortcutKeys(shortcut)
              return (
                <div
                  key={keys.join("+")}
                  className="flex items-center justify-between gap-4"
                >
                  <dt className="flex items-center gap-1">
                    {keys.map((key) => (
                      <kbd
                        key={key}
                        className="rounded border border-border/40 bg-muted/30 px-1.5 py-0.5 font-mono text-xs text-foreground"
                      >
                        {key}
                      </kbd>
                    ))}
                  </dt>
                  <dd className="font-sans text-sm text-muted-foreground">
                    {shortcut.description}
                  </dd>
                </div>
              )
            })}
          </dl>
        </DialogContent>
      </Dialog>

      <div className="relative z-10">
        <Navbar />

        <main
          className="shell"
          style={{ paddingBottom: "var(--space-3xl)" }}
        >
          {/* Connection status banner */}
          {offline && (
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
              Backend offline — live rooms can&apos;t be loaded right now.
              Retrying automatically.
            </div>
          )}

          {/* Hero */}
          <HomeHero
            liveCount={loaded ? liveCount : null}
            selectedGenre={selectedGenre}
            onSelectGenre={setSelectedGenre}
          />

          {/* Skeletons — only reachable when the server-side fetch failed
              and the client is still refetching */}
          {!loaded && (
            <>
              <div style={{ marginBottom: "var(--space-2xl)" }}>
                <FeaturedRoomCardSkeleton />
              </div>
              <div style={{ marginBottom: "var(--space-2xl)" }}>
                <LiveRoomGridSkeleton />
              </div>
            </>
          )}

          {/* Featured room card — hidden while loading or filtering by genre */}
          {loaded && !selectedGenre && featuredRoom && (
            <div style={{ marginBottom: "var(--space-2xl)" }}>
              <FeaturedRoomCard room={featuredRoom} />
            </div>
          )}

          {/* Live now grid */}
          {loaded && (
            <div style={{ marginBottom: "var(--space-2xl)" }}>
              <LiveRoomGrid
                rooms={filteredLiveRooms}
                headerLabel={selectedGenre ? `${selectedGenre} rooms live` : "Live now"}
                emptyLabel={
                  selectedGenre
                    ? `No ${selectedGenre} rooms streaming right now`
                    : "No rooms live right now"
                }
              />
            </div>
          )}

          {/* Activity feed — hidden while filtering */}
          {loaded && !selectedGenre && (
            <div style={{ marginBottom: "var(--space-xl)" }}>
              <ActivityFeed rooms={allRooms} />
            </div>
          )}

          {/* No rooms at all */}
          {loaded && !offline && allRooms.length === 0 && (
            <div style={{ marginTop: "var(--space-lg)" }}>
              <EmptyState
                variant="no-rooms"
                title="No rooms live"
                description="All DJs are taking a break. Check back soon or start your own session!"
              />
            </div>
          )}

          {seoSlot}
        </main>

        <Footer />
      </div>
    </div>
  )
}
