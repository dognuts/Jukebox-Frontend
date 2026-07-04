"use client"

import { Calendar, MapPin, Clock, Radio as RadioIcon, Music } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { SmartImage } from "@/components/smart-image"
import { type User } from "./types"

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
          className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-[0.5px] border-hairline-strong font-sans text-3xl font-bold text-ink shadow-lg"
          style={{ background: user.avatarColor }}
        >
          {user.avatarUrl ? (
            <SmartImage
              src={user.avatarUrl}
              alt={user.displayName}
              fill
              sizes="96px"
              className="rounded-full object-cover"
            />
          ) : (
            user.displayName.slice(0, 2).toUpperCase()
          )}
        </div>

        {/* Info */}
        <div className="flex-1 text-center sm:text-left">
          <h2 className="type-display font-sans text-ink-foreground">
            {user.displayName}
          </h2>
          <p className="mt-1 type-small font-sans text-text-mid">
            @{user.username}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <Badge
              variant={user.accountType === "premium" ? "default" : "outline"}
              className={
                user.accountType === "premium"
                  ? "border-0 bg-brand-purple font-sans text-xs font-semibold text-white"
                  : "border-[0.5px] border-hairline-strong bg-white/[0.04] font-sans text-xs font-semibold text-text-mid"
              }
            >
              {user.accountType === "premium" ? "Plus" : "Free"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid gap-4 rounded-xl border-[0.5px] border-hairline bg-white/[0.02] p-4">
        <div className="flex items-center gap-3 text-sm">
          <MapPin className="h-4 w-4 text-text-low" />
          <span className="font-sans text-text-hi">
            {[user.location.city, user.location.state, user.location.country]
              .filter(Boolean)
              .join(", ") || "Location not detected"}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Calendar className="h-4 w-4 text-text-low" />
          <span className="font-sans text-text-mid">
            Joined {joinDateFormatted}
          </span>
        </div>
      </div>

      {/* Stats cards */}
      <div>
        <h3 className="mb-3 type-meta font-sans font-semibold text-text-low">
          Listening Stats
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {/* Total listen time */}
          <div className="rounded-xl border-[0.5px] border-hairline bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-text-low">
              <Clock className="h-4 w-4" />
              <span className="type-meta font-sans">
                Total Time
              </span>
            </div>
            <div className="mt-2 font-sans text-2xl font-bold text-ink-foreground">
              {totalHours}h {totalMinutes}m
            </div>
          </div>

          {/* Rooms visited */}
          <div className="rounded-xl border-[0.5px] border-hairline bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-text-low">
              <RadioIcon className="h-4 w-4" />
              <span className="type-meta font-sans">
                Rooms Visited
              </span>
            </div>
            <div className="mt-2 font-sans text-2xl font-bold text-ink-foreground">
              {user.stats.roomsVisited}
            </div>
          </div>

          {/* Tracks listened */}
          <div className="rounded-xl border-[0.5px] border-hairline bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-text-low">
              <Music className="h-4 w-4" />
              <span className="type-meta font-sans">
                Tracks Played
              </span>
            </div>
            <div className="mt-2 font-sans text-2xl font-bold text-ink-foreground">
              {user.stats.tracksListened}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
