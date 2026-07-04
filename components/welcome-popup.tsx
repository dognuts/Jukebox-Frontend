"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Headphones, Radio, MessageCircle, Sparkles, X } from "lucide-react"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { NeonJukeboxLogo } from "@/components/effects/neon-jukebox-logo"
import { withNextParam } from "@/components/auth/next-param"
import { useAuth } from "@/lib/auth-context"

const WELCOME_DISMISSED_KEY = "jukebox_welcome_dismissed"

export function WelcomePopup({ isLoggedIn }: { isLoggedIn: boolean }) {
  const pathname = usePathname()
  const { loading: authLoading } = useAuth()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // Never start the timer until auth has resolved — AuthProvider begins
    // with user=null, so gating only on isLoggedIn would flash the anonymous
    // onboarding modal at logged-in users whenever /api/auth/me takes longer
    // than the delay below.
    if (authLoading) return
    if (isLoggedIn) {
      // Auth resolved to a logged-in user (possibly after the popup already
      // opened, e.g. they logged in from the popup's own link) — hide it.
      setOpen(false)
      return
    }
    const dismissed = localStorage.getItem(WELCOME_DISMISSED_KEY)
    if (!dismissed) {
      // Small delay so the page loads first
      const timer = setTimeout(() => setOpen(true), 600)
      return () => clearTimeout(timer)
    }
  }, [authLoading, isLoggedIn])

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      localStorage.setItem(WELCOME_DISMISSED_KEY, "1")
    }
  }

  const dismiss = () => handleOpenChange(false)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-md"
        style={{
          background: "oklch(0.10 0.02 280)",
          border: "1px solid oklch(0.30 0.06 80 / 0.4)",
          boxShadow: `
            0 0 60px color-mix(in oklab, var(--neon-amber) 12%, transparent),
            0 0 120px color-mix(in oklab, var(--neon-magenta) 8%, transparent),
            0 24px 48px oklch(0.05 0.01 280 / 0.6)
          `,
        }}
      >
        <DialogTitle className="sr-only">Welcome to Jukebox</DialogTitle>
        <DialogDescription className="sr-only">
          Find rooms, listen live with other music heads, and talk about it.
        </DialogDescription>

        {/* Close button */}
        <DialogClose
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/10"
          style={{ color: "var(--muted-foreground)" }}
        >
          <X className="h-4 w-4" />
        </DialogClose>

        {/* Top glow bar */}
        <div className="welcome-glow-bar h-[2px] w-full" />

        {/* Content */}
        <div className="px-7 pb-7 pt-6 text-center">
          {/* Logo / Brand */}
          <div className="welcome-stagger-1">
            <div className="flex justify-center mb-1">
              <NeonJukeboxLogo size="md" />
            </div>
            <p
              className="mb-5 font-sans text-[10px] font-semibold uppercase tracking-[0.35em]"
              style={{ color: "var(--text-tertiary)" }}
            >
              Listen Together
            </p>
          </div>

          {/* Tagline */}
          <div className="welcome-stagger-2">
            <p
              className="mb-5 font-sans text-base font-medium leading-relaxed"
              style={{ color: "oklch(0.85 0.02 280)" }}
            >
              Built by music heads, for music heads.
              <br />
              <span style={{ color: "oklch(0.65 0.04 280)" }}>
                Find rooms. Listen live. Talk about it.
              </span>
            </p>
          </div>

          {/* Feature pills */}
          <div className="welcome-stagger-3 mb-6 flex flex-wrap items-center justify-center gap-2">
            <FeaturePill icon={<Radio className="h-3 w-3" />} label="Live DJ Sets" hue={80} />
            <FeaturePill icon={<Headphones className="h-3 w-3" />} label="Sync'd Listening" hue={250} />
            <FeaturePill icon={<MessageCircle className="h-3 w-3" />} label="Live Chat" hue={350} />
            <FeaturePill icon={<Sparkles className="h-3 w-3" />} label="Discover Music" hue={160} />
          </div>

          {/* Primary CTA */}
          <div className="welcome-stagger-4">
            <button
              onClick={dismiss}
              className="welcome-cta group relative mb-4 w-full overflow-hidden rounded-2xl py-3.5 font-sans text-sm font-bold uppercase tracking-wider transition-transform active:scale-[0.98]"
              style={{
                background: "var(--neon-amber)",
                color: "oklch(0.10 0.02 280)",
              }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <Headphones className="h-4 w-4" />
                Start Listening
              </span>
              <div className="welcome-cta-shine absolute inset-0" />
            </button>
          </div>

          {/* Auth links */}
          <div className="welcome-stagger-5 flex items-center justify-center gap-1 font-sans text-xs">
            <span style={{ color: "oklch(0.50 0.02 280)" }}>Already have an account?</span>
            <Link
              href={withNextParam("/login", pathname)}
              onClick={dismiss}
              className="font-semibold transition-colors hover:underline"
              style={{ color: "var(--neon-amber)" }}
            >
              Log in
            </Link>
            <span style={{ color: "oklch(0.35 0.02 280)" }}>·</span>
            <Link
              href={withNextParam("/signup", pathname)}
              onClick={dismiss}
              className="font-semibold transition-colors hover:underline"
              style={{ color: "var(--neon-blue)" }}
            >
              Sign up
            </Link>
          </div>
        </div>

        {/* Bottom ambient glow */}
        <div
          className="pointer-events-none absolute -bottom-20 left-1/2 h-40 w-80 -translate-x-1/2"
          style={{
            background: "radial-gradient(ellipse, color-mix(in oklab, var(--neon-amber) 6%, transparent), transparent 70%)",
          }}
        />

        <style jsx>{`
          .welcome-glow-bar {
            background: linear-gradient(90deg,
              transparent 0%,
              color-mix(in oklab, var(--neon-amber) 60%, transparent) 20%,
              color-mix(in oklab, var(--neon-magenta) 50%, transparent) 50%,
              color-mix(in oklab, var(--neon-blue) 60%, transparent) 80%,
              transparent 100%
            );
            animation: glowBarShimmer 3s ease-in-out infinite;
          }
          @keyframes glowBarShimmer {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }

          .welcome-cta {
            box-shadow: 0 0 20px color-mix(in oklab, var(--neon-amber) 30%, transparent), 0 0 40px color-mix(in oklab, var(--neon-amber) 10%, transparent);
            transition: box-shadow 0.3s ease, transform 0.15s ease;
          }
          .welcome-cta:hover {
            box-shadow: 0 0 28px color-mix(in oklab, var(--neon-amber) 50%, transparent), 0 0 56px color-mix(in oklab, var(--neon-amber) 20%, transparent);
          }
          .welcome-cta-shine {
            background: linear-gradient(105deg, transparent 40%, oklch(0.95 0.05 80 / 0.25) 50%, transparent 60%);
            animation: ctaShine 2.5s ease-in-out infinite;
            animation-delay: 1s;
          }
          @keyframes ctaShine {
            0% { transform: translateX(-100%); }
            30% { transform: translateX(100%); }
            100% { transform: translateX(100%); }
          }

          .welcome-stagger-1 { animation: wStagger 0.5s ease-out both; animation-delay: 0.2s; }
          .welcome-stagger-2 { animation: wStagger 0.5s ease-out both; animation-delay: 0.35s; }
          .welcome-stagger-3 { animation: wStagger 0.5s ease-out both; animation-delay: 0.5s; }
          .welcome-stagger-4 { animation: wStagger 0.5s ease-out both; animation-delay: 0.65s; }
          .welcome-stagger-5 { animation: wStagger 0.5s ease-out both; animation-delay: 0.8s; }
          @keyframes wStagger {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @media (prefers-reduced-motion: reduce) {
            .welcome-glow-bar,
            .welcome-stagger-1,
            .welcome-stagger-2,
            .welcome-stagger-3,
            .welcome-stagger-4,
            .welcome-stagger-5 {
              animation: none;
            }
            /* Without its sweep animation the shine stripe would just sit
               frozen over the label — hide it. */
            .welcome-cta-shine {
              display: none;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  )
}

function FeaturePill({ icon, label, hue }: { icon: React.ReactNode; label: string; hue: number }) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-sans text-[10px] font-semibold uppercase tracking-wider"
      style={{
        background: `oklch(0.20 0.04 ${hue} / 0.5)`,
        border: `1px solid oklch(0.40 0.10 ${hue} / 0.3)`,
        color: `oklch(0.75 0.14 ${hue})`,
      }}
    >
      {icon}
      {label}
    </div>
  )
}
