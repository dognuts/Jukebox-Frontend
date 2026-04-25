"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { MessageCircle } from "lucide-react"
import { TroubleshooterRow } from "@/components/help/troubleshooter-row"

type RowId = "gated" | "no-audio" | "out-of-sync" | "unavailable"

const ROWS: Array<{ id: RowId; title: string; render: () => React.ReactNode }> = [
  {
    id: "gated",
    title: `Video says "Sign in to confirm you're not a bot."`,
    render: () => (
      <>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Open <a href="https://youtube.com" target="_blank" rel="noreferrer" className="underline underline-offset-2">youtube.com</a> in a new tab of this browser and sign into your YouTube account.</li>
          <li>Come back to this tab and refresh the page. The video should load normally.</li>
        </ol>
        <p className="text-xs">
          Why this happens: YouTube requires a signed-in session for some embedded videos. It's a YouTube anti-abuse check that affects every site embedding their player — not a Jukebox issue.
        </p>
      </>
    ),
  },
  {
    id: "no-audio",
    title: `I can't hear anything.`,
    render: () => (
      <ul className="list-disc pl-5 space-y-1">
        <li>Click the play button once — browsers block audio until you interact with the page.</li>
        <li>Check your browser tab isn't muted (right-click the tab).</li>
        <li>Check the volume slider in the Jukebox player.</li>
        <li>Check your system volume and output device.</li>
      </ul>
    ),
  },
  {
    id: "out-of-sync",
    title: `The track is out of sync with my friends.`,
    render: () => (
      <ul className="list-disc pl-5 space-y-1">
        <li>Refresh the page — Jukebox will re-seek to the room's current position.</li>
        <li>Persistent drift usually means a slow or unstable connection. Try a different network.</li>
      </ul>
    ),
  },
  {
    id: "unavailable",
    title: `The video is black or says "Video unavailable."`,
    render: () => (
      <>
        <p>The uploader removed the video or changed its embed permissions. The room will move on to the next track.</p>
        <p className="text-xs">This is rare — autoplay tracks are screened before they're added, and user-DJs vet their own queues.</p>
      </>
    ),
  },
]

export default function ListeningTroubleshooterPage() {
  const params = useSearchParams()
  const [openId, setOpenId] = useState<RowId | "still-stuck" | null>(null)

  // Deep-link support: #gated / #no-audio / #out-of-sync / #unavailable / #still-stuck
  useEffect(() => {
    if (typeof window === "undefined") return
    const hash = window.location.hash.replace("#", "")
    if (hash) {
      const known: (RowId | "still-stuck")[] = ["gated", "no-audio", "out-of-sync", "unavailable", "still-stuck"]
      if ((known as string[]).includes(hash)) setOpenId(hash as RowId | "still-stuck")
    }
  }, [])

  const roomSlug = params.get("room") || ""
  const trackId = params.get("track") || ""
  const trackTitle = params.get("trackTitle") || ""
  const trackArtist = params.get("trackArtist") || ""
  const playbackPositionSec = Number(params.get("pos") || 0)

  const handleContactClick = () => {
    // Wired in Task 10 to open the ContactSupportForm modal.
    console.log("[help/listening] contact support clicked", { roomSlug, trackId, trackTitle, trackArtist, playbackPositionSec })
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-6">
      <h1 className="font-sans text-3xl font-bold text-foreground mb-2">Trouble listening?</h1>
      <p className="font-sans text-sm text-muted-foreground mb-10">
        Pick the issue you're seeing — most things have a quick fix.
      </p>

      <div className="rounded-xl border border-border/40 px-4 mb-6" style={{ background: "oklch(0.14 0.01 280 / 0.5)" }}>
        {ROWS.map((row) => (
          <TroubleshooterRow
            key={row.id}
            id={row.id}
            title={row.title}
            open={openId === row.id}
            onToggle={() => setOpenId(openId === row.id ? null : row.id)}
          >
            {row.render()}
          </TroubleshooterRow>
        ))}

        {/* Row 5 — Still stuck? (no expand behavior, renders as button-style) */}
        <div id="still-stuck" className="py-4 scroll-mt-16">
          <div className="flex items-center justify-between gap-4">
            <span className="font-sans text-sm font-medium text-foreground">Still stuck?</span>
            <button
              type="button"
              onClick={handleContactClick}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 font-sans text-sm font-semibold transition-colors"
              style={{ background: "#e89a2e", color: "#0a0a0a" }}
            >
              <MessageCircle className="h-4 w-4" />
              Contact support
            </button>
          </div>
        </div>
      </div>

      <p className="font-sans text-xs text-muted-foreground">
        Looking for general account, billing, or room help? Visit the <Link href="/support" className="underline">support page</Link>.
      </p>
    </div>
  )
}
