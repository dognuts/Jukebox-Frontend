"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Headphones, Radio, MessageCircle, Sparkles, X } from "lucide-react"
import { NeonJukeboxLogo } from "@/components/effects/neon-jukebox-logo"

const WELCOME_DISMISSED_KEY = "jukebox_welcome_dismissed"

export function WelcomePopup({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (isLoggedIn) return
    const dismissed = localStorage.getItem(WELCOME_DISMISSED_KEY)
    if (!dismissed) {
      // Small delay so the page loads first
      const timer = setTimeout(() => setVisible(true), 600)
      return () => clearTimeout(timer)
    }
  }, [isLoggedIn])

  const dismiss = () => {
    setClosing(true)
    setTimeout(() => {
      setVisible(false)
      localStorage.setItem(WELCOME_DISMISSED_KEY, "1")
    }, 400)
  }

  if (!visible) return null

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center px-4 ${closing ? "welcome-fade-out" : "welcome-fade-in"}`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" onClick={dismiss} />

      {/* Card */}
      <div
        className={`relative w-full max-w-md overflow-hidden rounded-3xl ${closing ? "welcome-card-out" : "welcome-card-in"}`}
        style={{
          background: "oklch(0.10 0.02 280)",
          border: "1px solid oklch(0.30 0.06 80 / 0.4)",
          boxShadow: `
            0 0 60px oklch(0.82 0.18 80 / 0.12),
            0 0 120px oklch(0.70 0.22 350 / 0.08),
            0 24px 48px oklch(0.05 0.01 280 / 0.6)
          `,
        }}
      >
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/10"
          style={{ color: "oklch(0.60 0.02 280)" }}
        >
          <X className="h-4 w-4" />
        </button>

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
              style={{ color: "oklch(0.55 0.02 280)" }}
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
                background: "oklch(0.82 0.18 80)",
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
              href="/login"
              onClick={dismiss}
              className="font-semibold transition-colors hover:underline"
              style={{ color: "oklch(0.82 0.18 80)" }}
            >
              Log in
            </Link>
            <span style={{ color: "oklch(0.35 0.02 280)" }}>·</span>
            <Link
              href="/signup"
              onClick={dismiss}
              className="font-semibold transition-colors hover:underline"
              style={{ color: "oklch(0.72 0.18 250)" }}
            >
              Sign up
            </Link>
          </div>
        </div>

        {/* Bottom ambient glow */}
        <div
          className="pointer-events-none absolute -bottom-20 left-1/2 h-40 w-80 -translate-x-1/2"
          style={{
            background: "radial-gradient(ellipse, oklch(0.82 0.18 80 / 0.06), transparent 70%)",
          }}
        />
      </div>

      <style jsx>{`
        .welcome-fade-in {
          animation: wFadeIn 0.4s ease-out both;
        }
        .welcome-fade-out {
          animation: wFadeOut 0.4s ease-in both;
        }
        .welcome-card-in {
          animation: wCardIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 0.1s;
        }
        .welcome-card-out {
          animation: wCardOut 0.35s ease-in both;
        }
        @keyframes wFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes wFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes wCardIn {
          from { opacity: 0; transform: scale(0.92) translateY(24px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes wCardOut {
          from { opacity: 1; transform: scale(1) translateY(0); }
          to { opacity: 0; transform: scale(0.95) translateY(12px); }
        }

        .welcome-glow-bar {
          background: linear-gradient(90deg,
            transparent 0%,
            oklch(0.82 0.18 80 / 0.6) 20%,
            oklch(0.70 0.22 350 / 0.5) 50%,
            oklch(0.72 0.18 250 / 0.6) 80%,
            transparent 100%
          );
          animation: glowBarShimmer 3s ease-in-out infinite;
        }
        @keyframes glowBarShimmer {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        .welcome-cta {
          box-shadow: 0 0 20px oklch(0.82 0.18 80 / 0.3), 0 0 40px oklch(0.82 0.18 80 / 0.1);
          transition: box-shadow 0.3s ease, transform 0.15s ease;
        }
        .welcome-cta:hover {
          box-shadow: 0 0 28px oklch(0.82 0.18 80 / 0.5), 0 0 56px oklch(0.82 0.18 80 / 0.2);
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
      `}</style>
    </div>
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
