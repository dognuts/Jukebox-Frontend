"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { type Room } from "@/lib/mock-data"
import { FeaturedRoom } from "./featured-room"
import { RoomCard } from "./room-card"

interface LiveNowHeroProps {
  rooms: Room[]
}

export function LiveNowHero({ rooms }: LiveNowHeroProps) {
  if (rooms.length === 0) return null

  const featured = rooms[0]
  const previews = rooms.slice(1, 3)

  return (
    <section>
      {/* Section header */}
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="font-sans text-xl font-bold text-foreground">
            Live Now
          </h2>
          <p className="mt-0.5 font-sans text-sm text-muted-foreground">
            Streaming right now
          </p>
        </div>
        {rooms.length > 3 && (
          <Link
            href="/browse/live"
            className="flex items-center gap-1 font-sans text-sm font-medium transition-colors"
            style={{
              color: "oklch(0.82 0.18 80)",
            }}
          >
            View more
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {/* Hero layout: featured + 2 previews */}
      <div className="flex flex-col gap-5 lg:flex-row lg:gap-6">
        {/* Featured big card */}
        <div className="lg:flex-1 lg:min-w-0">
          <FeaturedRoom room={featured} />
        </div>

        {/* Smaller preview cards stacked on the right */}
        {previews.length > 0 && (
          <div className="flex flex-row gap-4 lg:w-[340px] lg:shrink-0 lg:flex-col lg:gap-5">
            {previews.map((room) => (
              <div key={room.id} className="flex-1 lg:flex-initial">
                <RoomCard room={room} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
