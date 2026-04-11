"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import type { ForwardedRef } from "react"
import {
  Mic,
  MicOff,
  MessageCircle,
  Sliders,
  Inbox,
  Flame,
  PauseCircle,
  XCircle,
  Power,
  Plus,
  TrendingUp,
  Zap,
  Users,
  Play as PlayIcon,
  Pause as PauseIcon,
  SkipForward,
} from "lucide-react"
import { useMicrophone } from "@/hooks/use-microphone"
import { parseTrackUrl, guessTitleFromUrl } from "@/lib/track-utils"
import type { APIQueueEntry } from "@/lib/api"
import type { ChatMessage } from "@/lib/mock-data"
import type { ListenerInfo } from "@/hooks/use-room-websocket"
import { ListenerChatColumn } from "@/components/room/listener-chat-column"

type RequestStatus = "open" | "paused" | "closed"
type Tab = "chat" | "controls" | "requests" | "stats"

interface DjRightColumnProps {
  // Chat props — passed straight through to ListenerChatColumn
  messages: ChatMessage[]
  listeners: ListenerInfo[]
  listenerCount: number
  onSendMessage?: (message: string) => void
  onSendReaction?: (emoji: string) => void
  connected: boolean
  djName: string
  overlayRef?: React.RefObject<HTMLDivElement | null>
  // DJ controls
  requestStatus: RequestStatus
  onRequestStatusChange: (status: RequestStatus) => void
  audioPlaying: boolean
  onTogglePlay: () => void
  onSkip: () => void
  onMicChange: (active: boolean, pauseMusic: boolean, deviceId?: string) => void
  onSubmitTrack: (track: { title: string; artist: string; duration: number; source: string; sourceUrl: string }) => void
  onEndRoom?: () => void
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

// DJ right column — Option C of the DJ redesign. Replaces
// ListenerChatColumn with a tab container: Chat / Controls / Requests
// / Stats. DJs default to Controls so the critical host surface is
// visible at login, and can peek at chat with one click.
export function DjRightColumn({
  messages,
  listeners,
  listenerCount,
  onSendMessage,
  onSendReaction,
  connected,
  djName,
  overlayRef,
  requestStatus,
  onRequestStatusChange,
  audioPlaying,
  onTogglePlay,
  onSkip,
  onMicChange,
  onSubmitTrack,
  onEndRoom,
  pendingRequests,
  onApprove,
  onReject,
  hypeScore,
  hypeLabel,
  hypeColor,
  recentTips,
  recentChats,
  recentReactions,
}: DjRightColumnProps) {
  const [tab, setTab] = useState<Tab>("controls")

  return (
    <div
      className="flex flex-col border-t border-white/[0.06] md:border-t-0"
      style={{
        background: "rgba(255,255,255,0.01)",
        minHeight: "400px",
      }}
    >
      {/* Tab bar */}
      <div
        className="flex items-center"
        style={{
          paddingInline: "var(--space-sm)",
          paddingTop: "var(--space-sm)",
          paddingBottom: "0",
          gap: "var(--space-2xs)",
          borderBottom: "0.5px solid rgba(255,255,255,0.06)",
        }}
      >
        <TabBtn
          icon={<Sliders className="h-3.5 w-3.5" />}
          label="Controls"
          active={tab === "controls"}
          onClick={() => setTab("controls")}
        />
        <TabBtn
          icon={<MessageCircle className="h-3.5 w-3.5" />}
          label="Chat"
          active={tab === "chat"}
          onClick={() => setTab("chat")}
          badge={messages.length}
        />
        <TabBtn
          icon={<Inbox className="h-3.5 w-3.5" />}
          label="Requests"
          active={tab === "requests"}
          onClick={() => setTab("requests")}
          badge={pendingRequests.length}
          badgeColor="#e89a3c"
        />
        <TabBtn
          icon={<Flame className="h-3.5 w-3.5" />}
          label="Stats"
          active={tab === "stats"}
          onClick={() => setTab("stats")}
        />
      </div>

      {/* Tab content — each tab owns its own scroll region */}
      <div className="flex min-h-0 flex-1 flex-col">
        {tab === "chat" && (
          <div className="flex min-h-0 flex-1 flex-col">
            <ListenerChatColumn
              messages={messages}
              listeners={listeners}
              listenerCount={listenerCount}
              onSendMessage={onSendMessage}
              onSendReaction={onSendReaction}
              connected={connected}
              djName={djName}
              overlayRef={overlayRef}
            />
          </div>
        )}

        {tab === "controls" && (
          <ControlsPanel
            requestStatus={requestStatus}
            onRequestStatusChange={onRequestStatusChange}
            audioPlaying={audioPlaying}
            onTogglePlay={onTogglePlay}
            onSkip={onSkip}
            onMicChange={onMicChange}
            onSubmitTrack={onSubmitTrack}
            onEndRoom={onEndRoom}
            listenerCount={listenerCount}
            hypeColor={hypeColor}
            hypeLabel={hypeLabel}
            hypeScore={hypeScore}
          />
        )}

        {tab === "requests" && (
          <RequestsPanel
            requests={pendingRequests}
            onApprove={onApprove}
            onReject={onReject}
          />
        )}

        {tab === "stats" && (
          <StatsPanel
            recentTips={recentTips}
            recentChats={recentChats}
            recentReactions={recentReactions}
            hypeScore={hypeScore}
            hypeLabel={hypeLabel}
            hypeColor={hypeColor}
            listenerCount={listenerCount}
          />
        )}
      </div>
    </div>
  )
}

function TabBtn({
  icon,
  label,
  active,
  onClick,
  badge,
  badgeColor = "rgba(232,230,234,0.3)",
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
  badge?: number
  badgeColor?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 items-center justify-center gap-1 rounded-t-md transition-colors"
      style={{
        paddingInline: "var(--space-sm)",
        paddingBlock: "var(--space-sm)",
        fontSize: "var(--fs-small)",
        background: active ? "rgba(232,154,60,0.08)" : "transparent",
        borderBottom: active
          ? "1px solid #e89a3c"
          : "1px solid transparent",
        color: active ? "#f4b25c" : "rgba(232,230,234,0.55)",
        fontWeight: active ? 600 : 500,
      }}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className="tabular-nums font-bold"
          style={{
            paddingInline: "5px",
            paddingBlock: "1px",
            borderRadius: "999px",
            fontSize: "var(--fs-meta)",
            background: badgeColor,
            color: badgeColor.startsWith("rgba") ? "#0d0b10" : "#0d0b10",
          }}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  )
}

function ControlsPanel({
  requestStatus,
  onRequestStatusChange,
  audioPlaying,
  onTogglePlay,
  onSkip,
  onMicChange,
  onSubmitTrack,
  onEndRoom,
  listenerCount,
  hypeColor,
  hypeLabel,
  hypeScore,
}: {
  requestStatus: RequestStatus
  onRequestStatusChange: (status: RequestStatus) => void
  audioPlaying: boolean
  onTogglePlay: () => void
  onSkip: () => void
  onMicChange: (active: boolean, pauseMusic: boolean, deviceId?: string) => void
  onSubmitTrack: (track: { title: string; artist: string; duration: number; source: string; sourceUrl: string }) => void
  onEndRoom?: () => void
  listenerCount: number
  hypeColor: string
  hypeLabel: string
  hypeScore: number
}) {
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

  return (
    <div
      className="flex flex-1 flex-col overflow-y-auto"
      style={{
        gap: "var(--space-md)",
        padding: "var(--space-md)",
      }}
    >
      {/* Transport */}
      <div className="flex flex-col" style={{ gap: "var(--space-sm)" }}>
        <Label>Transport</Label>
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
            className="tabular-nums"
            style={{
              marginLeft: "auto",
              fontSize: "var(--fs-small)",
              color: "rgba(232,230,234,0.5)",
            }}
          >
            {audioPlaying ? "Playing" : "Paused"}
          </div>
        </div>
      </div>

      {/* Mic */}
      <div className="flex flex-col" style={{ gap: "var(--space-sm)" }}>
        <Label>Microphone</Label>
        <button
          type="button"
          onClick={handleMicToggle}
          className="flex items-center gap-2 rounded-xl font-semibold transition-colors"
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
      </div>

      {/* Request policy */}
      <div className="flex flex-col" style={{ gap: "var(--space-sm)" }}>
        <Label>Request policy</Label>
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
                  background: active ? "rgba(232,154,60,0.14)" : "rgba(255,255,255,0.04)",
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
      </div>

      {/* Add track */}
      <div className="flex flex-col" style={{ gap: "var(--space-sm)" }}>
        <Label>Add track</Label>
        <input
          type="text"
          value={trackUrl}
          onChange={(e) => setTrackUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAddTrack()
          }}
          placeholder="Paste YouTube or SoundCloud URL..."
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

      {/* End set — pushed to bottom */}
      {onEndRoom && (
        <div className="mt-auto">
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
                End this set? Listeners will be disconnected.
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

function RequestsPanel({
  requests,
  onApprove,
  onReject,
}: {
  requests: APIQueueEntry[]
  onApprove: (id: string) => void
  onReject: (id: string) => void
}) {
  return (
    <div
      className="flex flex-1 flex-col overflow-y-auto"
      style={{
        gap: "var(--space-sm)",
        padding: "var(--space-md)",
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
              paddingInline: "var(--space-sm)",
              paddingBlock: "var(--space-sm)",
              background: "rgba(255,255,255,0.03)",
              border: "0.5px solid rgba(255,255,255,0.08)",
            }}
          >
            <div
              className="shrink-0 rounded-md"
              style={{
                width: "32px",
                height: "32px",
                background:
                  req.track?.albumGradient || "rgba(255,255,255,0.08)",
              }}
            />
            <div className="min-w-0 flex-1">
              <div
                className="truncate font-medium"
                style={{ color: "#e8e6ea", fontSize: "var(--fs-small)" }}
              >
                {req.track?.title || "Unknown track"}
              </div>
              <div
                className="truncate"
                style={{
                  color: "rgba(232,230,234,0.5)",
                  fontSize: "var(--fs-meta)",
                }}
              >
                {req.track?.artist || "Unknown artist"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onApprove(req.id)}
              className="flex h-7 w-7 items-center justify-center rounded-full"
              style={{
                background: "rgba(93,202,135,0.15)",
                border: "0.5px solid rgba(93,202,135,0.4)",
                color: "#5dca87",
              }}
            >
              ✓
            </button>
            <button
              type="button"
              onClick={() => onReject(req.id)}
              className="flex h-7 w-7 items-center justify-center rounded-full"
              style={{
                background: "rgba(232,115,74,0.15)",
                border: "0.5px solid rgba(232,115,74,0.4)",
                color: "#ff8c66",
              }}
            >
              ✕
            </button>
          </div>
        ))
      )}
    </div>
  )
}

