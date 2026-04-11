"use client"

import Link from "next/link"
import { Heart, Plus, Zap, Mic } from "lucide-react"
import { soundcloudProfileUrl } from "@/lib/track-utils"

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
  // When the current track is hosted on SoundCloud, pass the track URL.
  // The component will link the title to the track and the artist name
  // to the user's profile, and render a "Listen on SoundCloud" badge
  // below the action buttons, per the SoundCloud API Terms of Use.
  soundCloudUrl?: string | null
  // When the current track is a YouTube video, pass isYouTube={true}
  // and a ytSlotRef callback. The component will render a 16:9 portal
  // target in place of the album-art square, and the parent-owned
  // AudioEngine will portal its iframe into that slot so the video
  // appears where the cover art normally does.
  isYouTube?: boolean
  ytSlotRef?: (el: HTMLDivElement | null) => void
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
  soundCloudUrl,
  isYouTube = false,
  ytSlotRef,
}: ListenerNowPlayingProps) {
  const pct =
    duration > 0
      ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
      : 0

  // SoundCloud attribution: link the title to the track URL and the
  // artist name to the uploader's profile URL, both required by the
  // SoundCloud API Terms of Use when displaying track metadata.
  const scProfileUrl = soundCloudUrl
    ? soundcloudProfileUrl(soundCloudUrl)
    : null

  return (
    <div
      className="relative"
      style={{
        paddingInline: "var(--space-lg)",
        paddingTop: "var(--space-xl)",
        paddingBottom: "var(--space-lg)",
      }}
    >
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
          {isYouTube ? (
            // YouTube portal target — the room page's AudioEngine
            // portal-mounts the <YouTubePlayer> (which creates the YT
            // iframe sized 100%/100%) into this div. 16:9 aspect ratio
            // so the iframe fills without letterboxing, and a slightly
            // larger height than the album-art square so the video
            // reads as a meaningful visual rather than a thumbnail.
            <div
              ref={ytSlotRef}
              className="relative shrink-0 overflow-hidden rounded-xl"
              style={{
                height: "clamp(100px, 12vw, 135px)",
                aspectRatio: "16 / 9",
                background: "#000",
                border: "1px solid rgba(232,154,60,0.18)",
                boxShadow:
                  "0 12px 32px -12px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.5) inset",
              }}
              aria-label="YouTube player"
            />
          ) : (
            // Standard album-art square for SoundCloud / MP3.
            <div
              className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl"
              style={{
                width: "clamp(88px, 10vw, 128px)",
                height: "clamp(88px, 10vw, 128px)",
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
          )}

          {/* Track info */}
          <div className="min-w-0 flex-1">
            <div
              className="uppercase tracking-[0.1em]"
              style={{
                marginBottom: "var(--space-2xs)",
                fontSize: "var(--fs-meta)",
                color: "rgba(232,230,234,0.35)",
              }}
            >
              Now playing
            </div>
            <div
              className="truncate font-bold leading-tight"
              style={{
                marginBottom: "var(--space-2xs)",
                fontSize: "var(--fs-display)",
                color: "#e8e6ea",
              }}
            >
              {soundCloudUrl ? (
                <a
                  href={soundCloudUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-[color:rgba(232,154,60,1)]"
                  style={{ color: "inherit" }}
                >
                  {trackTitle}
                </a>
              ) : (
                trackTitle
              )}
            </div>
            <div
              className="truncate"
              style={{
                marginBottom: "var(--space-sm)",
                fontSize: "var(--fs-body)",
                color: "rgba(232,230,234,0.5)",
              }}
            >
              {scProfileUrl ? (
                <a
                  href={scProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:underline"
                  style={{ color: "inherit" }}
                >
                  {trackArtist}
                </a>
              ) : (
                trackArtist
              )}
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

        {/* SoundCloud attribution badge — required by the SoundCloud
            API Terms of Use when displaying streamed track metadata.
            Links out to the track URL on soundcloud.com. */}
        {soundCloudUrl && (
          <a
            href={soundCloudUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-sans text-[11px] font-semibold transition-all hover:scale-[1.02]"
            style={{
              background: "rgba(15,8,3,0.6)",
              border: "0.5px solid rgba(232,115,74,0.35)",
              color: "#f4b25c",
            }}
            aria-label="Listen on SoundCloud"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M11.56 8.87V17h8.76c1.85-.13 2.68-1.27 2.68-2.5 0-1.62-1.13-2.5-2.56-2.5-.33 0-.56.05-.83.16C19.3 10.09 17.58 8.5 15.5 8.5c-.71 0-1.39.17-1.98.5-.16.08-.25.18-.25.38v-.01H13v.03c-.15-.07-.39-.13-.6-.13-.63 0-1.14.47-1.14 1.09v.28c-.34-.55-.93-.87-1.6-.87H11.56zm-1.59 1.5V17H8.89v-5.3c0-.37.3-.65.63-.65.36 0 .64.28.64.65v-.33h.01zm-2.13.74V17H6.75v-4.8c0-.35.28-.66.56-.66.31 0 .53.3.53.66v-.09zm-2.13.74V17H4.62v-3.76c0-.31.26-.54.5-.54.27 0 .59.23.59.54v-.17zm-2.13.62V17h-1.1v-3.14c0-.27.22-.5.55-.5.31 0 .55.22.55.5v-.03zM1.45 13.3V17H.34v-2.4c0-.53.48-.6.48-.6s.42.03.63.3z" />
            </svg>
            Listen on SoundCloud
          </a>
        )}
      </div>
    </div>
  )
}
