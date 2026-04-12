"use client"

import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { type Room, type ChatMessage, formatListenerCount } from "@/lib/mock-data"

const AVATAR_COLORS = [
  "#c06ad8",
  "#5dca87",
  "#4a8fe8",
  "#e8734a",
  "#d8c84a",
  "#e89a3c",
]

function avatarColorFor(username: string): string {
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = (hash * 31 + username.charCodeAt(i)) >>> 0
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function initials(username: string): string {
  const parts = username.split(/[\s_]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]!).toUpperCase()
  return username.slice(0, 2).toUpperCase()
}

interface FeaturedRoomCardProps {
  room: Room
  chatPreview?: ChatMessage[]
}

// Direction B — Big square cover with split text.
// Side-by-side layout: a large square cover on the left (like a
// vinyl single) and stacked text on the right (FEATURED badge, room
// name, DJ, now playing, listener count + Tune In). On mobile it
// collapses to a vertical stack — cover on top, text below. Chat
// preview spans the full card width underneath.
export function FeaturedRoomCard({ room, chatPreview }: FeaturedRoomCardProps) {
  const source = chatPreview ?? room.chatMessages ?? []
  const preview = source
    .filter((m) => m.type === "message" || m.type === "request")
    .slice(-2)

  const coverBackground = room.coverArt
    ? `url(${room.coverArt}) center/cover no-repeat`
    : room.coverGradient ||
      room.nowPlaying.albumGradient ||
      "linear-gradient(135deg, #3d2b1a 0%, #1a1225 100%)"

  return (
    <article
      className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-2xl"
      style={{
        background:
          "linear-gradient(135deg, rgba(40,22,10,0.5) 0%, rgba(20,15,25,0.82) 100%)",
        border: "0.5px solid rgba(232,154,60,0.22)",
        boxShadow:
          "0 30px 60px -20px rgba(0,0,0,0.5), 0 0 80px -30px rgba(232,154,60,0.18)",
      }}
    >
      <div
        className="flex flex-col md:flex-row"
        style={{
          padding: "var(--space-lg)",
          gap: "var(--space-lg)",
        }}
      >
        {/* ─── Cover (left on md+, top on mobile) ─── */}
        <div
          className="relative shrink-0 overflow-hidden rounded-[14px]"
          style={{
            width: "clamp(200px, 28vw, 280px)",
            aspectRatio: "1 / 1",
            background: coverBackground,
            boxShadow:
              "0 0 40px rgba(232,154,60,0.12), 0 20px 40px -10px rgba(0,0,0,0.5)",
          }}
        >
          {/* Ambient amber glow behind the cover is implied by the
              box-shadow above. Inner border + spindle accents. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-[inherit]"
            style={{
              boxShadow:
                "inset 0 0 0 1px rgba(232,154,60,0.18), inset 0 0 50px rgba(0,0,0,0.3)",
            }}
          />
          {/* Pulsing LIVE dot at the bottom-left of the cover */}
          <div
            className="absolute flex items-center gap-1.5 rounded-full"
            style={{
              bottom: "var(--space-sm)",
              left: "var(--space-sm)",
              paddingInline: "var(--space-sm)",
              paddingBlock: "4px",
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(8px)",
            }}
          >
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{
                background: "#e89a3c",
                boxShadow: "0 0 8px rgba(232,154,60,0.8)",
                animation: "pulse 2s ease-in-out infinite",
              }}
            />
            <span
              className="uppercase"
              style={{
                fontSize: "var(--fs-meta)",
                letterSpacing: "0.18em",
                color: "#f4b25c",
                fontWeight: 600,
              }}
            >
              Live
            </span>
          </div>
        </div>

        {/* ─── Text column (right on md+, below cover on mobile) ─── */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* FEATURED badge */}
          <div className="flex items-center" style={{ gap: "var(--space-sm)" }}>
            <span
              className="rounded-full font-bold uppercase tracking-[0.18em]"
              style={{
                paddingInline: "var(--space-sm)",
                paddingBlock: "4px",
                fontSize: "var(--fs-meta)",
                background:
                  "linear-gradient(135deg, #f4b25c 0%, #e89a3c 100%)",
                color: "#0d0b10",
                boxShadow: "0 0 18px rgba(232,154,60,0.35)",
              }}
            >
              Featured
            </span>
            <span
              className="uppercase"
              style={{
                fontSize: "var(--fs-meta)",
                letterSpacing: "0.16em",
                color: "rgba(232,230,234,0.45)",
              }}
            >
              {room.genre}
            </span>
          </div>

          {/* Giant italic room name */}
          <h2
            className="mt-3 font-bold leading-[0.96] tracking-tight"
            style={{
              fontSize: "var(--fs-hero)",
              color: "#f0ebe0",
              fontStyle: "italic",
              textShadow: "0 0 40px rgba(232,154,60,0.14)",
            }}
          >
            {room.name}
          </h2>

          {/* DJ line */}
          <div
            className="mt-2"
            style={{
              fontSize: "var(--fs-small)",
              color: "rgba(232,230,234,0.5)",
            }}
          >
            Hosted by{" "}
            <span style={{ color: "#e89a3c", fontWeight: 600 }}>
              {room.djName}
            </span>
          </div>

          {/* Now playing strip */}
          <div
            className="mt-auto flex items-center rounded-xl"
            style={{
              marginTop: "var(--space-lg)",
              gap: "var(--space-sm)",
              paddingInline: "var(--space-md)",
              paddingBlock: "var(--space-sm)",
              background: "rgba(0,0,0,0.35)",
              border: "0.5px solid rgba(255,255,255,0.06)",
            }}
          >
            <div
              className="flex shrink-0 items-center gap-1"
              aria-hidden="true"
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{
                  background: "#e89a3c",
                  boxShadow: "0 0 8px rgba(232,154,60,0.8)",
                }}
              />
              <span
                className="uppercase"
                style={{
                  fontSize: "var(--fs-meta)",
                  letterSpacing: "0.2em",
                  color: "rgba(232,154,60,0.8)",
                }}
              >
                Now
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div
                className="truncate font-semibold"
                style={{
                  fontSize: "var(--fs-body)",
                  color: "#e8e6ea",
                }}
              >
                {room.nowPlaying.title}
              </div>
              <div
                className="truncate"
                style={{
                  fontSize: "var(--fs-small)",
                  color: "rgba(232,230,234,0.5)",
                }}
              >
                {room.nowPlaying.artist}
              </div>
            </div>
          </div>

          {/* Listener count + Tune In row */}
          <div
            className="mt-4 flex items-center justify-between"
            style={{ gap: "var(--space-md)" }}
          >
            <div
              style={{
                fontSize: "var(--fs-small)",
                color: "rgba(232,230,234,0.6)",
              }}
            >
              <span
                className="font-bold tabular-nums"
                style={{
                  fontSize: "var(--fs-display)",
                  color: "#f0ebe0",
                }}
              >
                {formatListenerCount(room.listenerCount)}
              </span>
              <span style={{ marginLeft: "var(--space-xs)" }}>listening</span>
            </div>
            <Link
              href={`/room/${room.slug}`}
              className="group/cta flex items-center gap-2 rounded-full font-bold uppercase tracking-[0.14em] transition-all hover:gap-3"
              style={{
                paddingInline: "var(--space-lg)",
                paddingBlock: "var(--space-sm)",
                fontSize: "var(--fs-small)",
                background:
                  "linear-gradient(135deg, #f4b25c 0%, #e89a3c 100%)",
                color: "#0d0b10",
                boxShadow:
                  "0 0 30px rgba(232,154,60,0.35), 0 8px 20px -4px rgba(0,0,0,0.4)",
              }}
            >
              Tune in
              <ArrowUpRight
                className="transition-transform group-hover/cta:-translate-y-[1px]"
                style={{ width: "14px", height: "14px" }}
                strokeWidth={2.8}
              />
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Chat preview (spans full card width) ─── */}
      {preview.length > 0 && (
        <div
          className="flex flex-col border-t"
          style={{
            gap: "var(--space-xs)",
            paddingInline: "var(--space-lg)",
            paddingBlock: "var(--space-md)",
            borderColor: "rgba(255,255,255,0.05)",
            background: "rgba(0,0,0,0.2)",
          }}
        >
          {preview.map((msg) => {
            const color = avatarColorFor(msg.username)
            return (
              <div
                key={msg.id}
                className="flex items-center"
                style={{ gap: "var(--space-sm)" }}
              >
                <div
                  className="flex shrink-0 items-center justify-center rounded-full font-bold"
                  style={{
                    width: "20px",
                    height: "20px",
                    fontSize: "9px",
                    background: color,
                    color: "#0d0b10",
                  }}
                >
                  {initials(msg.username)}
                </div>
                <span
                  className="truncate"
                  style={{
                    fontSize: "var(--fs-small)",
                    color: "rgba(232,230,234,0.55)",
                  }}
                >
                  <span className="font-semibold" style={{ color }}>
                    {msg.username}
                  </span>{" "}
                  {(msg as any).mediaUrl
                    ? <span style={{ opacity: 0.7, fontStyle: "italic" }}>[GIF]</span>
                    : msg.message}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </article>
  )
}
