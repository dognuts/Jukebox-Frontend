"use client"

import { useState } from "react"
import { Loader2, RotateCw, Sparkles } from "lucide-react"
import { type TrackCandidate, adminSearchTrack } from "@/lib/api"

// Minimal shape the extras component reads off of a track. The host page's
// AutoplayTrack extends this — we keep the type narrow so this component
// stays decoupled from host-specific fields (infoSnippet, albumGradient, etc.).
export interface TrackWithBulkExtras {
  title: string
  artist: string
  duration: number
  source: string
  sourceUrl: string
  _searchAlternatives?: TrackCandidate[]
  _searchQuery?: string
}

/**
 * BulkActionButton renders the ⟳-alternatives toggle for successfully-found
 * bulk rows, OR the Retry button for failed bulk rows. Returns null for
 * rows that didn't come from Bulk mode (no _searchQuery) so existing URL
 * rows render unchanged.
 */
export function BulkActionButton<TrackT extends TrackWithBulkExtras>({
  track,
  isExpanded,
  onToggleExpand,
  onReplace,
}: {
  track: TrackT
  isExpanded: boolean
  onToggleExpand: () => void
  onReplace: (next: TrackT) => void
}) {
  const [retrying, setRetrying] = useState(false)
  const isFailed = !track.sourceUrl && !!track._searchQuery
  const hasAlts = !!track._searchAlternatives && track._searchAlternatives.length > 0

  const handleRetry = async () => {
    if (!track._searchQuery) return
    setRetrying(true)
    const res = await adminSearchTrack(track._searchQuery)
    setRetrying(false)
    if (res.ok) {
      onReplace({
        ...track,
        title: res.primary.title,
        artist: res.primary.artist,
        duration: res.primary.duration,
        source: res.primary.source,
        sourceUrl: res.primary.sourceUrl,
        _searchAlternatives: res.alternatives,
      })
    }
    // On failure, leave the row in its failed state — admin can retry again
    // or remove it manually with the existing Trash button.
  }

  if (isFailed) {
    return (
      <button
        onClick={handleRetry}
        disabled={retrying}
        className="p-1 rounded hover:bg-amber-500/20 disabled:opacity-50"
        title={`Retry search: ${track._searchQuery}`}
      >
        {retrying ? (
          <Loader2 className="h-3 w-3 animate-spin" style={{ color: "oklch(0.70 0.18 60)" }} />
        ) : (
          <RotateCw className="h-3 w-3" style={{ color: "oklch(0.70 0.18 60)" }} />
        )}
      </button>
    )
  }

  if (hasAlts) {
    return (
      <button
        onClick={onToggleExpand}
        className={`p-1 rounded hover:bg-muted/20 ${isExpanded ? "bg-muted/20" : ""}`}
        title="Show alternatives"
      >
        <Sparkles className="h-3 w-3 text-muted-foreground" />
      </button>
    )
  }

  return null
}

/**
 * BulkAltsPanel renders the inline expander shown below a bulk-found row.
 * Lists the up-to-4 alternatives and lets the admin pick one (which merges
 * into the row) or re-run the original search for a fresh set.
 */
export function BulkAltsPanel<TrackT extends TrackWithBulkExtras>({
  track,
  onReplace,
  onClose,
}: {
  track: TrackT
  onReplace: (next: TrackT) => void
  onClose: () => void
}) {
  const [researching, setResearching] = useState(false)
  const [alts, setAlts] = useState<TrackCandidate[]>(track._searchAlternatives ?? [])

  if (!track._searchQuery) return null

  const handlePick = (alt: TrackCandidate) => {
    onReplace({
      ...track,
      title: alt.title,
      artist: alt.artist,
      duration: alt.duration,
      source: alt.source,
      sourceUrl: alt.sourceUrl,
      _searchAlternatives: alts,
    })
    onClose()
  }

  const handleSearchAgain = async () => {
    if (!track._searchQuery) return
    setResearching(true)
    const res = await adminSearchTrack(track._searchQuery)
    setResearching(false)
    if (res.ok) {
      // Fresh batch = treat the new "primary" as the current pick and keep
      // the rest as alternatives for further iteration.
      setAlts(res.alternatives)
      onReplace({
        ...track,
        title: res.primary.title,
        artist: res.primary.artist,
        duration: res.primary.duration,
        source: res.primary.source,
        sourceUrl: res.primary.sourceUrl,
        _searchAlternatives: res.alternatives,
      })
    }
  }

  return (
    <div
      className="mt-1.5 ml-7 rounded-md p-2"
      style={{
        background: "oklch(0.14 0.02 280 / 0.7)",
        border: "1px solid oklch(0.25 0.04 280 / 0.5)",
      }}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-sans text-[10px] text-muted-foreground">
          Alternatives for <span className="font-mono">{track._searchQuery}</span>
        </span>
        <button
          onClick={handleSearchAgain}
          disabled={researching}
          className="font-sans text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {researching ? "Searching…" : "Search again"}
        </button>
      </div>
      {alts.length === 0 ? (
        <p className="py-1 font-sans text-[10px] text-muted-foreground">
          No alternatives to show.
        </p>
      ) : (
        <ul className="space-y-1">
          {alts.map((alt) => (
            <li key={alt.sourceUrl}>
              <button
                onClick={() => handlePick(alt)}
                className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left hover:bg-muted/20"
              >
                {alt.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={alt.thumbnail}
                    alt=""
                    className="h-7 w-12 shrink-0 rounded-sm object-cover"
                  />
                ) : (
                  <div className="h-7 w-12 shrink-0 rounded-sm bg-muted/20" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="truncate font-sans text-[11px] font-medium text-foreground">
                    {alt.title || "(untitled)"}
                  </div>
                  <div className="truncate font-sans text-[10px] text-muted-foreground">
                    {alt.channel || alt.artist}
                    {alt.duration > 0 && ` · ${formatDuration(alt.duration)}`}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}
