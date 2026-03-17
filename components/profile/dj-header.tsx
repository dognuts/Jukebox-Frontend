"use client"

import Link from "next/link"
import { Play, Users, Radio, Clock, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { type DJ } from "@/lib/mock-data"

interface DJHeaderProps {
  dj: DJ
}

function formatStat(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toString()
}

export function DJHeader({ dj }: DJHeaderProps) {
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-8">
      {/* Avatar with neon ring */}
      <div className="relative shrink-0">
        <div
          className="h-28 w-28 rounded-full sm:h-36 sm:w-36"
          style={{
            background: dj.avatarColor,
            boxShadow: `0 0 30px ${dj.avatarColor}80, 0 0 60px ${dj.avatarColor}30`,
          }}
        />
        {/* Neon ring */}
        <div
          className="absolute -inset-1.5 rounded-full animate-glow-pulse"
          style={{
            border: "2px solid oklch(0.82 0.18 80 / 0.4)",
            borderRadius: "50%",
          }}
        />
        {/* Live indicator */}
        {dj.currentRoom && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-0.5 border border-secondary/30">
            <span className="h-2 w-2 rounded-full bg-secondary animate-live-pulse" />
            <span className="font-sans text-[10px] font-bold text-secondary">
              LIVE
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col items-center gap-4 sm:items-start">
        <div className="text-center sm:text-left">
          <h1 className="font-sans text-2xl font-bold text-foreground sm:text-3xl">
            {dj.displayName}
          </h1>
          <p className="mt-0.5 font-sans text-sm text-muted-foreground">
            @{dj.username}
          </p>
        </div>

        <p className="max-w-lg text-center font-sans text-sm text-foreground/70 leading-relaxed sm:text-left text-pretty">
          {dj.bio}
        </p>

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-sm font-semibold text-foreground">
              {formatStat(dj.totalListeners)}
            </span>
            <span className="font-sans text-xs text-muted-foreground">
              total listeners
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Radio className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-sm font-semibold text-foreground">
              {dj.roomsHosted}
            </span>
            <span className="font-sans text-xs text-muted-foreground">
              rooms
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-sm font-semibold text-foreground">
              {formatStat(dj.hoursStreamed)}h
            </span>
            <span className="font-sans text-xs text-muted-foreground">
              streamed
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            className="gap-2 rounded-full bg-primary font-sans text-primary-foreground hover:bg-primary/90"
          >
            <UserPlus className="h-4 w-4" />
            Follow ({formatStat(dj.followerCount)})
          </Button>
          {dj.currentRoom && (
            <Link href={`/room/${dj.currentRoom}`}>
              <Button
                variant="outline"
                className="gap-2 rounded-full border-secondary/40 text-secondary hover:bg-secondary/10"
              >
                <Play className="h-4 w-4" />
                Tune In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
