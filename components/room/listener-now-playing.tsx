"use client"

import { Heart, Plus, Zap, Mic } from "lucide-react"

interface ListenerNowPlayingProps {
  djName: string
  djSubtitle: string
  djInitials: string
  trackTitle: string
  trackArtist: string
  currentTime: number
  duration: number
  isPlaying: boolean
  djSpeaking?: boolean
  onSave?: () => void
  onRequest?: () => void
  onSendNeon?: () => void
  requestDisabled?: boolean
  sendNeonDisabled?: boolean
  albumArtUrl?: string | null
  albumGradient?: string
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function ListenerNowPlaying({
  djName,
  djSubtitle,
  djInitials,
  trackTitle,
  trackArtist,
  currentTime,
  duration,
  isPlaying,
  djSpeaking = false,
  onSave,
  onRequest,
  onSendNeon,
  requestDisabled = false,
  sendNeonDisabled = false,
  albumArtUrl,
  albumGradient,
}: ListenerNowPlayingProps) {
  const pct =
    duration > 0
      ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
      : 0

  return (
    <div className="relative px-6 pb-6 pt-8 sm:px-6">
      {/* Ambient amber wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 30% 40%, rgba(60,30,12,0.4) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-[1]">
        {/* DJ info */}
        <div className="mb-5 flex items-center gap-2">
          <div
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
            style={{ background: "#e89a3c", color: "#0d0b10" }}
          >
            {djInitials}
          </div>
          <div className="min-w-0">
            <div
              className="truncate text-xs font-semibold"
              style={{ color: "#e8e6ea" }}
            >
              {djName}
            </div>
            <div
              className="truncate text-[10px]"
              style={{ color: "rgba(232,230,234,0.35)" }}
            >
              {djSubtitle}
            </div>
          </div>
          {djSpeaking && (
            <div
              className="ml-auto flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold"
              style={{
                background: "rgba(232,115,74,0.12)",
                border: "0.5px solid rgba(232,115,74,0.3)",
                color: "#e8734a",
                animation: "listener-reaction-pulse 2s ease-in-out infinite",
              }}
            >
              <Mic className="h-3 w-3" />
              On mic
            </div>
          )}
        </div>

        {/* Track display */}
        <div className="flex items-center gap-5">
          {/* Album art */}
          <div
            className="relative flex h-[100px] w-[100px] shrink-0 items-center justify-center overflow-hidden rounded-xl"
            style={{
              background: albumArtUrl
                ? `url(${albumArtUrl}) center/cover no-repeat`
                : albumGradient ||
                  "linear-gradient(135deg, #3d2b1a 0%, #1a1225 100%)",
            }}
          >
            {!albumArtUrl && (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{ border: "3px solid rgba(232,154,60,0.2)" }}
              >
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ background: "rgba(232,154,60,0.4)" }}
                />
              </div>
            )}
          </div>

          {/* Track info */}
          <div className="min-w-0 flex-1">
            <div
              className="mb-1 text-[11px] uppercase tracking-[0.1em]"
              style={{ color: "rgba(232,230,234,0.35)" }}
            >
              Now playing
            </div>
            <div
              className="mb-1 truncate text-[22px] font-bold leading-tight"
              style={{ color: "#e8e6ea" }}
            >
              {trackTitle}
            </div>
            <div
              className="mb-3 truncate text-[15px]"
              style={{ color: "rgba(232,230,234,0.5)" }}
            >
              {trackArtist}
            </div>

            {/* EQ bars */}
            <div
              aria-hidden="true"
              className="flex h-6 items-end gap-[3px]"
              style={{ opacity: isPlaying ? 1 : 0.35 }}
            >
              {[
                { anim: "listener-eq-1 0.8s", delay: "0s" },
                { anim: "listener-eq-2 0.6s", delay: "0.1s" },
                { anim: "listener-eq-3 0.7s", delay: "0.2s" },
                { anim: "listener-eq-1 0.9s", delay: "0.15s" },
                { anim: "listener-eq-2 0.75s", delay: "0.3s" },
              ].map((bar, i) => (
                <span
                  key={i}
                  className="inline-block w-[3px] rounded-sm"
                  style={{
                    background: "#e89a3c",
                    animation: isPlaying
                      ? `${bar.anim} ease-in-out infinite ${bar.delay}`
                      : "none",
                    height: "8px",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div
            className="relative h-[3px] overflow-hidden rounded"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded transition-[width] duration-500 ease-linear"
              style={{ width: `${pct}%`, background: "#e89a3c" }}
            />
          </div>
          <div className="mt-1 flex justify-between">
            <span
              className="text-[10px] tabular-nums"
              style={{ color: "rgba(232,230,234,0.3)" }}
            >
              {formatTime(currentTime)}
            </span>
            <span
              className="text-[10px] tabular-nums"
              style={{ color: "rgba(232,230,234,0.3)" }}
            >
              {duration > 0 ? formatTime(duration) : "—:—"}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSave}
            className="flex items-center gap-[5px] rounded-2xl px-4 py-[7px] text-xs transition-colors hover:bg-white/[0.06]"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "0.5px solid rgba(255,255,255,0.08)",
              color: "rgba(232,230,234,0.6)",
            }}
          >
            <Heart className="h-3.5 w-3.5" />
            Save
          </button>
          <button
            type="button"
            onClick={onRequest}
            disabled={requestDisabled}
            className="flex items-center gap-[5px] rounded-2xl px-4 py-[7px] text-xs transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "0.5px solid rgba(255,255,255,0.08)",
              color: "rgba(232,230,234,0.6)",
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Request
          </button>
          {onSendNeon && (
            <button
              type="button"
              onClick={onSendNeon}
              disabled={sendNeonDisabled}
              className="flex items-center gap-[5px] rounded-2xl px-4 py-[7px] text-xs transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                background: "rgba(232,154,60,0.06)",
                border: "0.5px solid rgba(232,154,60,0.2)",
                color: "#e89a3c",
              }}
            >
              <Zap className="h-3.5 w-3.5" />
              Send Neon
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
