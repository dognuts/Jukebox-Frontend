"use client"

import Link from "next/link"
import { Radio as RadioIcon, Clock, Music } from "lucide-react"
import { SmartImage } from "@/components/smart-image"

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
      <h3 className="type-h2 flex items-center gap-2 font-sans text-ink-foreground">
        <RadioIcon className="h-5 w-5 text-brand-amber" />
        Most Listened Jukeboxes
      </h3>

      {favoriteRooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12">
          <Music className="h-10 w-10 text-text-low" />
          <p className="type-small font-sans text-text-mid">
            No listening history yet. Join a live jukebox to start tracking!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {favoriteRooms.map((fav, index) => (
            <Link
              key={fav.roomId}
              href={`/room/${fav.roomSlug}`}
              className="flex items-center gap-4 rounded-xl border-[0.5px] border-hairline bg-white/[0.02] p-4 transition-colors hover:border-hairline-strong hover:bg-white/[0.04]"
            >
              {/* Rank */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-sans text-lg font-bold text-text-low">
                {index + 1}
              </div>

              {/* Cover art */}
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border-[0.5px] border-hairline bg-white/[0.04]">
                {fav.coverArtUrl && (
                  <SmartImage
                    src={fav.coverArtUrl}
                    alt=""
                    aria-hidden="true"
                    fill
                    sizes="40px"
                    className="object-cover"
                    draggable={false}
                  />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-sans text-sm font-semibold text-text-hi truncate">
                  {fav.roomName}
                </div>
                <div className="font-sans text-xs text-text-mid truncate">
                  {fav.roomGenre} · {fav.visitCount} visit{fav.visitCount !== 1 ? "s" : ""}
                </div>
              </div>

              {/* Listen time */}
              <div className="flex items-center gap-1.5 text-xs text-text-mid shrink-0">
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
