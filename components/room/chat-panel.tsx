"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Send, Music, Users, MessageSquare, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { type ChatMessage } from "@/lib/mock-data"
import { useEasterEggs } from "@/hooks/use-easter-eggs"
import { UserPopover } from "./user-popover"
import type { ListenerInfo } from "@/hooks/use-room-websocket"

const simulatedMessages: { username: string; message: string; color: string }[] = [
  { username: "MusicFan42", message: "This is such a vibe right now", color: "oklch(0.70 0.18 30)" },
  { username: "NightOwl", message: "Just got here, what did I miss?", color: "oklch(0.65 0.20 250)" },
  { username: "BeatDropper", message: "Turn it up!", color: "oklch(0.72 0.15 150)" },
  { username: "VibeCheck", message: "Anyone else just chilling?", color: "oklch(0.68 0.22 80)" },
  { username: "SoundWave", message: "This DJ never misses", color: "oklch(0.60 0.18 320)" },
  { username: "EchoRoom", message: "Need this track on my playlist", color: "oklch(0.75 0.12 200)" },
]

const reactions = [
  { emoji: "\u{1F525}", label: "Fire", key: "fire" },
  { emoji: "\u2764\uFE0F", label: "Heart", key: "heart" },
  { emoji: "\u{1F64C}", label: "Raised hands", key: "hands" },
  { emoji: "\u{1F3B6}", label: "Music", key: "music" },
  { emoji: "\u{1F60E}", label: "Cool", key: "cool" },
]

interface ChatPanelProps {
  initialMessages: ChatMessage[]
  roomName: string
  onSendMessage?: (message: string) => void
  onSendReaction?: (emoji: string) => void
  connected?: boolean
  overlayRef?: React.RefObject<HTMLDivElement | null>
  listeners?: ListenerInfo[]
  listenerCount?: number
}

