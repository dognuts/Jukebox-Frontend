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
      className="relative overflow-hidden rounded-2xl p-5"
      style={{
        background:
          "linear-gradient(135deg, rgba(60,30,15,0.5) 0%, rgba(20,15,25,0.8) 100%)",
        border: "0.5px solid rgba(232,154,60,0.15)",
      }}
    >
      {/* Header: Featured badge, room name, listener count */}
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="shrink-0 rounded-[10px] px-2.5 py-[3px] text-[10px] font-bold uppercase tracking-[0.1em]"
            style={{ background: "rgba(232,154,60,0.15)", color: "#e89a3c" }}
          >
            Featured
          </span>
          <span
            className="truncate text-xs"
            style={{ color: "rgba(232,230,234,0.4)" }}
          >
            {room.name}
          </span>
        </div>
        <div
          className="shrink-0 text-xs"
          style={{ color: "rgba(232,230,234,0.35)" }}
        >
          {formatListenerCount(room.listenerCount)} listening
        </div>
      </div>

      {/* Now playing row */}
      <div className="flex items-center gap-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px]"
          style={{
            background: room.coverArt
              ? `url(${room.coverArt}) center/cover no-repeat`
              : room.nowPlaying.albumGradient ||
                "linear-gradient(135deg, #3d2b1a 0%, #1a1225 100%)",
          }}
        >
          <div
            className="h-5 w-5 rounded-full"
            style={{ border: "2px solid rgba(232,154,60,0.4)" }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div
            className="truncate text-base font-semibold"
            style={{ color: "#e8e6ea" }}
          >
            {room.nowPlaying.title}
          </div>
          <div
            className="truncate text-[13px]"
            style={{ color: "rgba(232,230,234,0.5)" }}
          >
            {room.nowPlaying.artist}
          </div>
        </div>
        <Link
          href={`/room/${room.slug}`}
          className="shrink-0 rounded-[20px] px-[22px] py-2.5 text-[13px] font-semibold transition-opacity hover:opacity-90"
          style={{ background: "#e89a3c", color: "#0d0b10" }}
        >
          Tune in
        </Link>
      </div>

      {/* Chat preview */}
      {preview.length > 0 && (
        <div
          className="mt-3.5 flex flex-col gap-1.5 border-t pt-3"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          {preview.map((msg) => {
            const color = avatarColorFor(msg.username)
            return (
              <div key={msg.id} className="flex items-center gap-2">
                <div
                  className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[8px] font-bold"
                  style={{ background: color, color: "#0d0b10" }}
                >
                  {initials(msg.username)}
                </div>
                <span
                  className="truncate text-xs"
                  style={{ color: "rgba(232,230,234,0.5)" }}
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
