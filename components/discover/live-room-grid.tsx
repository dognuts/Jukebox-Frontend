"use client"

import Link from "next/link"
import { type Room } from "@/lib/mock-data"

// Per-genre accent colors for the small genre pill on each card.
const GENRE_ACCENTS: Record<string, { label: string; bg: string }> = {
  Jazz: { label: "#5dca87", bg: "rgba(93,202,135,0.1)" },
  Electronic: { label: "#c06ad8", bg: "rgba(192,106,216,0.1)" },
  Soul: { label: "#e89a3c", bg: "rgba(232,154,60,0.1)" },
  "Hip-Hop": { label: "#e89a3c", bg: "rgba(232,154,60,0.1)" },
  "Lo-fi": { label: "#4a8fe8", bg: "rgba(74,143,232,0.1)" },
  Indie: { label: "#d8c84a", bg: "rgba(216,200,74,0.1)" },
  Ambient: { label: "#4a8fe8", bg: "rgba(74,143,232,0.1)" },
  House: { label: "#e8734a", bg: "rgba(232,115,74,0.1)" },
  Funk: { label: "#e89a3c", bg: "rgba(232,154,60,0.1)" },
  Rock: { label: "#e8734a", bg: "rgba(232,115,74,0.1)" },
  "R&B": { label: "#c06ad8", bg: "rgba(192,106,216,0.1)" },
  Pop: { label: "#d8c84a", bg: "rgba(216,200,74,0.1)" },
}

function genreAccent(genre: string) {
  return (
    GENRE_ACCENTS[genre] ?? {
      label: "rgba(232,230,234,0.7)",
      bg: "rgba(255,255,255,0.06)",
    }
  )
}

interface LiveRoomGridProps {
  rooms: Room[]
  headerLabel?: string
  emptyLabel?: string
}

export function LiveRoomGrid({
  rooms,
  headerLabel = "Live now",
  emptyLabel,
}: LiveRoomGridProps) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between lg:mb-5">
        <h2
          className="text-[15px] font-semibold lg:text-lg"
          style={{ color: "#e8e6ea" }}
        >
          {headerLabel}
        </h2>
        <span
          className="text-xs lg:text-[13px]"
          style={{ color: "rgba(232,230,234,0.35)" }}
        >
          {rooms.length > 0 ? `${rooms.length} streaming` : ""}
        </span>
      </div>

      {rooms.length === 0 ? (
        <div
          className="rounded-[14px] px-4 py-8 text-center text-sm"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "0.5px solid rgba(255,255,255,0.06)",
            color: "rgba(232,230,234,0.45)",
          }}
        >
          {emptyLabel ?? "No rooms live right now"}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4 xl:grid-cols-4">
          {rooms.map((room) => {
            const accent = genreAccent(room.genre)
            return (
              <Link
                key={room.id}
                href={`/room/${room.slug}`}
                className="block overflow-hidden rounded-[14px] transition-colors hover:bg-white/[0.04]"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "0.5px solid rgba(255,255,255,0.06)",
                }}
              >
                {/* Gradient header */}
                <div
                  className="relative flex h-20 items-end p-2.5 lg:h-24 lg:p-3"
                  style={{
                    background: room.coverArt
                      ? `url(${room.coverArt}) center/cover no-repeat`
                      : room.coverGradient ||
                        "linear-gradient(135deg, #1a2535 0%, #0d1520 100%)",
                  }}
                >
                  <div
                    className="absolute right-2 top-2 flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] lg:right-2.5 lg:top-2.5 lg:text-[11px]"
                    style={{
                      background: "rgba(0,0,0,0.4)",
                      color: "rgba(232,230,234,0.6)",
                    }}
                  >
                    <span
                      className="h-[5px] w-[5px] rounded-full lg:h-1.5 lg:w-1.5"
                      style={{ background: "#5dca87" }}
                    />
                    {room.listenerCount}
                  </div>
                </div>

                {/* Info block */}
                <div className="p-3 lg:p-4">
                  <div
                    className="truncate text-[13px] font-semibold lg:text-sm"
                    style={{ color: "#e8e6ea" }}
                  >
                    {room.name}
                  </div>
                  <div
                    className="mb-1.5 truncate text-[11px] lg:mb-2 lg:text-[12px]"
                    style={{ color: "rgba(232,230,234,0.4)" }}
                  >
                    {room.djName}
                  </div>
                  <div className="flex items-center gap-1.5 lg:gap-2">
                    <span
                      className="shrink-0 rounded-md px-2 py-0.5 text-[10px] lg:text-[11px]"
                      style={{ background: accent.bg, color: accent.label }}
                    >
                      {room.genre}
                    </span>
                    <span
                      className="truncate text-[10px] lg:text-[11px]"
                      style={{ color: "rgba(232,230,234,0.3)" }}
                    >
                      Now: {room.nowPlaying.title}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