export function ChatPanel({
  initialMessages,
  roomName,
  onSendMessage,
  onSendReaction,
  connected,
  overlayRef: externalOverlayRef,
  listeners = [],
  listenerCount = 0,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState("")
  const [activeTab, setActiveTab] = useState<"chat" | "lobby">("chat")
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const internalOverlayRef = useRef<HTMLDivElement>(null)
  const { checkChatMagicWords } = useEasterEggs()

  // Sync messages from parent
  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (activeTab !== "chat") return
    const el = scrollContainerRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [messages, activeTab])

  // Simulate incoming messages only when not connected
  useEffect(() => {
    if (connected) return
    const interval = setInterval(() => {
      const sim = simulatedMessages[Math.floor(Math.random() * simulatedMessages.length)]
      const newMsg: ChatMessage = {
        id: `sim-${Date.now()}`,
        username: sim.username,
        avatarColor: sim.color,
        message: sim.message,
        timestamp: new Date(),
        type: "message",
      }
      setMessages((prev) => [...prev.slice(-50), newMsg])
    }, 5000 + Math.random() * 8000)
    return () => clearInterval(interval)
  }, [connected])

  // Inject join/tip activity events into chat stream (mock mode only)
  const activityUsernames = ["NightOwl", "BassHead", "VibeChaser", "MelodyMaker", "SoundWave", "EchoRoom", "BeatDropper", "WaveRider"]
  const activityColors = ["oklch(0.65 0.15 155)", "oklch(0.65 0.20 250)", "oklch(0.70 0.18 30)", "oklch(0.68 0.22 80)", "oklch(0.72 0.15 200)"]
  useEffect(() => {
    if (connected) return // real activity comes from WebSocket when connected
    const interval = setInterval(() => {
      const isTip = Math.random() > 0.5
      const username = activityUsernames[Math.floor(Math.random() * activityUsernames.length)]
      const color = activityColors[Math.floor(Math.random() * activityColors.length)]
      const newMsg: ChatMessage = {
        id: `activity-${Date.now()}`,
        username,
        avatarColor: color,
        message: isTip ? `sent ${Math.floor(Math.random() * 90 + 10)} Neon` : "joined the room",
        timestamp: new Date(),
        type: isTip ? "activity_tip" : "activity_join",
      }
      setMessages((prev) => [...prev.slice(-50), newMsg])
    }, 10000 + Math.random() * 12000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected])

  // --- Smooth emoji float animation ---
  const spawnEmoji = useCallback((emoji: string) => {
    const container = internalOverlayRef.current
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
        { transform: `translateY(-35%) translateX(${drift * 0.4}px) scale(1)`, opacity: 1, offset: 0.2 },
        { transform: `translateY(-70%) translateX(${drift}px) scale(0.95)`, opacity: 0.7, offset: 0.65 },
        { transform: `translateY(-100%) translateX(${drift * 1.1}px) scale(0.8)`, opacity: 0 },
      ],
      { duration: dur, easing: "cubic-bezier(0.25, 0.1, 0.25, 1)", fill: "forwards" }
    )

    setTimeout(() => el.remove(), dur + 50)
  }, [])

  const fireReaction = useCallback(
    (emoji: string) => {
      const count = 1 + Math.floor(Math.random() * 2)
      for (let i = 0; i < count; i++) {
        setTimeout(() => spawnEmoji(emoji), i * 120)
      }
    },
    [spawnEmoji]
  )

  // Expose fireReaction on both refs
  useEffect(() => {
    const internal = internalOverlayRef.current as any
    if (internal) internal._fireReaction = fireReaction
    if (externalOverlayRef && "current" in externalOverlayRef) {
      (externalOverlayRef as any).current = internal
    }
  }, [fireReaction, externalOverlayRef])

  // Simulate reactions in mock mode
  useEffect(() => {
    if (connected) return
    const interval = setInterval(() => {
      const reaction = reactions[Math.floor(Math.random() * reactions.length)]
      fireReaction(reaction.emoji)
    }, 8000 + Math.random() * 15000)
    return () => clearInterval(interval)
  }, [fireReaction, connected])

  const handleSend = useCallback(() => {
    if (!input.trim()) return
    checkChatMagicWords(input)
    onSendMessage?.(input.trim())
    setInput("")
  }, [input, onSendMessage, checkChatMagicWords])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const handleReaction = useCallback(
    (emoji: string) => {
      fireReaction(emoji)
      onSendReaction?.(emoji)
    },
    [fireReaction, onSendReaction]
  )

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border/30 glass-panel">
      {/* Header with tabs */}
      <div className="flex items-center border-b border-border/30">
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex flex-1 items-center justify-center gap-1.5 px-4 py-3 font-sans text-sm font-semibold transition-colors ${
            activeTab === "chat"
              ? "text-foreground border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Chat
        </button>
        <button
          onClick={() => setActiveTab("lobby")}
          className={`flex flex-1 items-center justify-center gap-1.5 px-4 py-3 font-sans text-sm font-semibold transition-colors ${
            activeTab === "lobby"
              ? "text-foreground border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          Lobby
          {listenerCount > 0 && (
            <span
              className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-mono text-[9px] font-bold"
              style={{
                background: "oklch(0.55 0.20 270 / 0.3)",
                color: "oklch(0.75 0.15 270)",
              }}
            >
              {listenerCount}
            </span>
          )}
        </button>
      </div>

      {/* Chat tab */}
      {activeTab === "chat" && (
        <>
          {/* Messages area with reaction overlay */}
          <div className="relative flex-1 min-h-0">
            <div
              ref={internalOverlayRef}
              className="pointer-events-none absolute inset-0 overflow-hidden"
              style={{ zIndex: 10 }}
              aria-hidden="true"
            />

            <div ref={scrollContainerRef} className="relative z-20 h-full overflow-y-auto px-3 py-2 scrollbar-thin">
              {messages.map((msg) => {
                const isActivity = msg.type === "activity_join" || msg.type === "activity_tip" || msg.type === "activity_leave"

                if (isActivity) {
                  const isTip = msg.type === "activity_tip"
                  const isLeave = msg.type === "activity_leave"
                  return (
                    <div
                      key={msg.id}
                      className="mb-1.5 flex items-center justify-center animate-in fade-in duration-300"
                    >
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-sans text-xs"
                        style={{
                          background: isTip
                            ? "oklch(0.72 0.18 195 / 0.12)"
                            : isLeave
                            ? "oklch(0.50 0.05 280 / 0.10)"
                            : "oklch(0.65 0.15 155 / 0.10)",
                          border: isTip
                            ? "1px solid oklch(0.72 0.18 195 / 0.25)"
                            : isLeave
                            ? "1px solid oklch(0.50 0.05 280 / 0.15)"
                            : "1px solid oklch(0.65 0.15 155 / 0.20)",
                          color: isTip
                            ? "oklch(0.82 0.16 195)"
                            : isLeave
                            ? "oklch(0.55 0.05 280)"
                            : "oklch(0.72 0.12 155)",
                        }}
                      >
                        {isTip
                          ? <Zap className="h-3 w-3 shrink-0" />
                          : <Users className="h-3 w-3 shrink-0" />
                        }
                        <span className="font-semibold">{msg.username}</span>
                        <span className="opacity-80">{msg.message}</span>
                      </span>
                    </div>
                  )
                }

                return (
                  <div
                    key={msg.id}
                    className={`mb-2 flex gap-2.5 rounded-lg px-2.5 py-1.5 animate-in fade-in slide-in-from-right-3 duration-200 ${
                      msg.type === "announcement"
                        ? "bg-primary/10 border border-primary/20"
                        : msg.type === "request"
                          ? "bg-accent/10 border border-accent/20"
                          : ""
                    }`}
                  >
                    <div
                      className="mt-0.5 h-6 w-6 shrink-0 rounded-full"
                      style={{ background: msg.avatarColor }}
                    />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-baseline gap-2">
                        <UserPopover username={msg.username} avatarColor={msg.avatarColor}>
                          <button
                            type="button"
                            className="relative z-10 font-sans text-xs font-semibold cursor-pointer hover:underline"
                            style={{
                              color: msg.type === "announcement" ? "var(--neon-amber)" : "var(--foreground)",
                            }}
                          >
                            {msg.username}
                          </button>
                        </UserPopover>
                        <span className="font-sans text-[10px] text-muted-foreground" suppressHydrationWarning>
                          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="flex items-start gap-1">
                        {msg.type === "request" && <Music className="mt-0.5 h-3 w-3 shrink-0 text-accent" />}
                        <p className="font-sans text-sm text-foreground/90 break-words">{msg.message}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Reaction buttons */}
          <div className="flex items-center justify-around border-t border-border/20 px-3 pt-2.5 pb-1">
            {reactions.map((reaction) => (
              <button
                key={reaction.key}
                onClick={() => handleReaction(reaction.emoji)}
                className="flex items-center justify-center rounded-full p-2 transition-all hover:bg-muted/30 active:scale-90"
                aria-label={`React with ${reaction.label}`}
              >
                <span className="text-xl leading-none">{reaction.emoji}</span>
              </button>
            ))}
          </div>

          {/* Chat input */}
          <div className="px-3 pb-3 pt-1">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Say something..."
                className="flex-1 rounded-full border-border/30 bg-muted/30 font-sans text-sm text-foreground placeholder:text-muted-foreground"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim()}
                className="h-9 w-9 shrink-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-1.5 text-center font-sans text-[10px] text-muted-foreground/60">
              {"Try typing \"drop the beat\" or \"lights out\""}
            </p>
          </div>
        </>
      )}

      {/* Lobby tab */}
      {activeTab === "lobby" && (
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 scrollbar-thin">
          {listeners.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12">
              <Users className="h-8 w-8 text-muted-foreground/40" />
              <p className="font-sans text-sm text-muted-foreground">No one&apos;s here yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {listeners.map((listener) => (
                <UserPopover
                  key={listener.username}
                  username={listener.username}
                  avatarColor={listener.avatarColor}
                  userId={listener.userId}
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/20"
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{
                        background: listener.avatarColor,
                        color: "oklch(0.10 0.01 280)",
                      }}
                    >
                      {listener.username[0]?.toUpperCase()}
                    </div>
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="truncate font-sans text-sm font-medium text-foreground">
                        {listener.username}
                      </span>
                      {listener.isDJ && (
                        <span
                          className="shrink-0 rounded-full px-1.5 py-0.5 font-sans text-[9px] font-bold uppercase"
                          style={{
                            background: "oklch(0.82 0.18 80 / 0.15)",
                            color: "oklch(0.82 0.18 80)",
                            border: "1px solid oklch(0.82 0.18 80 / 0.3)",
                          }}
                        >
                          DJ
                        </span>
                      )}
                    </div>
                  </button>
                </UserPopover>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
