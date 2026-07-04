"use client"

import Link from "next/link"
import { ArrowLeft, MessageCircle } from "lucide-react"
import { useMessages } from "@/lib/messages-context"
import { UserMenu } from "@/components/layout/user-menu"
import { NeonJukeboxLogo } from "@/components/effects/neon-jukebox-logo"

interface ListenerNavProps {
  roomName: string
  isLive: boolean
  listenerCount: number
}

export function ListenerNav({
  roomName,
  isLive,
  listenerCount,
}: ListenerNavProps) {
  const { totalUnread, openDrawer } = useMessages()

  return (
    <div
      className="relative flex h-14 shrink-0 items-center justify-between px-5"
      style={{
        background: "color-mix(in oklab, var(--ink) 95%, transparent)",
        borderBottom: "0.5px solid var(--hairline)",
      }}
    >
      {/* Animated JUKEBOX logo, centered. Same size as the homepage
          navbar (sm → h-10 w-auto). Absolutely positioned so the left
          and right clusters aren't pushed around, and hidden below md
          so it doesn't collide with the back + room name cluster on
          phones. */}
      <Link
        href="/"
        aria-label="Jukebox — home"
        className="pointer-events-auto absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block"
      >
        <NeonJukeboxLogo size="sm" />
      </Link>

      {/* Left: back + room name + LIVE badge */}
      <div
        className="flex min-w-0 items-center"
        style={{ gap: "var(--space-sm)" }}
      >
        <Link
          href="/"
          className="flex shrink-0 items-center gap-1 transition-colors hover:text-white/60"
          style={{
            color: "var(--text-low)",
            fontSize: "var(--fs-small)",
          }}
        >
          <ArrowLeft className="h-3 w-3" />
          Back
        </Link>
        <div
          className="h-[14px] w-px shrink-0"
          style={{ background: "rgba(255,255,255,0.08)" }}
        />
        {/* h1 for the screen-reader outline — Tailwind's preflight
            neutralizes heading defaults, so this renders identically
            to the previous div. */}
        <h1
          className="truncate font-semibold"
          style={{
            color: "var(--ink-foreground)",
            fontSize: "var(--fs-body)",
          }}
        >
          {roomName}
        </h1>
        {isLive && (
          <div
            className="shrink-0 rounded-lg font-bold tracking-[0.08em]"
            style={{
              paddingInline: "var(--space-sm)",
              paddingBlock: "2px",
              background: "color-mix(in oklab, var(--brand-amber) 12%, transparent)",
              color: "var(--brand-amber)",
              fontSize: "var(--fs-meta)",
            }}
          >
            LIVE
          </div>
        )}
      </div>

      {/* Right: listener count, messages, user menu */}
      <div
        className="flex shrink-0 items-center"
        style={{ gap: "var(--space-md)" }}
      >
        <div
          className="flex items-center gap-1"
          style={{
            color: "var(--text-low)",
            fontSize: "var(--fs-small)",
          }}
        >
          <span
            aria-hidden="true"
            className="h-[5px] w-[5px] rounded-full"
            style={{ background: "#5dca87" }}
          />
          {listenerCount}
          <span className="sr-only">
            {listenerCount === 1 ? "listener" : "listeners"}
          </span>
        </div>

        {/* Messages — matches global Navbar treatment */}
        <button
          type="button"
          onClick={() => openDrawer()}
          className="relative flex items-center justify-center rounded-full p-1.5 transition-colors hover:bg-white/[0.06]"
          aria-label="Messages"
        >
          <MessageCircle
            className="h-[18px] w-[18px]"
            style={{ color: "var(--text-low)" }}
          />
          {totalUnread > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-mono font-bold"
              style={{
                background: "var(--brand-amber)",
                color: "var(--ink)",
                fontSize: "var(--fs-meta)",
              }}
            >
              {totalUnread}
            </span>
          )}
        </button>

        {/* User menu (auth-aware avatar + dropdown) */}
        <UserMenu />
      </div>
    </div>
  )
}
