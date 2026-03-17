"use client"

import Link from "next/link"
import { Radio as RadioIcon, Clock, Music } from "lucide-react"

interface APIFavoriteRoom {
  roomId: string
  roomName: string
  roomSlug: string
  roomGenre: string
  coverArtUrl: string
  listenMinutes: number
  visitCount: number
}

interface FavoritesSectionProps {
  favoriteRooms: APIFavoriteRoom[]
}

export function FavoritesSection({ favoriteRooms }: FavoritesSectionProps) {
  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
  }

  return (
    <div className="space-y-6">
      <h3 className="flex items-center gap-2 font-sans text-lg font-semibold text-foreground">
        <RadioIcon className="h-5 w-5 text-accent" />
        Most Listened Jukeboxes
      </h3>

      {favoriteRooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12">
          <Music className="h-10 w-10 text-muted-foreground/30" />
          <p className="font-sans text-sm text-muted-foreground">
            No listening history yet. Join a live jukebox to start tracking!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {favoriteRooms.map((fav, index) => (
            <Link
              key={fav.roomId}
              href={`/room/${fav.roomSlug}`}
              className="flex items-center gap-4 rounded-xl border border-border/30 p-4 transition-colors hover:border-accent/40 hover:bg-muted/20"
              style={{
                background: "oklch(0.13 0.01 280 / 0.3)",
                backdropFilter: "blur(4px)",
              }}
            >
              {/* Rank */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-sans text-lg font-bold text-muted-foreground">
                {index + 1}
              </div>

              {/* Cover art */}
              <div
                className="h-10 w-10 shrink-0 rounded-lg"
                style={{
                  background: fav.coverArtUrl
                    ? `url(${fav.coverArtUrl}) center/cover no-repeat`
                    : "linear-gradient(135deg, oklch(0.40 0.15 270), oklch(0.30 0.10 300))",
                }}
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-sans text-sm font-semibold text-foreground truncate">
                  {fav.roomName}
                </div>
                <div className="font-sans text-xs text-muted-foreground truncate">
                  {fav.roomGenre} · {fav.visitCount} visit{fav.visitCount !== 1 ? "s" : ""}
                </div>
              </div>

              {/* Listen time */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                <Clock className="h-3.5 w-3.5" />
                <span className="font-sans">{formatMinutes(fav.listenMinutes)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
