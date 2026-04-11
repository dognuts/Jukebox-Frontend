"use client"

import Link from "next/link"
import { useRef, useCallback, useState, useEffect } from "react"
import { MessageCircle } from "lucide-react"
import { useEasterEggs } from "@/hooks/use-easter-eggs"
import { useMessages } from "@/lib/messages-context"
import { useAuth } from "@/lib/auth-context"
import { UserMenu } from "@/components/layout/user-menu"
import { NeonJukeboxLogo } from "@/components/effects/neon-jukebox-logo"

export function Navbar() {
  const { triggerRainbow } = useEasterEggs()
  const { totalUnread, openDrawer } = useMessages()
  const { isLoggedIn } = useAuth()
  const clickCount = useRef(0)
  const clickTimer = useRef<NodeJS.Timeout | null>(null)
  const [hidden, setHidden] = useState(false)
  const lastScrollY = useRef(0)
  const lastDirection = useRef<"up" | "down">("up")
  const scrollAccum = useRef(0)

  useEffect(() => {
    // Disable hide-on-scroll on mobile viewports. Mobile browsers collapse
    // their URL bar during scroll which fires spurious scroll events and
    // toggles the header back and forth. Combined with backdrop-filter blur,
    // that produces a visible flicker. Keep the nav pinned on mobile and
    // only run the slide-away behavior on desktop.
    const mq = window.matchMedia("(min-width: 768px)")

    let unbindScroll: (() => void) | null = null

    const bindScroll = () => {
      const THRESHOLD = 15 // px of scroll in same direction before toggling
      const onScroll = () => {
        // Clamp to 0 so iOS rubber-band overscroll can't feed negative
        // values into the direction/accumulator logic.
        const y = Math.max(0, window.scrollY)
        const delta = y - lastScrollY.current
        const direction = delta > 0 ? "down" : "up"

        // Reset accumulator on direction change
        if (direction !== lastDirection.current) {
          scrollAccum.current = 0
          lastDirection.current = direction
        }

        scrollAccum.current += Math.abs(delta)
        lastScrollY.current = y

        // Only toggle after accumulating enough scroll in one direction
        if (y <= 32) {
          setHidden(false)
          scrollAccum.current = 0
        } else if (scrollAccum.current > THRESHOLD) {
          setHidden(direction === "down")
        }
      }
      window.addEventListener("scroll", onScroll, { passive: true })
      unbindScroll = () => window.removeEventListener("scroll", onScroll)
    }

    const apply = () => {
      if (mq.matches) {
        if (!unbindScroll) bindScroll()
      } else {
        if (unbindScroll) {
          unbindScroll()
          unbindScroll = null
        }
        setHidden(false)
        scrollAccum.current = 0
        lastScrollY.current = 0
      }
    }

    apply()
    mq.addEventListener("change", apply)

    return () => {
      mq.removeEventListener("change", apply)
      if (unbindScroll) unbindScroll()
    }
  }, [])

  // 5-click logo rainbow easter egg — preserved from the old navbar.
  const handleLogoClick = useCallback(() => {
    clickCount.current += 1
    if (clickTimer.current) clearTimeout(clickTimer.current)
    clickTimer.current = setTimeout(() => {
      clickCount.current = 0
    }, 1500)

    if (clickCount.current >= 5) {
      triggerRainbow()
      clickCount.current = 0
    }
  }, [triggerRainbow])

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-transform duration-300 ${hidden ? "-translate-y-full" : "translate-y-0"}`}
      style={{
        background: "rgba(13,11,16,0.95)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "0.5px solid rgba(255,255,255,0.06)",
        willChange: "transform",
      }}
    >
      <div className="mx-auto flex h-14 w-full max-w-[800px] items-center justify-between gap-4 px-4 sm:px-6">
        {/* Left: animated neon logo + Listen Together tagline */}
        <Link
          href="/"
          onClick={handleLogoClick}
          className="flex shrink-0 flex-col items-start gap-0.5 bg-transparent"
          aria-label="Jukebox — home"
        >
          <NeonJukeboxLogo size="sm" />
          <span
            className="hidden text-[9px] uppercase leading-none sm:block"
            style={{
              color: "rgba(232,230,234,0.5)",
              letterSpacing: "0.2em",
            }}
          >
            Listen together
          </span>
        </Link>

        {/* Right cluster: search, create, messages, user menu */}
        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          {/* Search pill — matches mockup: 180×30, rounded-full */}
          <div
            className="hidden h-[30px] w-[180px] items-center rounded-full px-3 sm:flex"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "0.5px solid rgba(255,255,255,0.08)",
            }}
          >
            <input
              type="text"
              placeholder="Search rooms..."
              className="w-full bg-transparent text-[12px] outline-none placeholder:text-[rgba(232,230,234,0.3)]"
              style={{ color: "#e8e6ea" }}
              aria-label="Search rooms"
            />
          </div>

          {/* Create room — solid light pill, logged in only */}
          {isLoggedIn && (
            <Link
              href="/create"
              className="rounded-[14px] px-[14px] py-[5px] text-xs font-medium transition-opacity hover:opacity-90"
              style={{ background: "#e8e6ea", color: "#0d0b10" }}
            >
              Create room
            </Link>
          )}

          {/* Messages */}
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
    </header>
  )
}
