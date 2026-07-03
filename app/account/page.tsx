"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"

import { ProfileView } from "@/components/account/profile-view"
import { FavoritesSection } from "@/components/account/favorites-section"
import { PlaylistsSection } from "@/components/account/playlists-section"
import { SettingsForm } from "@/components/account/settings-form"
import { useAuth } from "@/lib/auth-context"
import { withNextParam } from "@/components/auth/next-param"

import { authRequest } from "@/lib/api"

interface UserStats {
  totalListenMinutes: number
  roomsVisited: number
  tracksListened: number
}

interface APIFavoriteRoom {
  roomId: string
  roomName: string
  roomSlug: string
  roomGenre: string
  coverArtUrl: string
  listenMinutes: number
  visitCount: number
}

export default function AccountPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { user: authUser, isLoggedIn, loading } = useAuth()
  const [stats, setStats] = useState<UserStats>({ totalListenMinutes: 0, roomsVisited: 0, tracksListened: 0 })
  const [favoriteRooms, setFavoriteRooms] = useState<APIFavoriteRoom[]>([])

  // Fetch stats and favorites from API
  useEffect(() => {
    if (!isLoggedIn) return

    authRequest<UserStats>("/api/auth/me/stats")
      .then((data) => setStats(data))
      .catch(() => {})

    authRequest<APIFavoriteRoom[]>("/api/auth/me/favorites")
      .then((data) => setFavoriteRooms(data))
      .catch(() => {})
  }, [isLoggedIn])

  // Redirect to login if not authenticated, remembering where we came from
  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace(withNextParam("/login", pathname))
    }
  }, [loading, isLoggedIn, router, pathname])

  // While auth resolves (and during the brief logged-out redirect) show a
  // neutral skeleton of the page chrome instead of flashing a redirect
  // message at logged-in users on every hard load.
  if (!isLoggedIn || !authUser) {
    return (
      <div className="relative min-h-screen">
        <Navbar />

        <main className="relative z-10 mx-auto max-w-4xl px-4 py-8 lg:px-6" aria-busy="true">
          <div className="mb-6 animate-pulse">
            <div className="h-9 w-48 rounded-lg bg-muted/40" />
            <div className="mt-3 h-4 w-80 max-w-full rounded bg-muted/30" />
          </div>

          <div className="animate-pulse">
            <div className="h-10 w-full rounded-xl border border-border/30 bg-muted/20" />
            <div className="mt-6 h-96 w-full rounded-2xl border border-border/30 bg-muted/20" />
          </div>
        </main>

        <Footer />
      </div>
    )
  }

  // Build display user with real data (authUser is guaranteed non-null here)
  const displayUser = {
    id: authUser.id,
    username: authUser.email?.split("@")[0] || "listener",
    displayName: authUser.stageName || authUser.displayName,
    email: authUser.email,
    avatarColor: authUser.avatarColor || "oklch(0.68 0.22 80)",
    accountType: "free" as const,
    joinDate: new Date(authUser.createdAt),
    stageName: authUser.stageName || "",
    location: {
      city: authUser.city || "",
      state: authUser.region || "",
      country: authUser.country || "",
    },
    stats: {
      totalListenTime: stats.totalListenMinutes,
      roomsVisited: stats.roomsVisited,
      tracksListened: stats.tracksListened,
    },
  }

  return (
    <div className="relative min-h-screen">
      <Navbar />

      <main className="relative z-10 mx-auto max-w-4xl px-4 py-8 lg:px-6">
        <div className="mb-6">
          <h1 className="font-sans text-3xl font-bold text-foreground neon-text-amber">
            My Account
          </h1>
          <p className="mt-2 font-sans text-sm text-muted-foreground leading-relaxed">
            Manage your profile, view your favorites, and update settings
          </p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList
            className="grid w-full grid-cols-4 rounded-xl border border-border/30 p-1"
            style={{
              background: "oklch(0.13 0.01 280 / 0.6)",
              backdropFilter: "blur(12px)",
            }}
          >
            <TabsTrigger
              value="profile"
              className="rounded-lg font-sans text-sm data-[state=active]:bg-accent/20 data-[state=active]:text-accent"
            >
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="playlists"
              className="rounded-lg font-sans text-sm data-[state=active]:bg-accent/20 data-[state=active]:text-accent"
            >
              Playlists
            </TabsTrigger>
            <TabsTrigger
              value="favorites"
              className="rounded-lg font-sans text-sm data-[state=active]:bg-accent/20 data-[state=active]:text-accent"
            >
              Favorites
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="rounded-lg font-sans text-sm data-[state=active]:bg-accent/20 data-[state=active]:text-accent"
            >
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <div
              className="rounded-2xl border border-border/30 p-6"
              style={{
                background: "oklch(0.12 0.01 280 / 0.6)",
                backdropFilter: "blur(12px)",
              }}
            >
              <ProfileView user={displayUser} />
            </div>
          </TabsContent>

          <TabsContent value="playlists" className="mt-6">
            <div
              className="rounded-2xl border border-border/30 p-6"
              style={{
                background: "oklch(0.12 0.01 280 / 0.6)",
                backdropFilter: "blur(12px)",
              }}
            >
              <PlaylistsSection />
            </div>
          </TabsContent>

          <TabsContent value="favorites" className="mt-6">
            <div
              className="rounded-2xl border border-border/30 p-6"
              style={{
                background: "oklch(0.12 0.01 280 / 0.6)",
                backdropFilter: "blur(12px)",
              }}
            >
              <FavoritesSection favoriteRooms={favoriteRooms} />
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <div
              className="rounded-2xl border border-border/30 p-6"
              style={{
                background: "oklch(0.12 0.01 280 / 0.6)",
                backdropFilter: "blur(12px)",
              }}
            >
              <SettingsForm user={displayUser} />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  )
}
