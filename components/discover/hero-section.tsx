"use client"

import Link from "next/link"
import { Play } from "lucide-react"
import { type Room } from "@/lib/mock-data"

interface HeroSectionProps {
  liveRooms: Room[]
  totalListeners: number
}

export function HeroSection({ liveRooms, totalListeners }: HeroSectionProps) {
  // Get top 4 DJs by listener count for the avatar display
  const topDJs = [...liveRooms]
    .sort((a, b) => b.listenerCount - a.listenerCount)
    .slice(0, 4)

  // Most active room for the "Jump in" button
  const mostActive = topDJs[0]

  const djColors = [
    { bg: "oklch(0.65 0.22 30)", text: "oklch(0.25 0.05 30)" },
    { bg: "oklch(0.65 0.20 270)", text: "oklch(0.20 0.05 270)" },
    { bg: "oklch(0.68 0.17 170)", text: "oklch(0.20 0.05 170)" },
    { bg: "oklch(0.78 0.15 80)", text: "oklch(0.25 0.05 80)" },
  ]

  return (
    <section className="mb-8 sm:mb-10">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        {/* Left: text + CTA */}
        <div className="max-w-lg">
          <p
            className="mb-2 font-sans text-[11px] font-bold uppercase tracking-[2px]"
            style={{ color: "oklch(0.65 0.22 30)" }}
          >
            Listen together, live
          </p>
          <h1
            className="mb-3 font-sans text-3xl font-black leading-tight tracking-tight sm:text-4xl"
            style={{ letterSpacing: "-0.5px" }}
          >
            Find your{" "}
            <span
              className="neon-text-gradient"
              style={{
                background: "linear-gradient(90deg, oklch(0.65 0.22 30), oklch(0.78 0.15 80))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              frequency.
            </span>
          </h1>
          <p className="mb-5 font-sans text-sm leading-relaxed text-muted-foreground max-w-sm">
            Built by music heads for music heads to find, discuss, and listen to music together.
          </p>

          {/* Jump in CTA */}
          {mostActive ? (
            <Link href={`/room/${mostActive.slug}`}>
              <button
                className="flex items-center gap-2 rounded-xl px-6 py-2.5 font-sans text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, oklch(0.60 0.22 30), oklch(0.50 0.22 25))",
                  boxShadow: "0 4px 20px oklch(0.55 0.22 30 / 0.3)",
                }}
              >
                <Play className="h-4 w-4" fill="white" />
                Jump into the most active room
              </button>
            </Link>
          ) : (
            <Link href="/create">
              <button
                className="flex items-center gap-2 rounded-xl px-6 py-2.5 font-sans text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, oklch(0.60 0.22 30), oklch(0.50 0.22 25))",
                  boxShadow: "0 4px 20px oklch(0.55 0.22 30 / 0.3)",
                }}
              >
                <Play className="h-4 w-4" fill="white" />
                Create a room
              </button>
            </Link>
          )}
        </div>

        {/* Right: Live DJs */}
        {topDJs.length > 0 && (
          <div className="flex flex-col items-center gap-2 md:items-end">
            <p
              className="font-sans text-[9px] font-bold uppercase tracking-[1.5px] text-center"
              style={{ color: "oklch(0.45 0.02 280)" }}
            >
              Live DJs
            </p>
            <div className="flex gap-3">
              {topDJs.map((room, i) => {
                const c = djColors[i % djColors.length]
                const initial = (room.djName || "?")[0].toUpperCase()
                return (
                  <Link key={room.id} href={`/room/${room.slug}`} className="group">
                    <div className="flex flex-col items-center gap-1">
                      <div className="relative">
                        {/* Avatar */}
                        <div
                          className="flex h-11 w-11 items-center justify-center rounded-full font-sans text-base font-extrabold transition-transform group-hover:scale-105"
                          style={{ background: c.bg, color: c.text }}
                        >
                          {initial}
                        </div>
                        {/* Pulsing ring */}
                        <div
                          className="absolute -inset-[3px] rounded-full"
                          style={{
                            border: "2px solid oklch(0.55 0.24 25 / 0.5)",
                            animation: "hero-pulse-ring 2s ease-out infinite",
                            animationDelay: `${i * 0.3}s`,
                          }}
                        />
                        {/* Live dot */}
                        <div
                          className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full"
                          style={{
                            background: "oklch(0.55 0.24 25)",
                            border: "2px solid oklch(0.13 0.01 280)",
                          }}
                        />
                      </div>
                      <span className="font-sans text-[9px] font-semibold text-foreground/70 max-w-[56px] truncate text-center">
                        {room.djName}
                      </span>
                      <span className="font-sans text-[8px] text-muted-foreground">
                        {room.listenerCount} listening
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
