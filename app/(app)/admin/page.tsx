"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Shield, Radio, Power, Star, StarOff, Crown, Plus,
  Users, Clock, AlertTriangle, BarChart3, Trash2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/layout/navbar"
import { EmptyState } from "@/components/ui/empty-state"

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

// Shared surface treatment — quiet hairline cards on the ink ground,
// matching the homepage/room redesign language.
const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.02)",
  border: "0.5px solid var(--hairline)",
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
      const data = await authRequest<AdminRoom[] | null>("/api/admin/rooms")
      setRooms(data ?? [])
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

  const deleteRoom = useCallback(async (id: string) => {
    if (!confirm("Permanently delete this room? This cannot be undone.")) return
    setActionLoading(id)
    try {
      await authRequest(`/api/admin/rooms/${id}`, { method: "DELETE" })
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
        <div className="relative z-10">
          <Navbar />
          <div className="flex flex-col items-center justify-center gap-4 py-40">
            <Shield className="h-12 w-12" style={{ color: "rgba(232,230,234,0.25)" }} />
            <p className="type-h2" style={{ color: "var(--ink-foreground)" }}>Access Denied</p>
            <p style={{ color: "var(--text-low)", fontSize: "var(--fs-small)" }}>
              Admin privileges are required to access this page.
            </p>
            <Link
              href="/"
              className="mt-2 rounded-full px-6 py-2 text-sm font-medium transition-opacity hover:opacity-90"
              style={{ background: "var(--ink-foreground)", color: "var(--ink)" }}
            >
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
  const waitingRooms = rooms.filter((r) => !r.isLive && !r.endedAt && !r.scheduledStart)

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10">
        <Navbar />

        <main className="mx-auto max-w-5xl px-4 py-8 lg:px-6">
          {/* Header */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={cardStyle}
              >
                <Shield className="h-5 w-5" style={{ color: "var(--brand-amber)" }} />
              </div>
              <div>
                <h1 className="type-display" style={{ color: "var(--ink-foreground)" }}>Admin</h1>
                <p style={{ color: "var(--text-low)", fontSize: "var(--fs-small)" }}>
                  Manage rooms, set featured, create official rooms
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/admin/create"
                className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-opacity hover:opacity-90"
                style={{ background: "var(--ink-foreground)", color: "var(--ink)" }}
              >
                <Plus className="h-3.5 w-3.5" />
                Official Room
              </Link>
              <AdminNavLink href="/admin/users" icon={<Users className="h-3.5 w-3.5" />} label="Users" />
              <AdminNavLink href="/admin/autoplay" icon={<Radio className="h-3.5 w-3.5" />} label="Autoplay" />
              <AdminNavLink href="/admin/metrics" icon={<BarChart3 className="h-3.5 w-3.5" />} label="Metrics" />
            </div>
          </div>

          {error && (
            <div
              className="mb-6 flex items-center gap-2 rounded-[14px] px-4 py-3 text-sm"
              style={{
                background: "rgba(232,154,60,0.1)",
                border: "0.5px solid rgba(232,154,60,0.25)",
                color: "var(--brand-amber)",
              }}
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <p className="animate-pulse" style={{ color: "var(--text-low)" }}>Loading rooms...</p>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="mb-8 grid grid-cols-3 gap-4">
                {[
                  { label: "Live Rooms", value: liveRooms.length },
                  { label: "Total Listeners", value: liveRooms.reduce((a, r) => a + r.listenerCount, 0) },
                  { label: "Total Rooms", value: rooms.length },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-[14px] p-4" style={cardStyle}>
                    <p className="font-mono text-2xl font-bold" style={{ color: "var(--ink-foreground)" }}>
                      {stat.value}
                    </p>
                    <p className="type-meta" style={{ color: "var(--text-low)" }}>{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Live Rooms */}
              <Section title="Live Rooms" count={liveRooms.length}>
                {liveRooms.length === 0 ? (
                  <EmptyState compact title="No rooms are live right now" />
                ) : (
                  liveRooms.map((room) => (
                    <RoomRow
                      key={room.id}
                      room={room}
                      loading={actionLoading === room.id}
                      onShutdown={() => shutdownRoom(room.id)}
                      onDelete={() => deleteRoom(room.id)}
                      onToggleFeatured={() => toggleFeatured(room.id, room.isFeatured)}
                      onToggleOfficial={() => toggleOfficial(room.id, room.isOfficial)}
                    />
                  ))
                )}
              </Section>

              {/* Scheduled */}
              {scheduledRooms.length > 0 && (
                <Section title="Scheduled" count={scheduledRooms.length}>
                  {scheduledRooms.map((room) => (
                    <RoomRow
                      key={room.id}
                      room={room}
                      loading={actionLoading === room.id}
                      onShutdown={() => shutdownRoom(room.id)}
                      onDelete={() => deleteRoom(room.id)}
                      onToggleFeatured={() => toggleFeatured(room.id, room.isFeatured)}
                      onToggleOfficial={() => toggleOfficial(room.id, room.isOfficial)}
                    />
                  ))}
                </Section>
              )}

              {/* Recently Ended */}
              {endedRooms.length > 0 && (
                <Section title="Recently Ended" count={endedRooms.length}>
                  {endedRooms.slice(0, 10).map((room) => (
                    <RoomRow
                      key={room.id}
                      room={room}
                      loading={actionLoading === room.id}
                      onShutdown={() => shutdownRoom(room.id)}
                      onDelete={() => deleteRoom(room.id)}
                      onToggleFeatured={() => toggleFeatured(room.id, room.isFeatured)}
                      onToggleOfficial={() => toggleOfficial(room.id, room.isOfficial)}
                    />
                  ))}
                </Section>
              )}

              {/* Waiting (created but never went live) */}
              {waitingRooms.length > 0 && (
                <Section title="Waiting (Never Went Live)" count={waitingRooms.length}>
                  {waitingRooms.map((room) => (
                    <RoomRow
                      key={room.id}
                      room={room}
                      loading={actionLoading === room.id}
                      onShutdown={() => shutdownRoom(room.id)}
                      onDelete={() => deleteRoom(room.id)}
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

// Quiet hairline pill used for the secondary admin nav links.
function AdminNavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-colors hover:bg-white/[0.06]"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "0.5px solid var(--hairline-strong)",
        color: "var(--text-mid)",
      }}
    >
      {icon}
      {label}
    </Link>
  )
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="type-h2" style={{ color: "var(--ink-foreground)" }}>{title}</h2>
        <Badge
          variant="outline"
          className="text-[10px]"
          style={{ borderColor: "var(--hairline-strong)", color: "var(--text-low)" }}
        >
          {count}
        </Badge>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}

function RoomRow({
  room,
  loading,
  onShutdown,
  onDelete,
  onToggleFeatured,
  onToggleOfficial,
}: {
  room: AdminRoom
  loading: boolean
  onShutdown: () => void
  onDelete: () => void
  onToggleFeatured: () => void
  onToggleOfficial: () => void
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-[14px] p-3 transition-colors hover:bg-white/[0.04]"
      style={{ ...cardStyle, opacity: loading ? 0.5 : 1 }}
    >
      {/* Status dot — amber means live, matching the redesign's live markers */}
      <div
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{
          background: room.isLive ? "var(--brand-amber)" : "rgba(232,230,234,0.15)",
          boxShadow: room.isLive ? "0 0 8px rgba(232,154,60,0.8)" : "none",
        }}
      />

      {/* Room info */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          <Link
            href={`/room/${room.slug}`}
            className="truncate text-sm font-medium transition-opacity hover:opacity-80"
            style={{ color: "var(--ink-foreground)" }}
          >
            {room.name}
          </Link>
          {room.isOfficial && (
            <Badge
              variant="outline"
              className="text-[9px] px-1.5 py-0"
              style={{ borderColor: "var(--hairline-strong)", color: "var(--text-mid)" }}
            >
              Official
            </Badge>
          )}
          {room.isFeatured && (
            <Badge
              variant="outline"
              className="text-[9px] px-1.5 py-0"
              style={{ borderColor: "rgba(232,154,60,0.4)", color: "var(--brand-amber)" }}
            >
              Featured
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--text-low)" }}>
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
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/[0.06]"
          title={room.isFeatured ? "Remove from featured" : "Set as featured"}
        >
          {room.isFeatured ? (
            <Star className="h-3.5 w-3.5" style={{ color: "var(--brand-amber)", fill: "var(--brand-amber)" }} />
          ) : (
            <StarOff className="h-3.5 w-3.5" style={{ color: "var(--text-low)" }} />
          )}
        </button>

        {/* Toggle Official */}
        <button
          onClick={onToggleOfficial}
          disabled={loading}
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/[0.06]"
          title={room.isOfficial ? "Remove official status" : "Mark as official"}
        >
          <Crown
            className="h-3.5 w-3.5"
            style={{ color: room.isOfficial ? "var(--ink-foreground)" : "var(--text-low)" }}
          />
        </button>

        {/* Shutdown */}
        {room.isLive && (
          <button
            onClick={onShutdown}
            disabled={loading}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-destructive/20"
            title="Shut down room"
          >
            <Power className="h-3.5 w-3.5" style={{ color: "var(--text-error)" }} />
          </button>
        )}

        {/* Delete */}
        {!room.isLive && (
          <button
            onClick={onDelete}
            disabled={loading}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-destructive/20"
            title="Delete room permanently"
          >
            <Trash2 className="h-3.5 w-3.5" style={{ color: "var(--text-error)" }} />
          </button>
        )}
      </div>
    </div>
  )
}
