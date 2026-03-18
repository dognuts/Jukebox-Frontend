"use client"

import { useState, useRef } from "react"
import { ChevronLeft, ChevronRight, Clock, Music } from "lucide-react"
import type { Track } from "@/lib/mock-data"

interface TrackHistoryProps {
  tracks: Track[]
  currentTrackId?: string
}

export function TrackHistory({ tracks, currentTrackId }: TrackHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScroll = () => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10)
  }

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return
    const amount = direction === "left" ? -200 : 200
    scrollRef.current.scrollBy({ left: amount, behavior: "smooth" })
  }

  if (tracks.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span className="font-sans text-sm">No tracks played yet</span>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-sans text-sm font-medium text-foreground">Recently Played</h3>
        </div>
        <span className="font-sans text-xs text-muted-foreground">{tracks.length} tracks</span>
      </div>

      {/* Scroll buttons */}
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full p-1.5 transition-all hover:scale-110"
          style={{
            background: "oklch(0.18 0.02 280 / 0.9)",
            border: "1px solid oklch(0.30 0.03 280 / 0.5)",
            boxShadow: "0 2px 8px oklch(0 0 0 / 0.3)",
          }}
        >
          <ChevronLeft className="h-4 w-4 text-foreground" />
        </button>
      )}
      {canScrollRight && tracks.length > 3 && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full p-1.5 transition-all hover:scale-110"
          style={{
            background: "oklch(0.18 0.02 280 / 0.9)",
            border: "1px solid oklch(0.30 0.03 280 / 0.5)",
            boxShadow: "0 2px 8px oklch(0 0 0 / 0.3)",
          }}
        >
          <ChevronRight className="h-4 w-4 text-foreground" />
        </button>
      )}

      {/* Track carousel */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-2"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {tracks.map((track, index) => {
          const isCurrent = track.id === currentTrackId
          
          return (
            <div
              key={track.id}
              className="group relative shrink-0 cursor-pointer transition-all duration-300 hover:scale-105"
              style={{ scrollSnapAlign: "start" }}
            >
              {/* Album art placeholder */}
              <div
                className="relative h-20 w-20 rounded-lg overflow-hidden"
                style={{
                  background: track.albumGradient,
                  boxShadow: isCurrent
                    ? "0 0 20px oklch(0.82 0.18 80 / 0.4)"
                    : "0 2px 8px oklch(0 0 0 / 0.3)",
                  border: isCurrent
                    ? "2px solid oklch(0.82 0.18 80)"
                    : "1px solid oklch(0.30 0.03 280 / 0.3)",
                }}
              >
                {/* Music icon overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Music className="h-6 w-6 text-white/60" />
                </div>

                {/* Track number badge */}
                <div
                  className="absolute top-1 left-1 rounded px-1.5 py-0.5 font-sans text-[10px] font-bold"
                  style={{
                    background: "oklch(0 0 0 / 0.6)",
                    color: "oklch(0.85 0 0)",
                  }}
                >
                  {tracks.length - index}
                </div>

                {/* Now playing indicator */}
                {isCurrent && (
                  <div
                    className="absolute bottom-1 right-1 rounded-full px-1.5 py-0.5 font-sans text-[9px] font-bold"
                    style={{
                      background: "oklch(0.82 0.18 80)",
                      color: "oklch(0.15 0.02 80)",
                    }}
                  >
                    NOW
                  </div>
                )}
              </div>

              {/* Track info */}
              <div className="mt-2 w-20">
                <p
                  className="truncate font-sans text-xs font-medium"
                  style={{ color: isCurrent ? "oklch(0.82 0.18 80)" : "oklch(0.85 0 0)" }}
                >
                  {track.title}
                </p>
                <p className="truncate font-sans text-[10px] text-muted-foreground">
                  {track.artist}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
