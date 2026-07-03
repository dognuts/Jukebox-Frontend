"use client"

import { useState, useRef, useEffect, useCallback, useMemo, forwardRef, memo } from "react"
import { type ChatMessage } from "@/components/discover/types"
import { type ListenerInfo } from "@/hooks/use-room-websocket"
import { useRoomChatMessages } from "@/hooks/room-store"
import { GifPicker } from "@/components/room/gif-picker"
import { ChatMediaInline } from "@/components/room/chat-media-inline"
import { usePrefersReducedMotion } from "@/components/room/use-prefers-reduced-motion"

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

// A scroll position within this many px of the bottom counts as
// "pinned" — new messages auto-scroll. Further up, the view stays put
// and a "N new messages" pill appears instead.
const NEAR_BOTTOM_PX = 80

interface ListenerChatColumnProps {
  // REST-snapshot messages shown until the WebSocket has connected.
  fallbackMessages: ChatMessage[]
  // Once true, render live messages from the chat slice instead.
  useWsData: boolean
  listeners: ListenerInfo[]
  listenerCount: number
  onSendMessage?: (message: string, media?: { mediaUrl: string; mediaType: string }) => void
  onSendReaction?: (emoji: string) => void
  connected: boolean
  djName: string
  overlayRef?: React.RefObject<HTMLDivElement | null>
}