function StatsPanel({
  recentTips,
  recentChats,
  recentReactions,
  hypeScore,
  hypeLabel,
  hypeColor,
  listenerCount,
}: {
  recentTips: number
  recentChats: number
  recentReactions: number
  hypeScore: number
  hypeLabel: string
  hypeColor: string
  listenerCount: number
}) {
  return (
    <div
      className="flex flex-1 flex-col overflow-y-auto"
      style={{
        gap: "var(--space-md)",
        padding: "var(--space-md)",
      }}
    >
      {/* Hype meter card */}
      <div
        className="rounded-xl"
        style={{
          padding: "var(--space-md)",
          background: `${hypeColor}15`,
          border: `0.5px solid ${hypeColor}45`,
        }}
      >
        <div
          className="uppercase tracking-wider"
          style={{
            marginBottom: "var(--space-xs)",
            fontSize: "var(--fs-meta)",
            color: hypeColor,
          }}
        >
          Room hype · {hypeLabel}
        </div>
        <div
          className="tabular-nums font-bold"
          style={{
            fontSize: "var(--fs-display)",
            color: hypeColor,
            lineHeight: 1,
          }}
        >
          {hypeScore}
          <span
            style={{
              fontSize: "var(--fs-small)",
              color: `${hypeColor}80`,
              marginLeft: "4px",
            }}
          >
            / 100
          </span>
        </div>
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full"
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
      </div>

      {/* Breakdown */}
      <div className="flex flex-col" style={{ gap: "var(--space-sm)" }}>
        <Label>Last 60 seconds</Label>
        <StatRow icon={<Zap className="h-3 w-3" />} label="Tips" value={recentTips} />
        <StatRow icon={<MessageCircle className="h-3 w-3" />} label="Chat messages" value={recentChats} />
        <StatRow icon={<Flame className="h-3 w-3" />} label="Reactions" value={recentReactions} />
        <StatRow icon={<Users className="h-3 w-3" />} label="Listeners" value={listenerCount} />
      </div>
    </div>
  )
}

function StatRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div
      className="flex items-center rounded-lg"
      style={{
        paddingInline: "var(--space-sm)",
        paddingBlock: "var(--space-sm)",
        background: "rgba(255,255,255,0.03)",
        border: "0.5px solid rgba(255,255,255,0.06)",
      }}
    >
      <span
        className="flex h-6 w-6 items-center justify-center rounded-full"
        style={{
          background: "rgba(255,255,255,0.05)",
          color: "rgba(232,230,234,0.5)",
        }}
      >
        {icon}
      </span>
      <span
        className="flex-1"
        style={{
          marginLeft: "var(--space-sm)",
          fontSize: "var(--fs-small)",
          color: "rgba(232,230,234,0.6)",
        }}
      >
        {label}
      </span>
      <span
        className="tabular-nums font-semibold"
        style={{ fontSize: "var(--fs-body)", color: "#e8e6ea" }}
      >
        {value}
      </span>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="uppercase tracking-[0.16em]"
      style={{
        fontSize: "var(--fs-meta)",
        color: "rgba(232,230,234,0.4)",
      }}
    >
      {children}
    </div>
  )
}
