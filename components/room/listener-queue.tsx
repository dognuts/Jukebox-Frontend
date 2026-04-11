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
    <div className="flex-1 px-6 pb-6">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="text-[13px] font-semibold" style={{ color: "#e8e6ea" }}>
          Up next
        </div>
        <div
          className="text-[11px]"
          style={{ color: "rgba(232,230,234,0.3)" }}
        >
          {tracks.length} {tracks.length === 1 ? "track" : "tracks"}
        </div>
      </div>

      {tracks.length === 0 ? (
        <div
          className="rounded-lg px-3 py-4 text-center text-[11px]"
          style={{
            background: "rgba(255,255,255,0.02)",
            color: "rgba(232,230,234,0.35)",
          }}
        >
          Queue is empty
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {tracks.slice(0, 12).map((track, i) => (
            <div
              key={track.id ?? `${track.title}-${i}`}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2"
              style={{
                background:
                  i === 0 ? "rgba(255,255,255,0.02)" : "transparent",
              }}
            >
              <span
                className="w-4 text-right text-[11px] tabular-nums"
                style={{ color: "rgba(232,230,234,0.2)" }}
              >
                {startIndex + i}
              </span>
              <div
                className="h-8 w-8 shrink-0 rounded-md"
                style={{
                  background:
                    track.albumGradient ||
                    "linear-gradient(135deg, #2a1a0a, #1a0d18)",
                }}
              />
              <div className="min-w-0 flex-1">
                <div
                  className="truncate text-xs font-medium"
                  style={{ color: "#e8e6ea" }}
                >
                  {track.title || "Untitled"}
                </div>
                <div
                  className="truncate text-[10px]"
                  style={{ color: "rgba(232,230,234,0.4)" }}
                >
                  {track.artist || "Unknown artist"}
                </div>
              </div>
              <div
                className="shrink-0 text-[10px] tabular-nums"
                style={{ color: "rgba(232,230,234,0.25)" }}
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
