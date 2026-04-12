"use client"

import { type Track } from "@/lib/mock-data"

interface ListenerQueueProps {
  tracks: Track[]
  // First queued item is numbered as "2" in the mockup (the currently playing
  // track being #1). Caller can override if they want a different starting
  // index.
  startIndex?: number
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—:—"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function ListenerQueue({ tracks, startIndex = 2 }: ListenerQueueProps) {
  return (
    <div
      style={{
        paddingInline: "var(--space-lg)",
        paddingBottom: "var(--space-lg)",
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: "var(--space-sm)" }}
      >
        <div
          className="font-semibold"
          style={{
            color: "#e8e6ea",
            fontSize: "var(--fs-h2)",
          }}
        >
          Up next
        </div>
        <div
          style={{
            color: "rgba(232,230,234,0.3)",
            fontSize: "var(--fs-small)",
          }}
        >
          {tracks.length} {tracks.length === 1 ? "track" : "tracks"}
        </div>
      </div>

      {tracks.length === 0 ? (
        <div
          className="rounded-lg text-center"
          style={{
            paddingInline: "var(--space-md)",
            paddingBlock: "var(--space-md)",
            background: "rgba(255,255,255,0.02)",
            color: "rgba(232,230,234,0.35)",
            fontSize: "var(--fs-small)",
          }}
        >
          Queue is empty
        </div>
      ) : (
        <div
          className="flex flex-col gap-0.5 overflow-y-auto"
          style={{
            /* Show ~3 tracks then scroll. Each row is roughly 50-68px
               depending on viewport. 195px comfortably fits 3 rows with
               a sliver of the 4th peeking to hint at scrollability. */
            maxHeight: "195px",
          }}
        >
          {tracks.map((track, i) => (
            <div
              key={track.id ?? `${track.title}-${i}`}
              className="flex items-center rounded-lg"
              style={{
                gap: "var(--space-sm)",
                paddingInline: "var(--space-sm)",
                paddingBlock: "var(--space-sm)",
                background:
                  i === 0 ? "rgba(255,255,255,0.02)" : "transparent",
              }}
            >
              <span
                className="text-right tabular-nums"
                style={{
                  width: "1.25rem",
                  color: "rgba(232,230,234,0.25)",
                  fontSize: "var(--fs-small)",
                }}
              >
                {startIndex + i}
              </span>
              <div
                className="shrink-0 rounded-md"
                style={{
                  width: "clamp(32px, 3vw, 44px)",
                  height: "clamp(32px, 3vw, 44px)",
                  background:
                    track.albumGradient ||
                    "linear-gradient(135deg, #2a1a0a, #1a0d18)",
                }}
              />
              <div className="min-w-0 flex-1">
                <div
                  className="truncate font-medium"
                  style={{
                    color: "#e8e6ea",
                    fontSize: "var(--fs-body)",
                  }}
                >
                  {track.title || "Untitled"}
                </div>
                <div
                  className="truncate"
                  style={{
                    color: "rgba(232,230,234,0.4)",
                    fontSize: "var(--fs-small)",
                  }}
                >
                  {track.artist || "Unknown artist"}
                </div>
              </div>
              <div
                className="shrink-0 tabular-nums"
                style={{
                  color: "rgba(232,230,234,0.3)",
                  fontSize: "var(--fs-small)",
                }}
              >
                {formatDuration(track.duration)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
