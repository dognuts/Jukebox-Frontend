"use client"

import Link from "next/link"

import { NeonJukeboxLogo } from "@/components/effects/neon-jukebox-logo"

export function AuthShell({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div
      className="relative min-h-screen flex items-center justify-center bg-ink px-4"
      style={{ paddingBlock: "var(--space-xl)" }}
    >
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center" style={{ marginBottom: "var(--space-lg)" }}>
          <Link href="/">
            <NeonJukeboxLogo size="lg" />
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-2xl border-[0.5px] border-hairline bg-white/[0.02] p-8">
          <h1 className="type-display font-sans text-ink-foreground mb-1">{title}</h1>
          {subtitle && <p className="type-small font-sans text-text-mid mb-6">{subtitle}</p>}
          {!subtitle && <div className="mb-6" />}
          {children}
        </div>
      </div>
    </div>
  )
}
