"use client"

import { Calendar, MapPin, Clock, Radio as RadioIcon, Music } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { type User } from "@/lib/mock-data"

interface ProfileViewProps {
  user: User
}

export function ProfileView({ user }: ProfileViewProps) {
  const joinDateFormatted = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(user.joinDate)

  const totalHours = Math.floor(user.stats.totalListenTime / 60)
  const totalMinutes = user.stats.totalListenTime % 60

  return (
    <div className="space-y-6">
      {/* Avatar and basic info */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        {/* Avatar */}
        <div
          className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-2 border-border/30 font-sans text-3xl font-bold text-background shadow-lg"
          style={{ background: user.avatarColor }}
        >
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.displayName}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            user.displayName.slice(0, 2).toUpperCase()
          )}
        </div>

        {/* Info */}
        <div className="flex-1 text-center sm:text-left">
          <h2 className="font-sans text-2xl font-bold text-foreground">
            {user.displayName}
          </h2>
          <p className="mt-1 font-sans text-sm text-muted-foreground">
            @{user.username}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <Badge
              variant={user.accountType === "premium" ? "default" : "outline"}
              className={
                user.accountType === "premium"
                  ? "border-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 font-sans text-xs font-semibold text-amber-400 shadow-sm shadow-amber-500/20"
                  : "border-blue-500/30 font-sans text-xs font-semibold text-blue-400"
              }
            >
              {user.accountType === "premium" ? "Premium" : "Free"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div
        className="grid gap-4 rounded-xl border border-border/30 p-4"
        style={{
          background: "oklch(0.13 0.01 280 / 0.5)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="flex items-center gap-3 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="font-sans text-foreground">
            {[user.location.city, user.location.state, user.location.country]
              .filter(Boolean)
              .join(", ") || "Location not detected"}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-sans text-muted-foreground">
            Joined {joinDateFormatted}
          </span>
        </div>
      </div>

      {/* Stats cards */}
      <div>
        <h3 className="mb-3 font-sans text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Listening Stats
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {/* Total listen time */}
          <div
            className="rounded-xl border border-border/30 p-4"
            style={{
              background: "oklch(0.13 0.01 280 / 0.5)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="font-sans text-xs uppercase tracking-wide">
                Total Time
              </span>
            </div>
            <div className="mt-2 font-sans text-2xl font-bold text-foreground">
              {totalHours}h {totalMinutes}m
            </div>
          </div>

          {/* Rooms visited */}
          <div
            className="rounded-xl border border-border/30 p-4"
            style={{
              background: "oklch(0.13 0.01 280 / 0.5)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <RadioIcon className="h-4 w-4" />
              <span className="font-sans text-xs uppercase tracking-wide">
                Rooms Visited
              </span>
            </div>
            <div className="mt-2 font-sans text-2xl font-bold text-foreground">
              {user.stats.roomsVisited}
            </div>
          </div>

          {/* Tracks listened */}
          <div
            className="rounded-xl border border-border/30 p-4"
            style={{
              background: "oklch(0.13 0.01 280 / 0.5)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <Music className="h-4 w-4" />
              <span className="font-sans text-xs uppercase tracking-wide">
                Tracks Played
              </span>
            </div>
            <div className="mt-2 font-sans text-2xl font-bold text-foreground">
              {user.stats.tracksListened}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
