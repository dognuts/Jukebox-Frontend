"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { ArrowLeft, Send } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useMessages } from "@/lib/messages-context"
import { useAuth } from "@/lib/auth-context"
import { currentUser, type Conversation } from "@/lib/mock-data"

// ---- Conversation list view ----

function ConversationList({
  conversations,
  onSelect,
  currentUserId,
}: {
  conversations: Conversation[]
  onSelect: (username: string) => void
  currentUserId?: string
}) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-center font-sans text-sm text-muted-foreground">
          No conversations yet. Click a username in chat to start one.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((conv) => {
        const lastMsg = conv.messages[conv.messages.length - 1]
        return (
          <button
            key={conv.withUser.username}
            onClick={() => onSelect(conv.withUser.username)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/20"
          >
            {/* Avatar */}
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
              style={{
                background: conv.withUser.avatarColor,
                color: "oklch(0.10 0.01 280)",
              }}
            >
              {conv.withUser.username[0].toUpperCase()}
            </div>

            {/* Text */}
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-sans text-sm font-semibold text-foreground">
                  {conv.withUser.displayName}
                </span>
                {lastMsg && (
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {formatRelativeTime(lastMsg.timestamp)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="truncate font-sans text-xs text-muted-foreground">
                  {lastMsg
                    ? `${lastMsg.fromUsername === currentUser.username || lastMsg.fromUsername === currentUserId ? "You: " : ""}${lastMsg.text}`
                    : "Start a conversation"}
                </p>
                {conv.unreadCount > 0 && (
                  <span
                    className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-mono text-[10px] font-bold"
                    style={{
                      background: "oklch(0.55 0.20 270)",
                      color: "oklch(0.95 0.01 280)",
                    }}
                  >
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ---- Active conversation view ----

function ConversationChat({
  conversation,
  onBack,
}: {
  conversation: Conversation
  onBack: () => void
}) {
  const { sendMessage, isRealAPI } = useMessages()
  const { user } = useAuth()
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [conversation.messages.length])

  const handleSend = useCallback(() => {
    if (!input.trim()) return
    sendMessage(conversation.withUser.username, input.trim())
    setInput("")
  }, [input, sendMessage, conversation.withUser.username])

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Chat header */}
      <div className="flex items-center gap-3 border-b border-border/30 px-4 py-3">
        <button
          onClick={onBack}
          className="flex items-center justify-center rounded-full p-1 transition-colors hover:bg-muted/30"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
          style={{
            background: conversation.withUser.avatarColor,
            color: "oklch(0.10 0.01 280)",
          }}
        >
          {conversation.withUser.username[0].toUpperCase()}
        </div>
        <div>
          <p className="font-sans text-sm font-semibold text-foreground">
            {conversation.withUser.displayName}
          </p>
          <p className="font-sans text-[10px] text-muted-foreground">
            @{conversation.withUser.username}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-3 scrollbar-thin">
        {conversation.messages.length === 0 && (
          <p className="py-8 text-center font-sans text-xs text-muted-foreground">
            Send a message to start the conversation.
          </p>
        )}
        {conversation.messages.map((msg) => {
          const isMe = isRealAPI
            ? msg.fromUsername === user?.id
            : msg.fromUsername === currentUser.username
          return (
            <div
              key={msg.id}
              className={`mb-3 flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className="max-w-[80%] rounded-2xl px-3.5 py-2"
                style={{
                  background: isMe
                    ? "oklch(0.45 0.18 270 / 0.6)"
                    : "oklch(0.18 0.015 280 / 0.8)",
                  borderBottomRightRadius: isMe ? "4px" : undefined,
                  borderBottomLeftRadius: isMe ? undefined : "4px",
                }}
              >
                <p className="font-sans text-sm text-foreground leading-relaxed">
                  {msg.text}
                </p>
                <p className="mt-0.5 font-mono text-[9px] text-muted-foreground/70">
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Input */}
      <div className="border-t border-border/30 px-4 py-3">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Type a message..."
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
      </div>
    </div>
  )
}

// ---- Main drawer ----

export function MessagesDrawer() {
  const {
    conversations,
    drawerOpen,
    activeConversation,
    closeDrawer,
    setActiveConversation,
  } = useMessages()
  const { user } = useAuth()

  const activeConv = activeConversation
    ? conversations.find((c) => c.withUser.username === activeConversation)
    : null

  return (
    <Sheet open={drawerOpen} onOpenChange={(open) => !open && closeDrawer()}>
      <SheetContent
        side="right"
        className="flex flex-col p-0 border-border/30"
        style={{
          background: "oklch(0.12 0.015 280 / 0.97)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Header -- only shown when on conversation list */}
        {!activeConv && (
          <SheetHeader className="border-b border-border/30 px-4 py-4">
            <SheetTitle className="font-sans text-base">Messages</SheetTitle>
            <SheetDescription className="font-sans text-xs text-muted-foreground">
              {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
            </SheetDescription>
          </SheetHeader>
        )}

        {activeConv ? (
          <ConversationChat
            conversation={activeConv}
            onBack={() => setActiveConversation(null)}
          />
        ) : (
          <ConversationList
            conversations={conversations}
            onSelect={(u) => setActiveConversation(u)}
            currentUserId={user?.id}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

// ---- Helpers ----

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "now"
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  return `${days}d`
}
