"use client"

import Link from "next/link"
import Image from "next/image"
import { useRef, useCallback, useState, useEffect } from "react"
import { Search, Plus, MessageCircle, Crown, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useEasterEggs } from "@/hooks/use-easter-eggs"
import { useMessages } from "@/lib/messages-context"
import { useUpgrade } from "@/lib/upgrade-context"
import { useAuth } from "@/lib/auth-context"
import { UserMenu } from "@/components/layout/user-menu"
import { NeonJukeboxLogo } from "@/components/effects/neon-jukebox-logo"

export function Navbar() {
  const { triggerRainbow, classicModeBadge } = useEasterEggs()
  const { totalUnread, openDrawer } = useMessages()
  const { plan, openUpgradeDialog } = useUpgrade()
  const { isLoggedIn, user } = useAuth()
  const clickCount = useRef(0)
  const clickTimer = useRef<NodeJS.Timeout | null>(null)
  const [hidden, setHidden] = useState(false)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      // Only hide after scrolling past half the header height
      if (y > 32) {
        setHidden(y > lastScrollY.current)
      } else {
        setHidden(false)
      }
      lastScrollY.current = y
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
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
      className={`sticky top-0 z-40 w-full border-b border-border/50 glass-panel transition-transform duration-300 ${hidden ? "-translate-y-full" : "translate-y-0"}`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Link href="/">
            <button
              onClick={handleLogoClick}
              className="flex items-center gap-2 bg-transparent border-0 cursor-pointer"
            >
              <Image
                src="/images/jukebox-logo.png"
                alt="Jukebox"
                width={40}
                height={40}
                className="h-10 w-10"
              />
              <NeonJukeboxLogo size="sm" />
            </button>
          </Link>
          {classicModeBadge && (
            <Badge
              variant="outline"
              className="border-primary/40 text-primary text-xs animate-neon-flicker"
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
            <Link
              href="/pricing"
              className="hidden items-center gap-1 rounded-full px-2.5 py-1 font-mono text-xs font-semibold transition-all hover:opacity-80 sm:flex"
              style={{
                background: "oklch(0.72 0.18 195 / 0.1)",
                border: "1px solid oklch(0.72 0.18 195 / 0.25)",
                color: "oklch(0.72 0.18 195)",
              }}
            >
              <Zap className="h-3 w-3" />
              {((user as any)?.neonBalance ?? 0).toLocaleString()}
            </Link>
          )}

          <UserMenu />

          {plan === "free" && (
            <Link
              href="/pricing"
              className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 font-sans text-xs font-semibold transition-all hover:opacity-90 sm:flex"
              style={{
                background: "linear-gradient(135deg, oklch(0.82 0.18 80 / 0.15), oklch(0.80 0.20 60 / 0.15))",
                border: "1px solid oklch(0.82 0.18 80 / 0.3)",
                color: "oklch(0.82 0.18 80)",
              }}
            >
              <Crown className="h-3.5 w-3.5" />
              Upgrade
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