// Memoized — this column subscribes to the chat slice itself, so chat
// traffic re-renders only this component, and the memo keeps the rest
// of the room page's re-renders (queue, tube, presence) out of here.
export const ListenerChatColumn = memo(forwardRef<
  HTMLDivElement,
  ListenerChatColumnProps
>(function ListenerChatColumn(
  {
    fallbackMessages,
    useWsData,
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
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [gifPickerOpen, setGifPickerOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const overlayElRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = usePrefersReducedMotion()

  // Live chat from the external store — subscribed HERE (not in the
  // room page) so each incoming message reconciles just this column.
  const wsMessages = useRoomChatMessages()
  const messages: ChatMessage[] = useMemo(() => {
    if (useWsData) {
      return wsMessages.map((m) => ({
        id: m.id,
        username: m.username,
        avatarColor: m.avatarColor,
        message: m.message,
        timestamp: new Date(m.timestamp),
        type: m.type as "message" | "request" | "announcement",
        mediaUrl: m.mediaUrl,
        mediaType: m.mediaType,
      }))
    }
    return fallbackMessages
  }, [useWsData, wsMessages, fallbackMessages])

  // Guarded auto-scroll: only stick to the bottom while the reader is
  // already there. Scrolled up to read history? The view stays put and
  // a "N new messages" pill offers the way back down.
  const nearBottomRef = useRef(true)
  const [newCount, setNewCount] = useState(0)
  const prevTailIdRef = useRef<string | null>(null)
  // The reader's last real scroll position, plus whether the pane is
  // currently display:none'd by the mobile pane switcher. display:none
  // discards scrollTop (resets to 0), so the saved value is what lets
  // a reader who was up in history be put back where they were when
  // the pane is shown again (see the ResizeObserver below).
  const savedScrollTopRef = useRef(0)
  const paneHiddenRef = useRef(false)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    // Ignore scroll noise while the pane is display:none'd (geometry
    // reads 0) or in the gap before the ResizeObserver restores the
    // position — either would clobber the saved reading position and
    // mis-set the pinned flag.
    if (paneHiddenRef.current || el.clientHeight === 0) return
    savedScrollTopRef.current = el.scrollTop
    const near =
      el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX
    nearBottomRef.current = near
    if (near) setNewCount((c) => (c === 0 ? c : 0))
  }, [])

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
    nearBottomRef.current = true
    setNewCount((c) => (c === 0 ? c : 0))
  }, [])

  // Spawn a floating emoji in the overlay layer. The float uses the Web
  // Animations API, which the global reduced-motion CSS can't reach —
  // skip it entirely when the user prefers reduced motion (the reaction
  // counter pill still updates).
  const spawnEmoji = useCallback((emoji: string) => {
    if (prefersReducedMotion) return
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
  }, [prefersReducedMotion])

  const fireReaction = useCallback(
    (emoji: string) => {
      setCounts((prev) => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }))
      for (let i = 0; i < 2; i++) {
        setTimeout(() => spawnEmoji(emoji), i * 120)
      }
    },
    [spawnEmoji]
  )

  // Expose fireReaction on the overlayRef provided by page.tsx
  useEffect(() => {
    const el = overlayElRef.current as any
    if (el) el._fireReaction = fireReaction
    if (overlayRef && "current" in overlayRef) {
      ;(overlayRef as any).current = el
    }
  }, [fireReaction, overlayRef])

  // Composer lives in a child component that owns the input text state,
  // so typing doesn't re-render this 500-line parent (which maps the
  // whole message list on every render). We just hand the composer a
  // send callback; it calls back with the trimmed message.
  const handleSendText = useCallback(
    (text: string) => {
      if (!onSendMessage) return
      const trimmed = text.trim()
      if (!trimmed) return
      onSendMessage(trimmed)
    },
    [onSendMessage]
  )

  const handleGifSelect = useCallback(
    (gifUrl: string, caption: string) => {
      if (!onSendMessage) return
      onSendMessage(caption.trim(), { mediaUrl: gifUrl, mediaType: "gif" })
      setGifPickerOpen(false)
    },
    [onSendMessage]
  )

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
  const displayed = useMemo(
    () =>
      messages.filter(
        (m) =>
          m.type === "message" || m.type === "announcement" || m.type === "request"
      ),
    [messages]
  )

  // Auto-scroll on new displayed messages — but only when pinned near
  // the bottom. Keyed on the tail message id, NOT the array length: the
  // chat slice is capped, so in a busy room the length plateaus while
  // ids keep changing. New arrivals are counted by walking ids past the
  // previously seen tail; if that tail has already been pruned off the
  // top, everything displayed counts as new (bounded by the cap).
  const tailId = displayed.length > 0 ? displayed[displayed.length - 1].id : null

  useEffect(() => {
    const prevTailId = prevTailIdRef.current
    prevTailIdRef.current = tailId
    let delta = 0
    if (tailId !== null && tailId !== prevTailId) {
      delta = displayed.length
      if (prevTailId !== null) {
        const idx = displayed.findIndex((m) => m.id === prevTailId)
        if (idx !== -1) delta = displayed.length - 1 - idx
      }
    }
    const el = scrollRef.current
    if (!el) return
    if (nearBottomRef.current) {
      el.scrollTop = el.scrollHeight
    } else if (delta > 0) {
      setNewCount((c) => c + delta)
    }
  }, [tailId, displayed])

  // React to the scroll viewport itself hiding/showing/resizing:
  // - The mobile pane switcher hides this column with display:none,
  //   which discards the scroll position (resets to 0). On re-show,
  //   pinned readers snap back to the bottom and readers who were up
  //   in history are restored to their saved position.
  // - The on-screen keyboard resizes the visible pane; pinned readers
  //   are re-pinned so they aren't stranded mid-history until the
  //   next message (unpinned readers keep their place natively).
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      if (el.clientHeight === 0) {
        // Hidden (display:none) — freeze the saved position until the
        // pane is shown again.
        paneHiddenRef.current = true
        return
      }
      if (nearBottomRef.current) {
        el.scrollTop = el.scrollHeight
      } else if (paneHiddenRef.current) {
        el.scrollTop = savedScrollTopRef.current
      }
      paneHiddenRef.current = false
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    // Mobile: the chat pane of the room's tabbed shell — flex-1/min-h-0
    // fills the fixed-height shell exactly so the composer is always on
    // screen. md+: the sticky sidebar column, height capped to the
    // viewport below the 56px nav (the md:max-h replaces the old
    // all-breakpoints inline maxHeight — same computed value).
    <aside
      aria-label="Chat"
      className="flex min-h-0 flex-1 flex-col md:min-h-[auto] md:flex-initial md:max-h-[calc(100vh-56px)] md:sticky md:top-[56px] md:self-start"
      style={{
        background: "rgba(255,255,255,0.01)",
      }}
    >
      {/* Header — shrink-0 (like the other fixed rows below) so a
          short landscape viewport squeezes the message log, never the
          fixed-height rows; md:shrink restores the desktop default. */}
      <div
        className="shrink-0 md:shrink"
        style={{
          paddingInline: "var(--space-md)",
          paddingBlock: "var(--space-sm)",
          borderBottom: "0.5px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* h2 for the screen-reader outline — Tailwind's preflight
            neutralizes heading defaults, so this renders identically
            to the previous div. */}
        <h2
          className="font-semibold"
          style={{
            color: "#e8e6ea",
            fontSize: "var(--fs-h2)",
          }}
        >
          Chat
        </h2>
      </div>

      {/* Messages viewport — relative wrapper hosts the scroll area,
          the floating-emoji overlay (pinned to the visible box rather
          than the scrolled content) and the new-messages pill. */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          role="log"
          aria-live="polite"
          aria-atomic="false"
          aria-label="Chat messages"
          className="flex flex-1 flex-col overflow-y-auto"
          style={{
            gap: "var(--space-sm)",
            paddingInline: "var(--space-md)",
            paddingBlock: "var(--space-sm)",
          }}
        >
          {displayed.length === 0 && (
            <div
              className="text-center"
              style={{
                color: "rgba(232,230,234,0.55)",
                fontSize: "var(--fs-small)",
              }}
            >
              {connected ? "Say something to start the chat" : "Connecting..."}
            </div>
          )}

          {displayed.map((msg) => {
            const color = colorFor(msg.username)
            const isDjMsg = msg.username === djName || msg.type === "announcement"
            const mediaUrl = msg.mediaUrl
            const mediaType = msg.mediaType
            const hasMedia = !!mediaUrl

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
                        color: "rgba(232,154,60,0.75)",
                        fontSize: "var(--fs-meta)",
                      }}
                    >
                      DJ
                    </span>
                  )}
                  {/* Relative times derive from Date.now(), so the value
                      server-rendered with the room's initialData can drift
                      a second or two by the time the client hydrates —
                      suppress the (cosmetic) text mismatch. */}
                  <span
                    suppressHydrationWarning
                    style={{
                      color: "rgba(232,230,234,0.55)",
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
                  style={{
                    paddingLeft: "calc(clamp(14px, 1.4vw, 18px) + 0.375rem)",
                  }}
                >
                  {/* Text content */}
                  {msg.message && (
                    <div
                      className="leading-[1.4]"
                      style={{
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
                  )}

                  {/* Inline GIF/image */}
                  {hasMedia && mediaUrl && (
                    <div style={{ marginTop: msg.message ? "var(--space-2xs)" : 0 }}>
                      <ChatMediaInline url={mediaUrl} type={mediaType} />
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Inline reaction cluster — aria-live="off" so rapid count
              ticks inside the polite chat log don't spam screen readers */}
          {topReactions.length > 0 && (
            <div
              className="flex gap-1"
              aria-live="off"
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
                      i === 0 && !prefersReducedMotion
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

        {/* Floating emoji overlay */}
        <div
          ref={overlayElRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        />

        {/* New-messages pill — shown while scrolled up reading history */}
        {newCount > 0 && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full font-semibold shadow-lg transition-opacity hover:opacity-90"
            style={{
              paddingInline: "var(--space-md)",
              paddingBlock: "4px",
              fontSize: "var(--fs-small)",
              background: "#e89a3c",
              color: "#0d0b10",
            }}
          >
            {newCount} new {newCount === 1 ? "message" : "messages"} ↓
          </button>
        )}
      </div>

      {/* Listeners bar */}
      <div
        className="shrink-0 md:shrink"
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
                color: "rgba(232,230,234,0.6)",
                fontSize: "var(--fs-meta)",
                zIndex: 1,
              }}
            >
              +{listenerCount - 4}
            </div>
          )}
        </div>
      </div>

      {/* Reaction tray */}
      <div
        className="flex shrink-0 items-center md:shrink"
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

      <ChatComposer
        disabled={!connected || !onSendMessage}
        gifPickerOpen={gifPickerOpen}
        onToggleGifPicker={() => setGifPickerOpen((v) => !v)}
        onCloseGifPicker={() => setGifPickerOpen(false)}
        onSend={handleSendText}
        onSendGif={handleGifSelect}
      />
    </aside>
  )
}))

// Isolated composer — owns the input text state locally so keystrokes
// don't re-render ListenerChatColumn (which otherwise re-maps the full
// message list on every keystroke).
interface ChatComposerProps {
  disabled: boolean
  gifPickerOpen: boolean
  onToggleGifPicker: () => void
  onCloseGifPicker: () => void
  onSend: (text: string) => void
  onSendGif: (gifUrl: string, caption: string) => void
}

function ChatComposer({
  disabled,
  gifPickerOpen,
  onToggleGifPicker,
  onCloseGifPicker,
  onSend,
  onSendGif,
}: ChatComposerProps) {
  const [input, setInput] = useState("")

  const handleSend = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed) return
    onSend(trimmed)
    setInput("")
  }, [input, onSend])

  const handleGif = useCallback(
    (gifUrl: string) => {
      onSendGif(gifUrl, input)
      setInput("")
    },
    [input, onSendGif]
  )

  return (
    <>
      {gifPickerOpen && (
        <div
          className="shrink-0 md:shrink"
          style={{ paddingInline: "var(--space-md)", paddingTop: "var(--space-xs)" }}
        >
          <GifPicker
            open={gifPickerOpen}
            onClose={onCloseGifPicker}
            onSelect={handleGif}
          />
        </div>
      )}

      <div
        className="shrink-0 md:shrink"
        style={{
          paddingInline: "var(--space-md)",
          paddingBottom: "var(--space-sm)",
          paddingTop: "var(--space-sm)",
        }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleGifPicker}
            disabled={disabled}
            className="flex shrink-0 items-center justify-center rounded-md transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              height: "clamp(28px, 3.5vw, 34px)",
              paddingInline: "6px",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.04em",
              background: gifPickerOpen ? "rgba(232,154,60,0.15)" : "rgba(255,255,255,0.04)",
              border: gifPickerOpen
                ? "0.5px solid rgba(232,154,60,0.4)"
                : "0.5px solid rgba(255,255,255,0.08)",
              color: gifPickerOpen ? "#e89a3c" : "rgba(232,230,234,0.6)",
            }}
            aria-label="GIF picker"
          >
            GIF
          </button>

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
            aria-label="Chat message"
            disabled={disabled}
            className="neon-focus flex-1 rounded-full transition-colors placeholder:text-[rgba(232,230,234,0.55)] disabled:cursor-not-allowed disabled:opacity-60"
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
    </>
  )
}
