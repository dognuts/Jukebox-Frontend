"use client"

import { useState, useRef, useEffect, useCallback, forwardRef } from "react"
import { type ChatMessage } from "@/lib/mock-data"
import { type ListenerInfo } from "@/hooks/use-room-websocket"

// Per-user colour palette. Hash username → fixed slot so the same name is
// always the same colour.
const AVATAR_COLORS = [
  "#c06ad8",
  "#5dca87",
  "#4a8fe8",
  "#e8734a",
  "#d8c84a",
  "#e89a3c",
]

function colorFor(username: string): string {
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = (hash * 31 + username.charCodeAt(i)) >>> 0
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function relativeTime(then: Date): string {
  const sec = Math.max(0, Math.floor((Date.now() - then.getTime()) / 1000))
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  return `${Math.floor(hr / 24)}d`
}

const REACTION_EMOJIS = ["🔥", "🎵", "💯", "❤️", "😎"] as const

interface ListenerChatColumnProps {
  messages: ChatMessage[]
  listeners: ListenerInfo[]
  listenerCount: number
  onSendMessage?: (message: string) => void
  onSendReaction?: (emoji: string) => void
  connected: boolean
  djName: string
  // Ref that page.tsx uses to call `_fireReaction(emoji)` on incoming WS
  // reactions. We attach a method to its `current` so the existing
  // handleIncomingReaction in page.tsx still works.
  overlayRef?: React.RefObject<HTMLDivElement | null>
}

export const ListenerChatColumn = forwardRef<
  HTMLDivElement,
  ListenerChatColumnProps
>(function ListenerChatColumn(
  {
    messages,
    listeners,
    listenerCount,
    onSendMessage,
    onSendReaction,
    connected,
    djName,
    overlayRef,
  },
  _ref
) {
  const [input, setInput] = useState("")
  const [counts, setCounts] = useState<Record<string, number>>({})
  const scrollRef = useRef<HTMLDivElement>(null)
  const overlayElRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to the bottom when new messages arrive.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length])

  // Spawn a floating emoji in the overlay layer — keeps parity with the
  // old ChatPanel so existing incoming-reaction wiring in page.tsx still
  // fires animations here.
  const spawnEmoji = useCallback((emoji: string) => {
    const container = overlayElRef.current
    if (!container) return

    const el = document.createElement("span")
    el.textContent = emoji
    el.setAttribute("aria-hidden", "true")

    const lane = Math.floor(Math.random() * 6)
    const leftPct = 8 + lane * 15 + (Math.random() * 8 - 4)

    Object.assign(el.style, {
      position: "absolute",
      left: `${leftPct}%`,
      bottom: "0px",
      fontSize: `${1.2 + Math.random() * 0.6}rem`,
      lineHeight: "1",
      pointerEvents: "none",
      willChange: "transform, opacity",
      zIndex: "20",
    })
    container.appendChild(el)

    const dur = 2200 + Math.random() * 1000
    const drift = (Math.random() - 0.5) * 24

    el.animate(
      [
        { transform: "translateY(0) scale(0.6)", opacity: 0.9 },
        {
          transform: `translateY(-35%) translateX(${drift * 0.4}px) scale(1)`,
          opacity: 1,
          offset: 0.2,
        },
        {
          transform: `translateY(-70%) translateX(${drift}px) scale(0.95)`,
          opacity: 0.7,
          offset: 0.65,
        },
        {
          transform: `translateY(-100%) translateX(${drift * 1.1}px) scale(0.8)`,
          opacity: 0,
        },
      ],
      { duration: dur, easing: "cubic-bezier(0.25, 0.1, 0.25, 1)", fill: "forwards" }
    )

    setTimeout(() => el.remove(), dur + 50)
  }, [])

  const fireReaction = useCallback(
    (emoji: string) => {
      setCounts((prev) => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }))
      for (let i = 0; i < 2; i++) {
        setTimeout(() => spawnEmoji(emoji), i * 120)
      }
    },
    [spawnEmoji]
  )

  // Expose fireReaction on the overlayRef provided by page.tsx so the
  // existing handleIncomingReaction call site works unchanged.
  useEffect(() => {
    const el = overlayElRef.current as any
    if (el) el._fireReaction = fireReaction
    if (overlayRef && "current" in overlayRef) {
      ;(overlayRef as any).current = el
    }
  }, [fireReaction, overlayRef])

  const handleSend = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed || !onSendMessage) return
    onSendMessage(trimmed)
    setInput("")
  }, [input, onSendMessage])

  const handleReactionClick = useCallback(
    (emoji: string) => {
      fireReaction(emoji)
      onSendReaction?.(emoji)
    },
    [fireReaction, onSendReaction]
  )

  // Only show three reaction pills at a time, the highest-count ones.
  const topReactions = (Object.entries(counts) as [string, number][])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  // Filtered and displayed messages — exclude system activity events from
  // the feed but keep chat/announcements/requests.
  const displayed = messages.filter(
    (m) => m.type === "message" || m.type === "announcement" || m.type === "request"
  )

  return (
    <div
      className="flex flex-col border-t border-white/[0.06] md:border-t-0"
      style={{
        background: "rgba(255,255,255,0.01)",
        minHeight: "400px",
      }}
    >
      {/* Header */}
      <div
        style={{
          paddingInline: "var(--space-md)",
          paddingBlock: "var(--space-sm)",
          borderBottom: "0.5px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          className="font-semibold"
          style={{
            color: "#e8e6ea",
            fontSize: "var(--fs-h2)",
          }}
        >
          Chat
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="relative flex flex-1 flex-col overflow-y-auto"
        style={{
          gap: "var(--space-sm)",
          paddingInline: "var(--space-md)",
          paddingBlock: "var(--space-sm)",
        }}
      >
        {/* Floating emoji overlay — positioned absolute so reactions drift
            upward across the messages list. */}
        <div
          ref={overlayElRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        />

        {displayed.length === 0 && (
          <div
            className="text-center"
            style={{
              color: "rgba(232,230,234,0.3)",
              fontSize: "var(--fs-small)",
            }}
          >
            {connected ? "Say something to start the chat" : "Connecting..."}
          </div>
        )}

        {displayed.map((msg) => {
          const color = colorFor(msg.username)
          const isDjMsg = msg.username === djName || msg.type === "announcement"
          return (
            <div key={msg.id}>
              <div
                className="flex items-center gap-1.5"
                style={{ marginBottom: "var(--space-2xs)" }}
              >
                <div
                  className="shrink-0 rounded-full"
                  style={{
                    width: "clamp(14px, 1.4vw, 18px)",
                    height: "clamp(14px, 1.4vw, 18px)",
                    background: color,
                  }}
                />
                <span
                  className="font-medium"
                  style={{ color, fontSize: "var(--fs-small)" }}
                >
                  {msg.username}
                </span>
                {isDjMsg && (
                  <span
                    style={{
                      color: "rgba(232,154,60,0.5)",
                      fontSize: "var(--fs-meta)",
                    }}
                  >
                    DJ
                  </span>
                )}
                <span
                  style={{
                    color: "rgba(232,230,234,0.25)",
                    fontSize: "var(--fs-meta)",
                  }}
                >
                  {relativeTime(
                    msg.timestamp instanceof Date
                      ? msg.timestamp
                      : new Date(msg.timestamp)
                  )}
                </span>
              </div>
              <div
                className="leading-[1.4]"
                style={{
                  paddingLeft: "calc(clamp(14px, 1.4vw, 18px) + 0.375rem)",
                  color: "rgba(232,230,234,0.6)",
                  fontSize: "var(--fs-body)",
                }}
              >
                {msg.type === "request" ? (
                  <span className="italic">requested: {msg.message}</span>
                ) : (
                  msg.message
                )}
              </div>
            </div>
          )
        })}

        {/* Inline reaction cluster */}
        {topReactions.length > 0 && (
          <div
            className="flex gap-1"
            style={{
              paddingLeft: "calc(clamp(14px, 1.4vw, 18px) + 0.375rem)",
            }}
          >
            {topReactions.map(([emoji, count], i) => (
              <span
                key={emoji}
                className="rounded-[10px]"
                style={{
                  paddingInline: "var(--space-sm)",
                  paddingBlock: "2px",
                  fontSize: "var(--fs-body)",
                  background: "rgba(255,255,255,0.04)",
                  animation:
                    i === 0
                      ? "listener-reaction-pulse 1.5s ease-in-out infinite"
                      : undefined,
                }}
              >
                {emoji} {count}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Listeners bar */}
      <div
        style={{
          paddingInline: "var(--space-md)",
          paddingBlock: "var(--space-sm)",
          borderTop: "0.5px solid rgba(255,255,255,0.06)",
          borderBottom: "0.5px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center">
          {listeners.slice(0, 4).map((l, i) => (
            <div
              key={`${l.username}-${i}`}
              className="rounded-full"
              style={{
                width: "clamp(18px, 1.8vw, 24px)",
                height: "clamp(18px, 1.8vw, 24px)",
                background: l.avatarColor || colorFor(l.username),
                border: "1.5px solid #0d0b10",
                marginLeft: i === 0 ? 0 : -6,
                zIndex: 5 - i,
              }}
              title={l.username}
            />
          ))}
          {listenerCount > 4 && (
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: "clamp(18px, 1.8vw, 24px)",
                height: "clamp(18px, 1.8vw, 24px)",
                background: "rgba(255,255,255,0.08)",
                border: "1.5px solid #0d0b10",
                marginLeft: -6,
                color: "rgba(232,230,234,0.4)",
                fontSize: "var(--fs-meta)",
                zIndex: 1,
              }}
            >
              +{listenerCount - 4}
            </div>
          )}
        </div>
      </div>

      {/* Reaction tray — quick way to send a reaction without typing. */}
      <div
        className="flex items-center"
        style={{
          gap: "var(--space-xs)",
          paddingInline: "var(--space-md)",
          paddingTop: "var(--space-sm)",
        }}
      >
        {REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => handleReactionClick(emoji)}
            disabled={!connected}
            className="rounded-full transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              paddingInline: "var(--space-sm)",
              paddingBlock: "2px",
              fontSize: "var(--fs-body)",
              background: "rgba(255,255,255,0.04)",
              border: "0.5px solid rgba(255,255,255,0.08)",
            }}
            aria-label={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Chat input */}
      <div
        style={{
          paddingInline: "var(--space-md)",
          paddingBottom: "var(--space-sm)",
          paddingTop: "var(--space-sm)",
        }}
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Say something..."
            disabled={!connected || !onSendMessage}
            className="flex-1 rounded-full outline-none transition-colors placeholder:text-[rgba(232,230,234,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              height: "clamp(34px, 4vw, 42px)",
              paddingInline: "var(--space-md)",
              fontSize: "var(--fs-body)",
              background: "rgba(255,255,255,0.04)",
              border: "0.5px solid rgba(255,255,255,0.08)",
              color: "#e8e6ea",
            }}
          />
        </div>
      </div>
    </div>
  )
})
