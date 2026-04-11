"use client"

import Link from "next/link"
import { useRef, useCallback, useState, useEffect } from "react"
import { Search, Plus, MessageCircle, Crown, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useEasterEggs } from "@/hooks/use-easter-eggs"
import { useMessages } from "@/lib/messages-context"
import { useUpgrade } from "@/lib/upgrade-context"
import { usePricingModal } from "@/components/pricing-modal"
import { useAuth } from "@/lib/auth-context"
import { UserMenu } from "@/components/layout/user-menu"
import { NeonJukeboxLogo } from "@/components/effects/neon-jukebox-logo"

export function Navbar() {
  const { triggerRainbow, classicModeBadge } = useEasterEggs()
  const { totalUnread, openDrawer } = useMessages()
  const { plan, openUpgradeDialog } = useUpgrade()
  const pricingModal = usePricingModal()
  const { isLoggedIn, user } = useAuth()
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
        // Desktop/tablet — enable hide-on-scroll
        if (!unbindScroll) bindScroll()
      } else {
        // Mobile — keep nav pinned and drop any active listener
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
      className={`sticky top-0 z-40 w-full border-b border-border/50 transition-transform duration-300 ${hidden ? "-translate-y-full" : "translate-y-0"}`}
      style={{
        background: "oklch(0.10 0.015 280 / 0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        willChange: "transform",
      }}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 lg:px-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-0.5">
          <Link href="/">
            <button
              onClick={handleLogoClick}
              className="flex items-center bg-transparent border-0 cursor-pointer"
            >
              <NeonJukeboxLogo size="sm" />
            </button>
          </Link>
          <span className="font-sans text-[9px] font-normal text-foreground/50 leading-none tracking-[0.2em] uppercase">
            Listen Together
          </span>
          {classicModeBadge && (
            <Badge
              variant="outline"
              className="border-primary/40 text-primary text-xs animate-neon-flicker mt-1"
            >
              Classic
            </Badge>
          )}
        </div>

        {/* Search - hidden on mobile */}
        <div className="hidden flex-1 items-center justify-center px-8 md:flex">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search rooms, DJs, genres..."
              className="h-9 w-full rounded-full border-border/50 bg-muted/50 pl-9 font-sans text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Messages */}
          <button
            onClick={() => openDrawer()}
            className="relative flex items-center justify-center rounded-full p-2 transition-colors hover:bg-muted/30"
            aria-label="Messages"
          >
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
            {totalUnread > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-mono text-[9px] font-bold"
                style={{
                  background: "oklch(0.55 0.20 270)",
                  color: "oklch(0.95 0.01 280)",
                }}
              >
                {totalUnread}
              </span>
            )}
          </button>

          {isLoggedIn && (
            <Link href="/create">
              <Button
                size="sm"
                className="gap-2 rounded-full bg-primary font-sans text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create Jukebox</span>
              </Button>
            </Link>
          )}

          {/* Neon balance */}
          {isLoggedIn && (
            <button
              onClick={pricingModal.open}
              className="hidden items-center gap-1 rounded-full px-2.5 py-1 font-mono text-xs font-semibold transition-all hover:opacity-80 sm:flex"
              style={{
                background: "oklch(0.72 0.18 195 / 0.1)",
                border: "1px solid oklch(0.72 0.18 195 / 0.25)",
                color: "oklch(0.72 0.18 195)",
              }}
            >
              <Zap className="h-3 w-3" />
              {((user as any)?.neonBalance ?? 0).toLocaleString()}
            </button>
          )}

          <UserMenu />

          {plan === "free" && (
            <button
              onClick={pricingModal.open}
              className="hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1.5 font-sans text-xs font-semibold transition-all upgrade-button-premium"
              style={{
                background: "linear-gradient(135deg, oklch(0.82 0.18 80) 0%, oklch(0.85 0.20 60) 50%, oklch(0.72 0.18 250) 100%)",
                backgroundSize: "200% auto",
                border: "1px solid oklch(0.82 0.18 80 / 0.5)",
                color: "oklch(0.15 0.02 80)",
              }}
            >
              <Crown className="h-3.5 w-3.5" />
              Upgrade
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
