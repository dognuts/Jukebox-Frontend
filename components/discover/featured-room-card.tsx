"use client"

import Link from "next/link"
import { type Room, type ChatMessage, formatListenerCount } from "@/lib/mock-data"

// Deterministic palette inspired by the mockup.
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

export function FeaturedRoomCard({ room, chatPreview }: FeaturedRoomCardProps) {
  // Prefer an explicitly-passed preview (fetched fresh on the homepage);
  // fall back to whatever chat data is already on the room.
  const source = chatPreview ?? room.chatMessages ?? []
  const preview = source
    .filter((m) => m.type === "message" || m.type === "request")
    .slice(-2)

  return (
    <div
      className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-2xl"
      style={{
        padding: "var(--space-lg)",
        background:
          "linear-gradient(135deg, rgba(60,30,15,0.5) 0%, rgba(20,15,25,0.8) 100%)",
        border: "0.5px solid rgba(232,154,60,0.15)",
      }}
    >
      {/* Header: Featured badge, room name, listener count */}
      <div
        className="flex items-center justify-between"
        style={{
          marginBottom: "var(--space-md)",
          gap: "var(--space-sm)",
        }}
      >
        <div
          className="flex min-w-0 items-center"
          style={{ gap: "var(--space-sm)" }}
        >
          <span
            className="shrink-0 rounded-[10px] font-bold uppercase tracking-[0.1em]"
            style={{
              paddingInline: "var(--space-sm)",
              paddingBlock: "3px",
              fontSize: "var(--fs-meta)",
              background: "rgba(232,154,60,0.15)",
              color: "#e89a3c",
            }}
          >
            Featured
          </span>
          <span
            className="truncate"
            style={{
              fontSize: "var(--fs-small)",
              color: "rgba(232,230,234,0.4)",
            }}
          >
            {room.name}
          </span>
        </div>
        <div
          className="shrink-0"
          style={{
            fontSize: "var(--fs-small)",
            color: "rgba(232,230,234,0.35)",
          }}
        >
          {formatListenerCount(room.listenerCount)} listening
        </div>
      </div>

      {/* Now playing row */}
      <div className="flex items-center" style={{ gap: "var(--space-md)" }}>
        <div
          className="flex shrink-0 items-center justify-center rounded-[10px]"
          style={{
            width: "clamp(56px, 7vw, 72px)",
            height: "clamp(56px, 7vw, 72px)",
            background: room.coverArt
              ? `url(${room.coverArt}) center/cover no-repeat`
              : room.nowPlaying.albumGradient ||
                "linear-gradient(135deg, #3d2b1a 0%, #1a1225 100%)",
          }}
        >
          <div
            className="rounded-full"
            style={{
              width: "clamp(20px, 2.5vw, 24px)",
              height: "clamp(20px, 2.5vw, 24px)",
              border: "2px solid rgba(232,154,60,0.4)",
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div
            className="truncate font-semibold"
            style={{
              fontSize: "var(--fs-display)",
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
        <Link
          href={`/room/${room.slug}`}
          className="shrink-0 rounded-full font-semibold transition-opacity hover:opacity-90"
          style={{
            paddingInline: "var(--space-lg)",
            paddingBlock: "var(--space-sm)",
            fontSize: "var(--fs-small)",
            background: "#e89a3c",
            color: "#0d0b10",
          }}
        >
          Tune in
        </Link>
      </div>

      {/* Chat preview */}
      {preview.length > 0 && (
        <div
          className="flex flex-col border-t"
          style={{
            marginTop: "var(--space-md)",
            paddingTop: "var(--space-sm)",
            gap: "var(--space-xs)",
            borderColor: "rgba(255,255,255,0.06)",
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
                    width: "18px",
                    height: "18px",
                    fontSize: "8px",
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
                    color: "rgba(232,230,234,0.5)",
                  }}
                >
                  <span className="font-medium" style={{ color }}>
                    {msg.username}
                  </span>{" "}
                  {msg.message}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
