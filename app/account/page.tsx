"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"

import { ProfileView } from "@/components/account/profile-view"
import { FavoritesSection } from "@/components/account/favorites-section"
import { PlaylistsSection } from "@/components/account/playlists-section"
import { SettingsForm } from "@/components/account/settings-form"
import { currentUser } from "@/lib/mock-data"
import { useAuth } from "@/lib/auth-context"

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

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace("/login")
    }
  }, [loading, isLoggedIn, router])

  if (!isLoggedIn || !authUser) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#0d0b10", color: "rgba(232,230,234,0.6)" }}>
        <p className="text-sm">Redirecting to login...</p>
      </div>
    )
  }

  // Build display user with real data (authUser is guaranteed non-null here)
  const displayUser = {
    ...currentUser,
    displayName: authUser.stageName || authUser.displayName,
    avatarColor: authUser.avatarColor || currentUser.avatarColor,
    joinDate: new Date(authUser.createdAt),
    username: authUser.email?.split("@")[0] || currentUser.username,
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
