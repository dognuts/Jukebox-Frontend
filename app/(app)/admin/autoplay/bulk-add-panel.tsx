"use client"

import { useState } from "react"
import { Loader2, Plus, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { adminSearchTrack, type TrackCandidate } from "@/lib/api"

// Bulk mode requires the host page to extend its track type with these two
// optional fields. We only *write* them; the page is responsible for stripping
// before persisting. Export for the page's own type declaration.
export interface BulkSearchExtensions {
  _searchAlternatives?: TrackCandidate[]
  _searchQuery?: string
}

// The minimum shape we produce / append. The page's AutoplayTrack is a
// superset (adds optional fields like albumGradient, infoSnippet).
export interface BulkResolvedTrack extends BulkSearchExtensions {
  title: string
  artist: string
  duration: number
  source: string
  sourceUrl: string
}

interface Props<TrackT extends BulkResolvedTrack> {
  // Append one or more tracks to the host playlist. Order matters — bulk
  // results come in input order regardless of which search resolved first.
  onAddTracks: (tracks: TrackT[]) => void
  // URL mode reuses the existing noembed-backed resolver from the host page.
  resolveUrl: (url: string) => Promise<TrackT>
  // Build a search-result track with host-specific extras (gradient, etc.).
  // Chunk 4 reads _searchAlternatives/_searchQuery off this track to power
  // the alternatives expander on the row.
  buildSearchTrack: (candidate: TrackCandidate, query: string, alts: TrackCandidate[]) => TrackT
  // Build a "failed to find" placeholder row. Separate from buildSearchTrack
  // so the host can style it distinctly (red state, retry buttons).
  buildFailedTrack: (query: string, reason: string) => TrackT
  urlPlaceholder?: string
  outerDisabled?: boolean
}

type Mode = "url" | "bulk"

const CONCURRENCY = 5

export function BulkAddPanel<TrackT extends BulkResolvedTrack>({
  onAddTracks,
  resolveUrl,
  buildSearchTrack,
  buildFailedTrack,
  urlPlaceholder = "Paste YouTube, SoundCloud, or audio URL...",
  outerDisabled = false,
}: Props<TrackT>) {
  const [mode, setMode] = useState<Mode>("url")

  // URL mode
  const [url, setUrl] = useState("")
  const [resolving, setResolving] = useState(false)

  // Bulk mode
  const [bulkText, setBulkText] = useState("")
  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)
  const [bulkError, setBulkError] = useState<string | null>(null)

  const handleUrlAdd = async () => {
    if (!url.trim()) return
    setResolving(true)
    try {
      const track = await resolveUrl(url)
      onAddTracks([track])
      setUrl("")
    } catch {
      // resolveUrl is best-effort; leave the text so admin can retry
    }
    setResolving(false)
  }

  const handleBulkRun = async () => {
    const queries = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
    if (queries.length === 0) return

    setBulkError(null)
    setBulkRunning(true)
    setBulkProgress({ done: 0, total: queries.length })

    // Results indexed by input position so final append preserves order
    // regardless of arrival order.
    const results: (TrackT | null)[] = new Array(queries.length).fill(null)

    // Run searches with a concurrency cap of CONCURRENCY. Each slot loops
    // taking the next unclaimed index until all are done.
    let nextIdx = 0
    let completed = 0
    const runner = async () => {
      while (true) {
        const i = nextIdx++
        if (i >= queries.length) return
        const q = queries[i]
        const res = await adminSearchTrack(q)
        if (res.ok) {
          results[i] = buildSearchTrack(res.primary, q, res.alternatives)
        } else {
          if (res.reason === "quota" || res.reason === "not_configured") {
            // Surface the operator-facing condition — but keep running the
            // batch so already-done rows still land. A fresh run will hit
            // the same wall; user can react when the batch finishes.
            setBulkError(
              res.reason === "quota"
                ? "YouTube quota exhausted. Remaining rows will fail until quota resets."
                : "Bulk search not configured (YOUTUBE_DATA_API_KEY unset on backend).",
            )
          }
          results[i] = buildFailedTrack(q, res.reason === "no_results" ? "no match" : res.reason)
        }
        completed++
        setBulkProgress({ done: completed, total: queries.length })
      }
    }

    const workers = Array.from({ length: Math.min(CONCURRENCY, queries.length) }, runner)
    await Promise.all(workers)

    onAddTracks(results.filter((t): t is TrackT => t !== null))
    setBulkText("")
    setBulkRunning(false)
    setBulkProgress(null)
  }

  return (
    <div className="mb-3">
      {/* Mode toggle */}
      <div className="mb-2 inline-flex gap-0.5 rounded-lg p-0.5" style={{ background: "oklch(0.15 0.02 280 / 0.6)" }}>
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`rounded-md px-3 py-1 font-sans text-[11px] font-medium transition-colors ${
            mode === "url" ? "bg-muted/30 text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          URL
        </button>
        <button
          type="button"
          onClick={() => setMode("bulk")}
          className={`inline-flex items-center gap-1 rounded-md px-3 py-1 font-sans text-[11px] font-medium transition-colors ${
            mode === "bulk" ? "bg-muted/30 text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="h-3 w-3" />
          Bulk
        </button>
      </div>

      {mode === "url" ? (
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUrlAdd()}
            placeholder={urlPlaceholder}
            className="flex-1 rounded-lg bg-muted/20 text-sm"
            disabled={resolving || outerDisabled}
          />
          <Button
            size="sm"
            onClick={handleUrlAdd}
            disabled={resolving || outerDisabled || !url.trim()}
            className="rounded-lg gap-1.5"
          >
            {resolving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={`Paste one song per line — "Apache Incredible Bongo Band", "J Dilla Donuts Stop", anything goes. Admin only.`}
            className="min-h-[7rem] rounded-lg bg-muted/20 px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground outline-none focus:bg-muted/30"
            disabled={bulkRunning || outerDisabled}
            spellCheck={false}
          />
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={handleBulkRun}
              disabled={bulkRunning || outerDisabled || !bulkText.trim()}
              className="rounded-lg gap-1.5"
            >
              {bulkRunning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Find on YouTube
            </Button>
            {bulkProgress && (
              <span className="font-mono text-[11px] text-muted-foreground">
                Searching {bulkProgress.done} of {bulkProgress.total}…
              </span>
            )}
          </div>
          {bulkError && (
            <p className="font-sans text-[11px] text-red-400/80">{bulkError}</p>
          )}
        </div>
      )}
    </div>
  )
}
