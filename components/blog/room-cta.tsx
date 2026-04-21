import Link from "next/link"
import { ArrowRight, Headphones } from "lucide-react"

type KnownRoom = "lo-fi" | "hip-hop" | "jazz" | "electronic" | "indie" | "soul"

const ROOM_META: Record<
  KnownRoom,
  { name: string; blurb: string; accent: string }
> = {
  "lo-fi": {
    name: "Lo-fi Room",
    blurb: "Chill beats to study and relax to — live, with other listeners.",
    accent: "oklch(0.72 0.18 195)",
  },
  "hip-hop": {
    name: "Hip-Hop Room",
    blurb: "Discover new cuts and classics with other hip-hop heads.",
    accent: "oklch(0.65 0.24 30)",
  },
  jazz: {
    name: "Jazz Room",
    blurb: "Smooth jazz, standards, and modern takes — in real time.",
    accent: "oklch(0.75 0.15 60)",
  },
  electronic: {
    name: "Electronic Room",
    blurb: "House to techno to ambient — ride the energy together.",
    accent: "oklch(0.70 0.22 300)",
  },
  indie: {
    name: "Indie Room",
    blurb: "Discover underground artists with fellow indie lovers.",
    accent: "oklch(0.78 0.14 160)",
  },
  soul: {
    name: "Soul Room",
    blurb: "Classic soul, neo-soul, and R&B — share the groove.",
    accent: "oklch(0.68 0.20 20)",
  },
}

export function RoomCTA({ room, label }: { room: string; label?: string }) {
  const known = ROOM_META[room as KnownRoom]
  const name = known?.name ?? `${room} Room`
  const blurb =
    known?.blurb ??
    "Drop into a live listening room on Jukebox — no account needed."
  const accent = known?.accent ?? "#e89a3c"

  return (
    <Link
      href={`/room/${room}`}
      className="not-prose group my-8 flex items-center gap-4 rounded-2xl border px-5 py-4 no-underline transition-colors"
      style={{
        background: "rgba(255,255,255,0.03)",
        borderColor: "rgba(255,255,255,0.08)",
        color: "#e8e6ea",
      }}
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{
          background: `color-mix(in oklch, ${accent} 18%, transparent)`,
          border: `0.5px solid color-mix(in oklch, ${accent} 40%, transparent)`,
          color: accent,
        }}
        aria-hidden
      >
        <Headphones className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div
          className="text-sm font-semibold"
          style={{ color: "#e8e6ea" }}
        >
          {label ?? `Jump into the ${name}`}
        </div>
        <div
          className="mt-0.5 text-[13px]"
          style={{ color: "rgba(232,230,234,0.55)" }}
        >
          {blurb}
        </div>
      </div>
      <ArrowRight
        className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5"
        style={{ color: accent }}
        aria-hidden
      />
    </Link>
  )
}
