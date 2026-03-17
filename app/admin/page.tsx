"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Shield, Radio, Power, Star, StarOff, Crown, Plus,
  Users, Clock, AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/layout/navbar"
import { BubbleBackground } from "@/components/effects/bubble-background"
import { useAuth } from "@/lib/auth-context"

import { authRequest } from "@/lib/api"

interface AdminRoom {
  id: string
  slug: string
  name: string
  genre: string
  isLive: boolean
  isOfficial: boolean
  isFeatured: boolean
  listenerCount: number
  djName: string
  createdAt: string
  endedAt?: string
  expiresAt?: string
  scheduledStart?: string
}

export default function AdminPage() {
  const { user, isLoggedIn } = useAuth()
  const router = useRouter()
  const [rooms, setRooms] = useState<AdminRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Check admin access
  const isAdmin = isLoggedIn && user?.isAdmin

  const fetchRooms = useCallback(async () => {
    try {
      const data = await authRequest("/api/admin/rooms")
      setRooms(data)
      setError(null)
    } catch (err: any) {
      setError(err.message?.includes("403") ? "Admin access required" : "Failed to load rooms")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAdmin) fetchRooms()
    else setLoading(false)
  }, [isAdmin, fetchRooms])

  const shutdownRoom = useCallback(async (id: string) => {
    if (!confirm("Shut down this room? All listeners will be disconnected.")) return
    setActionLoading(id)
    try {
      await authRequest(`/api/admin/rooms/${id}/shutdown`, { method: "POST" })
      await fetchRooms()
    } catch { /* ignore */ }
    setActionLoading(null)
  }, [fetchRooms])

  const toggleFeatured = useCallback(async (id: string, current: boolean) => {
    setActionLoading(id)
    try {
      await authRequest(`/api/admin/rooms/${id}/feature`, {
        method: "POST",
        body: JSON.stringify({ featured: !current }),
      })
      await fetchRooms()
    } catch { /* ignore */ }
    setActionLoading(null)
  }, [fetchRooms])

  const toggleOfficial = useCallback(async (id: string, current: boolean) => {
    setActionLoading(id)
    try {
      await authRequest(`/api/admin/rooms/${id}/official`, {
        method: "POST",
        body: JSON.stringify({ official: !current }),
      })
      await fetchRooms()
    } catch { /* ignore */ }
    setActionLoading(null)
  }, [fetchRooms])

  // Not admin
  if (!loading && !isAdmin) {
    return (
      <div className="relative min-h-screen">
        <BubbleBackground />
        <div className="relative z-10">
          <Navbar />
          <div className="flex flex-col items-center justify-center gap-4 py-40">
            <Shield className="h-12 w-12 text-muted-foreground/30" />
            <p className="font-sans text-lg text-foreground">Access Denied</p>
            <p className="font-sans text-sm text-muted-foreground">
              Admin privileges are required to access this page.
            </p>
            <Link href="/" className="mt-2 rounded-full bg-primary px-6 py-2 font-sans text-sm text-primary-foreground hover:bg-primary/90 transition-colors">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const liveRooms = rooms.filter((r) => r.isLive)
  const endedRooms = rooms.filter((r) => !r.isLive && r.endedAt)
  const scheduledRooms = rooms.filter((r) => !r.isLive && !r.endedAt && r.scheduledStart)

  return (
    <div className="relative min-h-screen">
      <BubbleBackground />
      <div className="relative z-10">
        <Navbar />

        <main className="mx-auto max-w-5xl px-4 py-8 lg:px-6">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{
                  background: "oklch(0.55 0.20 270 / 0.15)",
                  border: "1px solid oklch(0.55 0.20 270 / 0.3)",
                }}
              >
                <Shield className="h-5 w-5" style={{ color: "oklch(0.65 0.22 270)" }} />
              </div>
              <div>
                <h1 className="font-sans text-xl font-bold text-foreground">Admin Dashboard</h1>
                <p className="font-sans text-xs text-muted-foreground">
                  Manage rooms, set featured, create official rooms
                </p>
              </div>
            </div>
            <Link href="/admin/create">
              <Button
                size="sm"
                className="gap-2 rounded-xl font-sans"
                style={{
                  background: "oklch(0.55 0.20 270 / 0.2)",
                  border: "1px solid oklch(0.55 0.20 270 / 0.4)",
                  color: "oklch(0.75 0.18 270)",
                }}
              >
                <Plus className="h-4 w-4" />
                Official Room
              </Button>
            </Link>
          </div>

          {error && (
            <div
              className="mb-6 flex items-center gap-2 rounded-xl px-4 py-3 font-sans text-sm"
              style={{
                background: "oklch(0.20 0.06 25 / 0.5)",
                border: "1px solid oklch(0.50 0.18 25 / 0.4)",
                color: "oklch(0.75 0.15 25)",
              }}
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <p className="font-sans text-muted-foreground animate-pulse">Loading rooms...</p>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="mb-8 grid grid-cols-3 gap-4">
                {[
                  { label: "Live Rooms", value: liveRooms.length, color: "oklch(0.50 0.24 30)" },
                  { label: "Total Listeners", value: liveRooms.reduce((a, r) => a + r.listenerCount, 0), color: "oklch(0.82 0.18 80)" },
                  { label: "Total Rooms", value: rooms.length, color: "oklch(0.55 0.20 270)" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl p-4"
                    style={{
                      background: "oklch(0.13 0.01 280)",
                      border: "1px solid oklch(0.28 0.02 280 / 0.4)",
                    }}
                  >
                    <p className="font-mono text-2xl font-bold" style={{ color: stat.color }}>
                      {stat.value}
                    </p>
                    <p className="font-sans text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Live Rooms */}
              <Section title="Live Rooms" count={liveRooms.length} color="oklch(0.50 0.24 30)">
                {liveRooms.length === 0 ? (
                  <EmptyState text="No rooms are live right now" />
                ) : (
                  liveRooms.map((room) => (
                    <RoomRow
                      key={room.id}
                      room={room}
                      loading={actionLoading === room.id}
                      onShutdown={() => shutdownRoom(room.id)}
                      onToggleFeatured={() => toggleFeatured(room.id, room.isFeatured)}
                      onToggleOfficial={() => toggleOfficial(room.id, room.isOfficial)}
                    />
                  ))
                )}
              </Section>

              {/* Scheduled */}
              {scheduledRooms.length > 0 && (
                <Section title="Scheduled" count={scheduledRooms.length} color="oklch(0.72 0.18 250)">
                  {scheduledRooms.map((room) => (
                    <RoomRow
                      key={room.id}
                      room={room}
                      loading={actionLoading === room.id}
                      onShutdown={() => shutdownRoom(room.id)}
                      onToggleFeatured={() => toggleFeatured(room.id, room.isFeatured)}
                      onToggleOfficial={() => toggleOfficial(room.id, room.isOfficial)}
                    />
                  ))}
                </Section>
              )}

              {/* Recently Ended */}
              {endedRooms.length > 0 && (
                <Section title="Recently Ended" count={endedRooms.length} color="oklch(0.50 0.02 280)">
                  {endedRooms.slice(0, 10).map((room) => (
                    <RoomRow
                      key={room.id}
                      room={room}
                      loading={actionLoading === room.id}
                      onShutdown={() => shutdownRoom(room.id)}
                      onToggleFeatured={() => toggleFeatured(room.id, room.isFeatured)}
                      onToggleOfficial={() => toggleOfficial(room.id, room.isOfficial)}
                    />
                  ))}
                </Section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

function Section({ title, count, color, children }: { title: string; count: number; color: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-sans text-sm font-semibold" style={{ color }}>{title}</h2>
        <Badge variant="outline" className="text-[10px]" style={{ borderColor: `${color}40`, color }}>{count}</Badge>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div
      className="flex items-center justify-center rounded-xl py-8"
      style={{ background: "oklch(0.12 0.01 280)", border: "1px solid oklch(0.22 0.02 280 / 0.3)" }}
    >
      <p className="font-sans text-xs text-muted-foreground">{text}</p>
    </div>
  )
}

function RoomRow({
  room,
  loading,
  onShutdown,
  onToggleFeatured,
  onToggleOfficial,
}: {
  room: AdminRoom
  loading: boolean
  onShutdown: () => void
  onToggleFeatured: () => void
  onToggleOfficial: () => void
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-muted/10"
      style={{
        background: "oklch(0.13 0.01 280)",
        border: "1px solid oklch(0.25 0.02 280 / 0.3)",
        opacity: loading ? 0.5 : 1,
      }}
    >
      {/* Status dot */}
      <div
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{
          background: room.isLive ? "oklch(0.50 0.24 30)" : "oklch(0.35 0.02 280)",
          boxShadow: room.isLive ? "0 0 6px oklch(0.50 0.24 30 / 0.5)" : "none",
        }}
      />

      {/* Room info */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          <Link href={`/room/${room.slug}`} className="truncate font-sans text-sm font-medium text-foreground hover:text-primary transition-colors">
            {room.name}
          </Link>
          {room.isOfficial && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0" style={{ borderColor: "oklch(0.55 0.20 270 / 0.4)", color: "oklch(0.65 0.18 270)" }}>
              Official
            </Badge>
          )}
          {room.isFeatured && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0" style={{ borderColor: "oklch(0.82 0.18 80 / 0.4)", color: "oklch(0.82 0.18 80)" }}>
              Featured
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 font-sans text-[11px] text-muted-foreground">
          <span>{room.genre}</span>
          <span>by {room.djName || "Unknown"}</span>
          {room.isLive && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {room.listenerCount}
            </span>
          )}
          {room.endedAt && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Ended {new Date(room.endedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        {/* Toggle Featured */}
        <button
          onClick={onToggleFeatured}
          disabled={loading}
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-muted/30"
          title={room.isFeatured ? "Remove from featured" : "Set as featured"}
        >
          {room.isFeatured ? (
            <Star className="h-3.5 w-3.5" style={{ color: "oklch(0.82 0.18 80)", fill: "oklch(0.82 0.18 80)" }} />
          ) : (
            <StarOff className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>

        {/* Toggle Official */}
        <button
          onClick={onToggleOfficial}
          disabled={loading}
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-muted/30"
          title={room.isOfficial ? "Remove official status" : "Mark as official"}
        >
          <Crown className="h-3.5 w-3.5" style={{ color: room.isOfficial ? "oklch(0.65 0.18 270)" : undefined }} />
        </button>

        {/* Shutdown */}
        {room.isLive && (
          <button
            onClick={onShutdown}
            disabled={loading}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-destructive/20"
            title="Shut down room"
          >
            <Power className="h-3.5 w-3.5" style={{ color: "oklch(0.65 0.18 25)" }} />
          </button>
        )}
      </div>
    </div>
  )
}
