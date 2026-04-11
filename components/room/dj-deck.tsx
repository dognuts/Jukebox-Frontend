"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import {
  Mic,
  MicOff,
  Inbox,
  PauseCircle,
  XCircle,
  Power,
  Plus,
  Flame,
  TrendingUp,
  Zap,
  MessageCircle,
  Users,
  Play as PlayIcon,
  Pause as PauseIcon,
  SkipForward,
} from "lucide-react"
import { useMicrophone } from "@/hooks/use-microphone"
import { parseTrackUrl, guessTitleFromUrl } from "@/lib/track-utils"
import type { APIQueueEntry } from "@/lib/api"

type RequestStatus = "open" | "paused" | "closed"

interface DjDeckProps {
  djName: string
  djInitials: string
  requestStatus: RequestStatus
  onRequestStatusChange: (status: RequestStatus) => void
  audioPlaying: boolean
  onTogglePlay: () => void
  onSkip: () => void
  onMicChange: (active: boolean, pauseMusic: boolean, deviceId?: string) => void
  onSubmitTrack: (track: { title: string; artist: string; duration: number; source: string; sourceUrl: string }) => void
  onEndRoom?: () => void
  listenerCount: number
  pendingRequests: APIQueueEntry[]
  onApprove: (id: string) => void
  onReject: (id: string) => void
  hypeScore: number
  hypeLabel: string
  hypeColor: string
  recentTips: number
  recentChats: number
  recentReactions: number
}

function formatMicTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, "0")}`
}

// DjDeck — Option D of the DJ redesign. A dedicated third column on
// the right of the room page (chat becomes middle column, main content
// stays on the left). Contains every host-side control: DJ header,
// transport, mic, policy, add track, hype meter + activity breakdown,
// pending requests list, and end set button.
export function DjDeck({
  djName,
  djInitials,
  requestStatus,
  onRequestStatusChange,
  audioPlaying,
  onTogglePlay,
  onSkip,
  onMicChange,
  onSubmitTrack,
  onEndRoom,
  listenerCount,
  pendingRequests,
  onApprove,
  onReject,
  hypeScore,
  hypeLabel,
  hypeColor,
  recentTips,
  recentChats,
  recentReactions,
}: DjDeckProps) {
  const mic = useMicrophone()
  const [micActive, setMicActive] = useState(false)
  const [micSeconds, setMicSeconds] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const [trackUrl, setTrackUrl] = useState("")
  const [addLoading, setAddLoading] = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)

  useEffect(() => {
    if (micActive) {
      timerRef.current = setInterval(() => setMicSeconds((s) => s + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      setMicSeconds(0)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [micActive])

  const handleMicToggle = useCallback(async () => {
    if (micActive) {
      mic.stop()
      setMicActive(false)
      onMicChange(false, true)
      return
    }
    const ok = await mic.start()
    if (ok) {
      mic.stop()
      setMicActive(true)
      onMicChange(true, true, mic.selectedDeviceId || undefined)
    }
  }, [micActive, mic, onMicChange])

  const handleAddTrack = useCallback(async () => {
    if (!trackUrl.trim()) return
    const parsed = parseTrackUrl(trackUrl)
    if (!parsed) return
    setAddLoading(true)
    try {
      let title = guessTitleFromUrl(trackUrl)
      let artist = "Unknown Artist"
      if (parsed.source === "youtube" || parsed.source === "soundcloud") {
        try {
          const res = await fetch(
            `https://noembed.com/embed?url=${encodeURIComponent(parsed.sourceUrl)}`
          )
          if (res.ok) {
            const data = await res.json()
            if (data.title) {
              const parts = data.title.split(" - ")
              if (parts.length >= 2) {
                artist = parts[0].trim()
                title = parts.slice(1).join(" - ").trim()
              } else {
                title = data.title
                artist = data.author_name || "Unknown Artist"
              }
            }
          }
        } catch {}
      }
      onSubmitTrack({ title, artist, duration: 0, source: parsed.source, sourceUrl: parsed.sourceUrl })
      setTrackUrl("")
    } catch {}
    setAddLoading(false)
  }, [trackUrl, onSubmitTrack])

  const HypeIcon = hypeScore >= 80 ? Flame : hypeScore >= 50 ? TrendingUp : Zap

  return (
    <div
      className="flex flex-col border-t border-white/[0.06] md:border-t-0 md:border-l"
      style={{
        background: "rgba(255,255,255,0.012)",
        borderColor: "rgba(255,255,255,0.06)",
      }}
    >
      {/* Deck header */}
      <div
        className="flex items-center border-b"
        style={{
          paddingInline: "var(--space-md)",
          paddingBlock: "var(--space-sm)",
          gap: "var(--space-sm)",
          borderColor: "rgba(255,255,255,0.06)",
        }}
      >
        <div
          className="flex shrink-0 items-center justify-center rounded-full font-bold"
          style={{
            width: "clamp(26px, 2.5vw, 32px)",
            height: "clamp(26px, 2.5vw, 32px)",
            background: "#e89a3c",
            color: "#0d0b10",
            fontSize: "var(--fs-meta)",
          }}
        >
          {djInitials}
        </div>
        <div className="min-w-0 flex-1">
          <div
            className="truncate font-semibold"
            style={{ color: "#e8e6ea", fontSize: "var(--fs-small)" }}
          >
            {djName}
          </div>
          <div
            className="uppercase tracking-[0.18em]"
            style={{
              color: "rgba(232,154,60,0.65)",
              fontSize: "var(--fs-meta)",
            }}
          >
            Host deck
          </div>
        </div>
        <div
          className="flex items-center gap-1 rounded-full"
          style={{
            paddingInline: "var(--space-sm)",
            paddingBlock: "3px",
            fontSize: "var(--fs-meta)",
            background: "rgba(255,255,255,0.04)",
            border: "0.5px solid rgba(255,255,255,0.08)",
            color: "rgba(232,230,234,0.7)",
          }}
        >
          <Users className="h-3 w-3" />
          <span className="tabular-nums font-semibold">{listenerCount}</span>
        </div>
      </div>

      {/* Scrollable body */}
      <div
        className="flex flex-1 flex-col overflow-y-auto"
        style={{
          gap: "var(--space-md)",
          padding: "var(--space-md)",
        }}
      >
        {/* Transport */}
        <Section label="Transport">
          <div className="flex items-center" style={{ gap: "var(--space-sm)" }}>
            <button
              type="button"
              onClick={onTogglePlay}
              className="flex items-center justify-center rounded-full"
              style={{
                width: "44px",
                height: "44px",
                background: "#e89a3c",
                color: "#0d0b10",
                boxShadow: "0 6px 18px -4px rgba(232,154,60,0.5)",
              }}
              aria-label={audioPlaying ? "Pause" : "Play"}
            >
              {audioPlaying ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="flex items-center justify-center rounded-full"
              style={{
                width: "36px",
                height: "36px",
                background: "rgba(255,255,255,0.04)",
                border: "0.5px solid rgba(255,255,255,0.1)",
                color: "rgba(232,230,234,0.7)",
              }}
              aria-label="Skip"
            >
              <SkipForward className="h-4 w-4" />
            </button>
            <div
              className="ml-auto tabular-nums"
              style={{
                fontSize: "var(--fs-small)",
                color: "rgba(232,230,234,0.5)",
              }}
            >
              {audioPlaying ? "Playing" : "Paused"}
            </div>
          </div>
        </Section>

        {/* Mic */}
        <Section label="Microphone">
          <button
            type="button"
            onClick={handleMicToggle}
            className="flex w-full items-center gap-2 rounded-xl font-semibold transition-colors"
            style={{
              paddingInline: "var(--space-md)",
              paddingBlock: "var(--space-sm)",
              fontSize: "var(--fs-small)",
              background: micActive ? "rgba(232,115,74,0.2)" : "rgba(232,154,60,0.12)",
              border: micActive
                ? "0.5px solid rgba(232,115,74,0.55)"
                : "0.5px solid rgba(232,154,60,0.4)",
              color: micActive ? "#ffa27a" : "#f4b25c",
            }}
          >
            {micActive ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                    style={{ background: "#ff5a3a" }}
                  />
                  <span
                    className="relative inline-flex h-2 w-2 rounded-full"
                    style={{ background: "#ff5a3a" }}
                  />
                </span>
                On air
                <span className="ml-auto tabular-nums opacity-70">
                  {formatMicTime(micSeconds)}
                </span>
              </>
            ) : (
              <>
                <MicOff className="h-3.5 w-3.5" />
                Go on mic
              </>
            )}
          </button>
        </Section>

        {/* Policy */}
        <Section label="Request policy">
          <div className="flex" style={{ gap: "var(--space-2xs)" }}>
            {(["open", "paused", "closed"] as RequestStatus[]).map((s) => {
              const icon =
                s === "open" ? (
                  <Inbox className="h-3 w-3" />
                ) : s === "paused" ? (
                  <PauseCircle className="h-3 w-3" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )
              const label = s === "open" ? "Open" : s === "paused" ? "Approval" : "Closed"
              const active = requestStatus === s
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => onRequestStatusChange(s)}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg"
                  style={{
                    paddingBlock: "var(--space-sm)",
                    fontSize: "var(--fs-meta)",
                    background: active
                      ? "rgba(232,154,60,0.14)"
                      : "rgba(255,255,255,0.04)",
                    border: active
                      ? "0.5px solid rgba(232,154,60,0.4)"
                      : "0.5px solid rgba(255,255,255,0.08)",
                    color: active ? "#f4b25c" : "rgba(232,230,234,0.55)",
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  {icon}
                  {label}
                </button>
              )
            })}
          </div>
        </Section>

        {/* Add track */}
        <Section label="Add track">
          <div className="flex flex-col" style={{ gap: "var(--space-sm)" }}>
            <input
              type="text"
              value={trackUrl}
              onChange={(e) => setTrackUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddTrack()
              }}
              placeholder="Paste URL..."
              className="rounded-lg outline-none placeholder:text-[rgba(232,230,234,0.3)]"
              style={{
                paddingInline: "var(--space-sm)",
                paddingBlock: "var(--space-sm)",
                fontSize: "var(--fs-small)",
                background: "rgba(0,0,0,0.3)",
                border: "0.5px solid rgba(255,255,255,0.1)",
                color: "#e8e6ea",
              }}
            />
            <button
              type="button"
              onClick={handleAddTrack}
              disabled={addLoading || !trackUrl.trim()}
              className="rounded-full font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                paddingBlock: "var(--space-sm)",
                fontSize: "var(--fs-small)",
                background: "#e89a3c",
                color: "#0d0b10",
              }}
            >
              {addLoading ? "Adding..." : "Add to queue"}
            </button>
          </div>
        </Section>

        {/* Hype meter */}
        <Section label="Room hype">
          <div
            className="rounded-xl"
            style={{
              padding: "var(--space-sm)",
              background: `${hypeColor}15`,
              border: `0.5px solid ${hypeColor}45`,
            }}
          >
            <div className="flex items-center justify-between">
              <div
                className="flex items-center gap-1.5"
                style={{ color: hypeColor, fontSize: "var(--fs-small)" }}
              >
                <HypeIcon className="h-3.5 w-3.5" />
                <span className="font-bold uppercase">{hypeLabel}</span>
              </div>
              <div
                className="tabular-nums font-bold"
                style={{ color: hypeColor, fontSize: "var(--fs-display)", lineHeight: 1 }}
              >
                {hypeScore}
              </div>
            </div>
            <div
              className="mt-2 h-1.5 overflow-hidden rounded-full"
              style={{ background: "rgba(0,0,0,0.3)" }}
            >
              <div
                className="h-full transition-[width] duration-700"
                style={{
                  width: `${hypeScore}%`,
                  background: hypeColor,
                }}
              />
            </div>
            <div
              className="mt-2 flex justify-between"
              style={{
                fontSize: "var(--fs-meta)",
                color: "rgba(232,230,234,0.5)",
              }}
            >
              <span className="flex items-center gap-1">
                <Zap className="h-2.5 w-2.5" /> {recentTips}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-2.5 w-2.5" /> {recentChats}
              </span>
              <span className="flex items-center gap-1">
                <Flame className="h-2.5 w-2.5" /> {recentReactions}
              </span>
            </div>
          </div>
        </Section>

        {/* Pending requests */}
        <Section
          label={`Pending requests${pendingRequests.length > 0 ? ` · ${pendingRequests.length}` : ""}`}
        >
          {pendingRequests.length === 0 ? (
            <div
              className="rounded-lg py-4 text-center"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "0.5px dashed rgba(255,255,255,0.1)",
                color: "rgba(232,230,234,0.4)",
                fontSize: "var(--fs-small)",
              }}
            >
              None right now
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: "var(--space-xs)" }}>
              {pendingRequests.slice(0, 6).map((req) => (
                <div
                  key={req.id}
                  className="flex items-center rounded-lg"
                  style={{
                    gap: "var(--space-sm)",
                    paddingInline: "var(--space-sm)",
                    paddingBlock: "var(--space-sm)",
                    background: "rgba(255,255,255,0.03)",
                    border: "0.5px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    className="shrink-0 rounded-md"
                    style={{
                      width: "28px",
                      height: "28px",
                      background:
                        req.track?.albumGradient || "rgba(255,255,255,0.08)",
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div
                      className="truncate font-medium"
                      style={{ color: "#e8e6ea", fontSize: "var(--fs-small)" }}
                    >
                      {req.track?.title || "Unknown"}
                    </div>
                    <div
                      className="truncate"
                      style={{
                        color: "rgba(232,230,234,0.5)",
                        fontSize: "var(--fs-meta)",
                      }}
                    >
                      {req.track?.artist || "—"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onApprove(req.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-full"
                    style={{
                      background: "rgba(93,202,135,0.15)",
                      border: "0.5px solid rgba(93,202,135,0.4)",
                      color: "#5dca87",
                      fontSize: "var(--fs-meta)",
                    }}
                    aria-label="Approve"
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => onReject(req.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-full"
                    style={{
                      background: "rgba(232,115,74,0.15)",
                      border: "0.5px solid rgba(232,115,74,0.4)",
                      color: "#ff8c66",
                      fontSize: "var(--fs-meta)",
                    }}
                    aria-label="Reject"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* End set — pinned to the bottom */}
      {onEndRoom && (
        <div
          className="border-t"
          style={{
            padding: "var(--space-md)",
            borderColor: "rgba(255,255,255,0.06)",
          }}
        >
          {showEndConfirm ? (
            <div
              className="rounded-lg"
              style={{
                padding: "var(--space-sm)",
                background: "rgba(232,115,74,0.08)",
                border: "0.5px solid rgba(232,115,74,0.35)",
              }}
            >
              <div
                className="mb-2"
                style={{
                  fontSize: "var(--fs-small)",
                  color: "rgba(232,230,234,0.8)",
                }}
              >
                End this set?
              </div>
              <div className="flex" style={{ gap: "var(--space-xs)" }}>
                <button
                  type="button"
                  onClick={() => setShowEndConfirm(false)}
                  className="flex-1 rounded-full"
                  style={{
                    paddingBlock: "var(--space-sm)",
                    fontSize: "var(--fs-small)",
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(232,230,234,0.8)",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onEndRoom()
                    setShowEndConfirm(false)
                  }}
                  className="flex-1 rounded-full font-bold"
                  style={{
                    paddingBlock: "var(--space-sm)",
                    fontSize: "var(--fs-small)",
                    background: "#ff5a3a",
                    color: "#fff",
                  }}
                >
                  End set
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowEndConfirm(true)}
              className="flex w-full items-center justify-center gap-2 rounded-full"
              style={{
                paddingBlock: "var(--space-sm)",
                fontSize: "var(--fs-small)",
                background: "rgba(232,115,74,0.08)",
                border: "0.5px solid rgba(232,115,74,0.3)",
                color: "#ff8c66",
              }}
            >
              <Power className="h-3.5 w-3.5" />
              End set
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Section({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col" style={{ gap: "var(--space-sm)" }}>
      <div
        className="uppercase tracking-[0.16em]"
        style={{
          fontSize: "var(--fs-meta)",
          color: "rgba(232,230,234,0.4)",
        }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}
