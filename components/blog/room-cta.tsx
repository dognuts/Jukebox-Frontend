import Link from "next/link"
import { ArrowRight, Headphones } from "lucide-react"

// Links to /live, which server-side redirects to whichever room is
// currently featured on Jukebox. Stays accurate across featured-room
// changes without needing a blog rebuild.
export function RoomCTA({
  label,
  blurb,
}: {
  // Optional override for the CTA headline.
  label?: string
  // Optional override for the supporting line.
  blurb?: string
  // Accepted for backwards compatibility with older MDX calls — ignored.
  room?: string
}) {
  const accent = "#e89a3c"

  return (
    <Link
      href="/live"
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
          background: "rgba(232,154,60,0.14)",
          border: "0.5px solid rgba(232,154,60,0.3)",
          color: accent,
        }}
        aria-hidden
      >
        <Headphones className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold" style={{ color: "#e8e6ea" }}>
          {label ?? "Drop into the live room on Jukebox"}
        </div>
        <div
          className="mt-0.5 text-[13px]"
          style={{ color: "rgba(232,230,234,0.55)" }}
        >
          {blurb ?? "No account needed. Press play."}
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
