"use client"

import { type Room } from "@/lib/mock-data"

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

function relativeTime(then: Date): string {
  const sec = Math.max(0, Math.floor((Date.now() - then.getTime()) / 1000))
  if (sec < 60) return "just now"
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}

type Event =
  | {
      key: string
      kind: "went-live"
      username: string
      roomName: string
      timestamp: Date
    }
  | {
      key: string
      kind: "requested"
      username: string
      text: string
      roomName: string
      timestamp: Date
    }
  | {
      key: string
      kind: "created-room"
      username: string
      roomName: string
      timestamp: Date
    }

function deriveEvents(rooms: Room[]): Event[] {
  const events: Event[] = []

  for (const room of rooms) {
    if (!room.isLive) continue
    for (const msg of room.chatMessages ?? []) {
      const ts = msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)
      if (msg.type === "request") {
        events.push({
          key: `req-${room.id}-${msg.id}`,
          kind: "requested",
          username: msg.username,
          text: msg.message,
          roomName: room.name,
          timestamp: ts,
        })
      } else if (msg.type === "announcement") {
        events.push({
          key: `ann-${room.id}-${msg.id}`,
          kind: "went-live",
          username: msg.username,
          roomName: room.name,
          timestamp: ts,
        })
      }
    }
  }

  // Newly-created rooms (not yet live and no lifecycle stamps).
  const now = new Date()
  for (const room of rooms) {
    if (room.isLive) continue
    if (room.scheduledStart || room.endedAt || room.lastActive) continue
    events.push({
      key: `new-${room.id}`,
      kind: "created-room",
      username: room.djName,
      roomName: room.name,
      timestamp: now,
    })
  }

  events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  return events.slice(0, 6)
}

interface ActivityFeedProps {
  rooms: Room[]
}

export function ActivityFeed({ rooms }: ActivityFeedProps) {
  const events = deriveEvents(rooms)
  if (events.length === 0) return null

  return (
    // The activity feed intentionally stays narrower than the rest of
    // the homepage. A list of short text rows is hard to scan when
    // stretched across ~1100px, so we constrain it to a readable
    // reading column inside the wider main container.
    <section className="mx-auto w-full max-w-3xl">
      <h2
        className="mb-3 text-[15px] font-semibold lg:mb-4 lg:text-lg"
        style={{ color: "#e8e6ea" }}
      >
        Happening now
      </h2>
      <div className="flex flex-col gap-px overflow-hidden rounded-xl">
        {events.map((ev) => {
          const color = avatarColorFor(ev.username)
          return (
            <div
              key={ev.key}
              className="flex items-center gap-3 px-3.5 py-2.5 lg:gap-3.5 lg:px-4 lg:py-3"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold lg:h-8 lg:w-8 lg:text-[11px]"
                style={{ background: color, color: "#0d0b10" }}
              >
                {initials(ev.username)}
              </div>
              <div
                className="min-w-0 flex-1 truncate text-xs lg:text-[13px]"
                style={{ color: "rgba(232,230,234,0.6)" }}
              >
                <span className="font-medium" style={{ color }}>
                  {ev.username}
                </span>{" "}
                {ev.kind === "went-live" && (
                  <>
                    just went live with{" "}
                    <span
                      className="font-medium"
                      style={{ color: "#e8e6ea" }}
                    >
                      {ev.roomName}
                    </span>
                  </>
                )}
                {ev.kind === "requested" && (
                  <>
                    requested <span className="italic">{ev.text}</span> in{" "}
                    {ev.roomName}
                  </>
                )}
                {ev.kind === "created-room" && (
                  <>
                    created a new room:{" "}
                    <span
                      className="font-medium"
                      style={{ color: "#e8e6ea" }}
                    >
                      {ev.roomName}
                    </span>
                  </>
                )}
              </div>
              <div
                className="shrink-0 text-[10px] lg:text-[11px]"
                style={{ color: "rgba(232,230,234,0.25)" }}
              >
                {relativeTime(ev.timestamp)}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
