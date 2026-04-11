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
      className="relative flex h-14 items-center justify-between px-5"
      style={{
        background: "rgba(13,11,16,0.95)",
        borderBottom: "0.5px solid rgba(255,255,255,0.06)",
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
      <div className="flex min-w-0 items-center gap-2.5">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-1 text-xs transition-colors hover:text-white/60"
          style={{ color: "rgba(232,230,234,0.4)" }}
        >
          <ArrowLeft className="h-3 w-3" />
          Back
        </Link>
        <div
          className="h-[14px] w-px shrink-0"
          style={{ background: "rgba(255,255,255,0.08)" }}
        />
        <div
          className="truncate text-[13px] font-semibold"
          style={{ color: "#e8e6ea" }}
        >
          {roomName}
        </div>
        {isLive && (
          <div
            className="shrink-0 rounded-lg px-2 py-0.5 text-[9px] font-bold tracking-[0.08em]"
            style={{ background: "rgba(232,154,60,0.12)", color: "#e89a3c" }}
          >
            LIVE
          </div>
        )}
      </div>

      {/* Right: listener count, messages, user menu */}
      <div className="flex shrink-0 items-center gap-3">
        <div
          className="flex items-center gap-1 text-[11px]"
          style={{ color: "rgba(232,230,234,0.4)" }}
        >
          <span
            className="h-[5px] w-[5px] rounded-full"
            style={{ background: "#5dca87" }}
          />
          {listenerCount}
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
            style={{ color: "rgba(232,230,234,0.55)" }}
          />
          {totalUnread > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-mono text-[9px] font-bold"
              style={{ background: "#e89a3c", color: "#0d0b10" }}
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
