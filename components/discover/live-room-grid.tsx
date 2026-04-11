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
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: "var(--space-md)" }}
      >
        <h2
          className="font-semibold"
          style={{
            fontSize: "var(--fs-h2)",
            color: "#e8e6ea",
          }}
        >
          {headerLabel}
        </h2>
        <span
          style={{
            fontSize: "var(--fs-small)",
            color: "rgba(232,230,234,0.35)",
          }}
        >
          {rooms.length > 0 ? `${rooms.length} streaming` : ""}
        </span>
      </div>

      {rooms.length === 0 ? (
        <div
          className="rounded-[14px] text-center"
          style={{
            paddingInline: "var(--space-md)",
            paddingBlock: "var(--space-xl)",
            background: "rgba(255,255,255,0.02)",
            border: "0.5px solid rgba(255,255,255,0.06)",
            color: "rgba(232,230,234,0.45)",
            fontSize: "var(--fs-body)",
          }}
        >
          {emptyLabel ?? "No rooms live right now"}
        </div>
      ) : (
        // Auto-fit grid — adds and removes columns continuously based on
        // the container width. No breakpoints needed. The min(220px, 100%)
        // trick lets the grid collapse to a single full-width column on
        // very narrow viewports instead of overflowing.
        <div
          className="grid"
          style={{
            gridTemplateColumns:
              "repeat(auto-fill, minmax(min(220px, 100%), 1fr))",
            gap: "var(--space-md)",
          }}
        >
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
                {/* Gradient header — aspect-ratio keeps the cover
                    proportional regardless of the column width the
                    auto-fit grid assigns. */}
                <div
                  className="relative flex items-end"
                  style={{
                    aspectRatio: "16 / 7",
                    padding: "var(--space-sm)",
                    background: room.coverArt
                      ? `url(${room.coverArt}) center/cover no-repeat`
                      : room.coverGradient ||
                        "linear-gradient(135deg, #1a2535 0%, #0d1520 100%)",
                  }}
                >
                  <div
                    className="absolute flex items-center rounded-lg"
                    style={{
                      top: "var(--space-sm)",
                      right: "var(--space-sm)",
                      gap: "var(--space-2xs)",
                      paddingInline: "var(--space-sm)",
                      paddingBlock: "2px",
                      fontSize: "var(--fs-meta)",
                      background: "rgba(0,0,0,0.4)",
                      color: "rgba(232,230,234,0.6)",
                    }}
                  >
                    <span
                      className="rounded-full"
                      style={{
                        width: "5px",
                        height: "5px",
                        background: "#5dca87",
                      }}
                    />
                    {room.listenerCount}
                  </div>
                </div>

                {/* Info block */}
                <div style={{ padding: "var(--space-md)" }}>
                  <div
                    className="truncate font-semibold"
                    style={{
                      fontSize: "var(--fs-small)",
                      color: "#e8e6ea",
                    }}
                  >
                    {room.name}
                  </div>
                  <div
                    className="truncate"
                    style={{
                      marginBottom: "var(--space-sm)",
                      fontSize: "var(--fs-meta)",
                      color: "rgba(232,230,234,0.4)",
                    }}
                  >
                    {room.djName}
                  </div>
                  <div
                    className="flex items-center"
                    style={{ gap: "var(--space-sm)" }}
                  >
                    <span
                      className="shrink-0 rounded-md"
                      style={{
                        paddingInline: "var(--space-sm)",
                        paddingBlock: "2px",
                        fontSize: "var(--fs-meta)",
                        background: accent.bg,
                        color: accent.label,
                      }}
                    >
                      {room.genre}
                    </span>
                    <span
                      className="truncate"
                      style={{
                        fontSize: "var(--fs-meta)",
                        color: "rgba(232,230,234,0.3)",
                      }}
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
