"use client"

import Link from "next/link"

import { NeonJukeboxLogo } from "@/components/effects/neon-jukebox-logo"

export function AuthShell({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12">
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Link href="/">
            <NeonJukeboxLogo size="lg" />
          </Link>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border border-border/30 p-8"
          style={{
            background: "oklch(0.12 0.01 280 / 0.8)",
            backdropFilter: "blur(8px)",
            boxShadow: "0 0 40px oklch(0.08 0.01 280 / 0.5)",
          }}
        >
          <h1 className="font-sans text-xl font-bold text-foreground mb-1">{title}</h1>
          {subtitle && <p className="font-sans text-sm text-muted-foreground mb-6">{subtitle}</p>}
          {!subtitle && <div className="mb-6" />}
          {children}
        </div>
      </div>
    </div>
  )
}
