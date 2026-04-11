"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

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
  return (
    <div
      className="flex items-center justify-between px-5 py-2.5"
      style={{
        background: "rgba(13,11,16,0.95)",
        borderBottom: "0.5px solid rgba(255,255,255,0.06)",
      }}
    >
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
        <Link
          href="/"
          className="text-[13px] font-bold tracking-[0.04em]"
          style={{
            color: "#e89a3c",
            textShadow: "0 0 12px rgba(232,154,60,0.3)",
          }}
        >
          JUKEBOX
        </Link>
      </div>
    </div>
  )
}
