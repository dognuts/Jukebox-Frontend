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
  X,
  ChevronRight,
  Users,
} from "lucide-react"
import { useMicrophone } from "@/hooks/use-microphone"
import { parseTrackUrl, guessTitleFromUrl } from "@/lib/track-utils"
import type { APIQueueEntry } from "@/lib/api"

type RequestStatus = "open" | "paused" | "closed"

interface DjCockpitProps {
  djName: string
  djInitials: string
  requestStatus: RequestStatus
  onRequestStatusChange: (status: RequestStatus) => void
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
}

function formatMicTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, "0")}`
}

// Cockpit card — Option B of the DJ redesign. Replaces ListenerDjContext
// in its slot below the now-playing hero when the user is the host.
// Contains the full DJ control set: mic toggle with timer, policy chip,
// pending requests counter with slide-over, hype indicator, add track,
// end-set button. Visually continues the listener DJ-context card's
// amber-tinted card style so the transition feels native.
export function DjCockpit({
  djName,
  djInitials,
  requestStatus,
  onRequestStatusChange,
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
}: DjCockpitProps) {
  const mic = useMicrophone()
  const [micActive, setMicActive] = useState(false)
  const [micSeconds, setMicSeconds] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const [showPolicy, setShowPolicy] = useState(false)
  const [showRequests, setShowRequests] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
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
      setShowAdd(false)
    } catch {}
    setAddLoading(false)
  }, [trackUrl, onSubmitTrack])

  const HypeIcon = hypeScore >= 80 ? Flame : hypeScore >= 50 ? TrendingUp : Zap

  return (
    <>
      <div
        style={{
          paddingInline: "var(--space-lg)",
          paddingBottom: "var(--space-md)",
        }}
      >
        <div
          className="rounded-2xl"
          style={{
            padding: "var(--space-md)",
            background: "rgba(232,154,60,0.05)",
            border: "0.5px solid rgba(232,154,60,0.2)",
            boxShadow: "0 0 40px -20px rgba(232,154,60,0.25)",
          }}
        >
          {/* Top row: HOST label + listener count + hype + end-set */}
          <div
            className="flex items-center"
            style={{
              gap: "var(--space-sm)",
              marginBottom: "var(--space-md)",
            }}
          >
            <div
              className="flex items-center gap-1.5"
              style={{ flex: 1 }}
            >
              <div
                className="flex shrink-0 items-center justify-center rounded-full font-bold"
                style={{
                  width: "clamp(22px, 2.2vw, 28px)",
                  height: "clamp(22px, 2.2vw, 28px)",
                  background: "#e89a3c",
                  color: "#0d0b10",
                  fontSize: "var(--fs-meta)",
                }}
              >
                {djInitials}
              </div>
              <div className="flex min-w-0 flex-col">
                <div
                  className="truncate font-semibold"
                  style={{ color: "#f4b25c", fontSize: "var(--fs-small)" }}
                >
                  {djName}
                </div>
                <div
                  className="truncate uppercase tracking-[0.18em]"
                  style={{
                    color: "rgba(232,154,60,0.5)",
                    fontSize: "var(--fs-meta)",
                  }}
                >
                  Host cockpit
                </div>
              </div>
            </div>

            {/* Listener count */}
            <div
              className="flex items-center gap-1 rounded-full"
              style={{
                paddingInline: "var(--space-sm)",
                paddingBlock: "4px",
                fontSize: "var(--fs-meta)",
                background: "rgba(255,255,255,0.04)",
                border: "0.5px solid rgba(255,255,255,0.08)",
                color: "rgba(232,230,234,0.7)",
              }}
            >
              <Users className="h-3 w-3" />
              <span className="tabular-nums font-semibold">{listenerCount}</span>
            </div>

            {/* Hype chip */}
            <div
              className="flex items-center gap-1 rounded-full"
              style={{
                paddingInline: "var(--space-sm)",
                paddingBlock: "4px",
                fontSize: "var(--fs-meta)",
                background: `${hypeColor}20`,
                border: `0.5px solid ${hypeColor}50`,
                color: hypeColor,
              }}
              title="Room hype"
            >
              <HypeIcon className="h-3 w-3" />
              <span className="font-bold uppercase">{hypeLabel}</span>
            </div>
          </div>

          {/* Control row: mic (primary), policy, pending, add, end */}
          <div
            className="flex flex-wrap items-center"
            style={{ gap: "var(--space-sm)" }}
          >
            {/* Mic toggle — biggest control */}
            <button
              type="button"
              onClick={handleMicToggle}
              className="flex items-center gap-2 rounded-full font-semibold transition-colors"
              style={{
                paddingInline: "var(--space-md)",
                paddingBlock: "var(--space-sm)",
                fontSize: "var(--fs-small)",
                background: micActive
                  ? "rgba(232,115,74,0.22)"
                  : "rgba(232,154,60,0.14)",
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
                  <span className="tabular-nums opacity-70">
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

            {/* Policy */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPolicy((v) => !v)}
                className="flex items-center gap-1.5 rounded-full transition-colors hover:bg-white/[0.06]"
                style={{
                  paddingInline: "var(--space-sm)",
                  paddingBlock: "8px",
                  fontSize: "var(--fs-small)",
                  background: "rgba(255,255,255,0.04)",
                  border: "0.5px solid rgba(255,255,255,0.1)",
                  color: "rgba(232,230,234,0.7)",
                }}
              >
                {requestStatus === "open" && (
                  <Inbox className="h-3.5 w-3.5" style={{ color: "#e89a3c" }} />
                )}
                {requestStatus === "paused" && (
                  <PauseCircle className="h-3.5 w-3.5" style={{ color: "#d8c84a" }} />
                )}
                {requestStatus === "closed" && <XCircle className="h-3.5 w-3.5" />}
                {requestStatus === "open"
                  ? "Open"
                  : requestStatus === "paused"
                  ? "Approval"
                  : "Closed"}
              </button>
              {showPolicy && (
                <div
                  className="absolute left-0 top-full mt-2 z-20 flex flex-col overflow-hidden rounded-lg"
                  style={{
                    background: "rgba(15,12,20,0.98)",
                    border: "0.5px solid rgba(255,255,255,0.12)",
                    backdropFilter: "blur(12px)",
                    minWidth: "160px",
                  }}
                >
                  {(["open", "paused", "closed"] as RequestStatus[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        onRequestStatusChange(s)
                        setShowPolicy(false)
                      }}
                      className="text-left transition-colors hover:bg-white/[0.08]"
                      style={{
                        paddingInline: "var(--space-md)",
                        paddingBlock: "var(--space-sm)",
                        fontSize: "var(--fs-small)",
                        color:
                          requestStatus === s ? "#f4b25c" : "rgba(232,230,234,0.7)",
                      }}
                    >
                      {s === "open"
                        ? "Open requests"
                        : s === "paused"
                        ? "Require approval"
                        : "Closed"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Pending counter */}
            <button
              type="button"
              onClick={() => setShowRequests(true)}
              className="flex items-center gap-1.5 rounded-full transition-colors hover:bg-white/[0.06]"
              style={{
                paddingInline: "var(--space-sm)",
                paddingBlock: "8px",
                fontSize: "var(--fs-small)",
                background: "rgba(255,255,255,0.04)",
                border: "0.5px solid rgba(255,255,255,0.1)",
                color: "rgba(232,230,234,0.7)",
              }}
            >
              <Inbox className="h-3.5 w-3.5" />
              Queue
              {pendingRequests.length > 0 && (
                <span
                  className="tabular-nums font-bold"
                  style={{
                    paddingInline: "6px",
                    paddingBlock: "1px",
                    borderRadius: "999px",
                    fontSize: "var(--fs-meta)",
                    background: "#e89a3c",
                    color: "#0d0b10",
                  }}
                >
                  {pendingRequests.length}
                </span>
              )}
              <ChevronRight className="h-3 w-3 opacity-60" />
            </button>

            {/* Add */}
            <button
              type="button"
              onClick={() => setShowAdd((v) => !v)}
              className="flex items-center gap-1.5 rounded-full transition-colors hover:bg-white/[0.06]"
              style={{
                paddingInline: "var(--space-sm)",
                paddingBlock: "8px",
                fontSize: "var(--fs-small)",
                background: "rgba(255,255,255,0.04)",
                border: "0.5px solid rgba(255,255,255,0.1)",
                color: "rgba(232,230,234,0.7)",
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add track
            </button>

            <div className="ml-auto">
              {onEndRoom && (
                <button
                  type="button"
                  onClick={() => setShowEndConfirm(true)}
                  className="flex items-center gap-1.5 rounded-full"
                  style={{
                    paddingInline: "var(--space-sm)",
                    paddingBlock: "8px",
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
          </div>

          {/* Add track input — appears inside the card when toggled */}
          {showAdd && (
            <div
              className="flex items-center"
              style={{
                marginTop: "var(--space-sm)",
                gap: "var(--space-sm)",
              }}
            >
              <input
                type="text"
                value={trackUrl}
                onChange={(e) => setTrackUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddTrack()
                  if (e.key === "Escape") {
                    setShowAdd(false)
                    setTrackUrl("")
                  }
                }}
                placeholder="Paste YouTube or SoundCloud URL..."
                className="flex-1 rounded-full outline-none placeholder:text-[rgba(232,230,234,0.3)]"
                style={{
                  height: "36px",
                  paddingInline: "var(--space-md)",
                  fontSize: "var(--fs-small)",
                  background: "rgba(0,0,0,0.25)",
                  border: "0.5px solid rgba(255,255,255,0.1)",
                  color: "#e8e6ea",
                }}
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddTrack}
                disabled={addLoading || !trackUrl.trim()}
                className="rounded-full font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  paddingInline: "var(--space-md)",
                  paddingBlock: "8px",
                  fontSize: "var(--fs-small)",
                  background: "#e89a3c",
                  color: "#0d0b10",
                }}
              >
                {addLoading ? "Adding..." : "Add"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pending requests slide-over */}
      {showRequests && (
        <PendingRequestsSheet
          requests={pendingRequests}
          onApprove={onApprove}
          onReject={onReject}
          onClose={() => setShowRequests(false)}
        />
      )}

      {showEndConfirm && (
        <EndSetConfirm
          onConfirm={() => {
            onEndRoom?.()
            setShowEndConfirm(false)
          }}
          onCancel={() => setShowEndConfirm(false)}
        />
      )}
    </>
  )
}

function PendingRequestsSheet({
  requests,
  onApprove,
  onReject,
  onClose,
}: {
  requests: APIQueueEntry[]
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col"
        style={{
          background: "rgba(15,12,20,0.98)",
          borderLeft: "0.5px solid rgba(232,154,60,0.2)",
          backdropFilter: "blur(12px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between border-b"
          style={{
            paddingInline: "var(--space-lg)",
            paddingBlock: "var(--space-md)",
            borderColor: "rgba(255,255,255,0.06)",
          }}
        >
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4" style={{ color: "#e89a3c" }} />
            <h3
              className="font-semibold"
              style={{ color: "#e8e6ea", fontSize: "var(--fs-h2)" }}
            >
              Pending requests
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/[0.08]"
            style={{ color: "rgba(232,230,234,0.6)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className="flex flex-1 flex-col overflow-y-auto"
          style={{
            gap: "var(--space-sm)",
            paddingInline: "var(--space-lg)",
            paddingBlock: "var(--space-md)",
          }}
        >
          {requests.length === 0 ? (
            <div
              className="rounded-lg py-8 text-center"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "0.5px dashed rgba(255,255,255,0.1)",
                color: "rgba(232,230,234,0.4)",
                fontSize: "var(--fs-small)",
              }}
            >
              No pending requests
            </div>
          ) : (
            requests.map((req) => (
              <div
                key={req.id}
                className="flex items-center rounded-lg"
                style={{
                  gap: "var(--space-sm)",
                  paddingInline: "var(--space-md)",
                  paddingBlock: "var(--space-sm)",
                  background: "rgba(255,255,255,0.03)",
                  border: "0.5px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  className="shrink-0 rounded-md"
                  style={{
                    width: "36px",
                    height: "36px",
                    background:
                      req.track?.albumGradient || "rgba(255,255,255,0.08)",
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div
                    className="truncate font-medium"
                    style={{ color: "#e8e6ea", fontSize: "var(--fs-body)" }}
                  >
                    {req.track?.title || "Unknown track"}
                  </div>
                  <div
                    className="truncate"
                    style={{
                      color: "rgba(232,230,234,0.5)",
                      fontSize: "var(--fs-small)",
                    }}
                  >
                    {req.track?.artist || "Unknown artist"}
                    {req.submittedBy && ` · ${req.submittedBy}`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onApprove(req.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{
                    background: "rgba(93,202,135,0.15)",
                    border: "0.5px solid rgba(93,202,135,0.4)",
                    color: "#5dca87",
                  }}
                  aria-label="Approve"
                >
                  ✓
                </button>
                <button
                  type="button"
                  onClick={() => onReject(req.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{
                    background: "rgba(232,115,74,0.15)",
                    border: "0.5px solid rgba(232,115,74,0.4)",
                    color: "#ff8c66",
                  }}
                  aria-label="Reject"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function EndSetConfirm({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onCancel}
    >
      <div
        className="flex max-w-sm flex-col rounded-2xl"
        style={{
          paddingInline: "var(--space-xl)",
          paddingBlock: "var(--space-lg)",
          gap: "var(--space-md)",
          background: "rgba(20,15,25,0.98)",
          border: "0.5px solid rgba(232,115,74,0.3)",
          backdropFilter: "blur(12px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold" style={{ color: "#e8e6ea", fontSize: "var(--fs-display)" }}>
          End this set?
        </h3>
        <p style={{ color: "rgba(232,230,234,0.6)", fontSize: "var(--fs-body)" }}>
          Your listeners will be disconnected and the room will close.
        </p>
        <div className="flex justify-end" style={{ gap: "var(--space-sm)" }}>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full"
            style={{
              paddingInline: "var(--space-md)",
              paddingBlock: "var(--space-sm)",
              fontSize: "var(--fs-small)",
              background: "rgba(255,255,255,0.06)",
              border: "0.5px solid rgba(255,255,255,0.12)",
              color: "rgba(232,230,234,0.8)",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full font-bold"
            style={{
              paddingInline: "var(--space-md)",
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
    </div>
  )
}
