"use client"

import Link from "next/link"
import { Headphones, Music, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { type Room, formatListenerCount } from "@/lib/mock-data"

export function FeaturedRoom({ room }: { room: Room }) {
  return (
    <section className="relative">
      {/* Jukebox outer chrome arch */}
      <div
        className="relative overflow-hidden rounded-t-[3rem] rounded-b-2xl"
        style={{
          background: "linear-gradient(180deg, oklch(0.40 0.04 60) 0%, oklch(0.28 0.02 50) 8%, oklch(0.18 0.01 280) 25%, oklch(0.13 0.01 280) 100%)",
          padding: "3px",
        }}
      >
        <div className="relative overflow-hidden rounded-t-[calc(3rem-3px)] rounded-b-[calc(1rem-3px)]" style={{ background: "oklch(0.11 0.01 280)" }}>

          {/* Chrome arch highlight */}
          <div
            className="absolute left-0 right-0 top-0 h-12 z-10"
            style={{
              background: "linear-gradient(180deg, oklch(0.50 0.04 60 / 0.4) 0%, transparent 100%)",
              borderRadius: "3rem 3rem 0 0",
            }}
          />

          {/* Left bubble column */}
          <div className="absolute left-2 top-12 bottom-4 z-20 w-5 flex flex-col items-center gap-3 overflow-hidden">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div
                key={`l-${i}`}
                className="rounded-full shrink-0"
                style={{
                  width: 6 + (i % 3) * 3,
                  height: 6 + (i % 3) * 3,
                  background: i % 2 === 0
                    ? `oklch(0.70 0.22 350 / ${0.25 + i * 0.06})`
                    : `oklch(0.82 0.18 80 / ${0.2 + i * 0.05})`,
                  animation: `bubble-float ${4 + i * 0.8}s ease-in-out infinite`,
                  animationDelay: `${i * 0.5}s`,
                }}
              />
            ))}
            {/* Tube glow */}
            <div className="absolute inset-0 rounded-full" style={{ background: "linear-gradient(180deg, oklch(0.70 0.22 350 / 0.05), oklch(0.82 0.18 80 / 0.08), oklch(0.70 0.22 350 / 0.05))" }} />
          </div>

          {/* Right bubble column */}
          <div className="absolute right-2 top-12 bottom-4 z-20 w-5 flex flex-col items-center gap-3 overflow-hidden">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div
                key={`r-${i}`}
                className="rounded-full shrink-0"
                style={{
                  width: 5 + (i % 3) * 3,
                  height: 5 + (i % 3) * 3,
                  background: i % 2 === 0
                    ? `oklch(0.72 0.18 250 / ${0.25 + i * 0.06})`
                    : `oklch(0.82 0.18 80 / ${0.2 + i * 0.05})`,
                  animation: `bubble-float ${5 + i * 0.7}s ease-in-out infinite`,
                  animationDelay: `${i * 0.4 + 0.2}s`,
                }}
              />
            ))}
            <div className="absolute inset-0 rounded-full" style={{ background: "linear-gradient(180deg, oklch(0.72 0.18 250 / 0.05), oklch(0.82 0.18 80 / 0.08), oklch(0.72 0.18 250 / 0.05))" }} />
          </div>

          {/* Main content area */}
          <div className="relative z-10 flex flex-col gap-6 px-8 py-8 sm:px-12 md:flex-row md:items-center md:gap-10 md:py-10">

            {/* Display window with album art */}
            <div className="flex shrink-0 items-center justify-center">
              <div className="relative">
                {/* Window chrome frame */}
                <div
                  className="absolute -inset-2 rounded-2xl"
                  style={{
                    background: "linear-gradient(135deg, oklch(0.40 0.04 60 / 0.5), oklch(0.20 0.01 280 / 0.5))",
                    border: "1px solid oklch(0.35 0.03 60 / 0.3)",
                  }}
                />
                {/* Album art */}
                <div
                  className="relative h-40 w-40 rounded-xl sm:h-48 sm:w-48"
                  style={{
                    background: room.coverArt
                      ? `url(${room.coverArt}) center/cover no-repeat`
                      : room.nowPlaying.albumGradient,
                    boxShadow: "0 0 20px oklch(0.82 0.18 80 / 0.2), inset 0 0 30px oklch(0.10 0.01 280 / 0.3)",
                  }}
                >
                  {/* Visualizer bars overlay */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-center gap-1">
                    {[0.5, 0.8, 0.3, 1, 0.6, 0.9, 0.4, 0.7].map((h, i) => (
                      <div
                        key={i}
                        className="w-1.5 rounded-t"
                        style={{
                          height: `${h * 24}px`,
                          background: i % 2 === 0
                            ? "oklch(0.95 0.01 80 / 0.85)"
                            : "oklch(0.82 0.18 80 / 0.85)",
                          animation: `visualizer-bar ${0.3 + i * 0.08}s ease-in-out infinite alternate`,
                          animationDelay: `${i * 0.05}s`,
                        }}
                      />
                    ))}
                  </div>
                  {/* Neon border glow line */}
                  <div className="absolute inset-0 rounded-xl" style={{ boxShadow: "inset 0 0 0 1px oklch(0.82 0.18 80 / 0.2)" }} />
                </div>
              </div>
            </div>

            {/* Text content */}
            <div className="flex flex-1 flex-col gap-4">
              <div className="flex items-center gap-3">
                <div 
                  className="flex items-center gap-1 rounded px-2 py-0.5" 
                  style={{ 
                    background: "oklch(0.08 0.01 280 / 0.95)", 
                    border: "1.5px solid oklch(0.50 0.24 30)",
                    boxShadow: "0 0 6px oklch(0.50 0.24 30 / 0.6), 0 0 12px oklch(0.50 0.24 30 / 0.3), inset 0 0 8px oklch(0.50 0.24 30 / 0.15)"
                  }}
                >
                  <span className="font-sans text-[10px] font-bold tracking-wide" style={{ color: "oklch(0.58 0.26 30)", textShadow: "0 0 4px oklch(0.58 0.26 30 / 0.8), 0 0 8px oklch(0.58 0.26 30 / 0.4)" }}>
                    ON AIR
                  </span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: "oklch(0.20 0.01 280 / 0.6)", border: "1px solid oklch(0.30 0.02 280 / 0.3)" }}>
                  <Headphones className="h-3 w-3 text-foreground" />
                  <span className="font-sans text-xs font-semibold text-foreground">
                    {formatListenerCount(room.listenerCount)} listening
                  </span>
                </div>
              </div>

              <div>
                <h2 className="font-sans text-2xl font-bold text-foreground sm:text-3xl text-balance neon-text-amber">
                  {room.name}
                </h2>
                <p className="mt-1 font-sans text-sm text-muted-foreground">
                  {"Hosted by "}
                  <Link
                    href={`/dj/${room.djUsername}`}
                    className="text-primary hover:underline"
                  >
                    {room.djName}
                  </Link>
                </p>
              </div>

              <p className="font-sans text-sm text-foreground/70 leading-relaxed max-w-lg text-pretty">
                {room.description}
              </p>

              {/* Now playing strip */}
              <div className="flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ background: "oklch(0.16 0.01 280 / 0.8)", border: "1px solid oklch(0.30 0.02 60 / 0.2)" }}>
                <Music className="h-4 w-4 text-primary shrink-0" />
                <span className="font-sans text-sm text-primary">
                  {room.nowPlaying.title}
                </span>
                <span className="font-sans text-sm text-muted-foreground">
                  {"by "}{room.nowPlaying.artist}
                </span>
              </div>

              <div className="flex items-center gap-3 mt-1">
                <Link href={`/room/${room.slug}`}>
                  <Button
                    size="lg"
                    className="gap-2 rounded-full font-sans text-primary-foreground"
                    style={{
                      background: "linear-gradient(135deg, oklch(0.82 0.18 80), oklch(0.75 0.20 70))",
                      boxShadow: "0 0 15px oklch(0.82 0.18 80 / 0.3), 0 4px 12px oklch(0.10 0.01 280 / 0.4)",
                    }}
                  >
                    <Play className="h-4 w-4" />
                    Tune In
                  </Button>
                </Link>
                <Badge
                  variant="secondary"
                  className="text-muted-foreground"
                  style={{ background: "oklch(0.20 0.01 280)", border: "1px solid oklch(0.28 0.02 280)" }}
                >
                  {room.genre}
                </Badge>
                {room.isOfficial && (
                  <Badge
                    variant="outline"
                    className="border-primary/30 text-primary"
                  >
                    Official Show
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Bottom neon strip */}
          <div
            className="h-2"
            style={{
              background: "linear-gradient(90deg, transparent 5%, oklch(0.72 0.18 250 / 0.5) 20%, oklch(0.82 0.18 80 / 0.6) 40%, oklch(0.70 0.22 350 / 0.6) 60%, oklch(0.82 0.18 80 / 0.5) 80%, transparent 95%)",
              boxShadow: "0 0 12px oklch(0.82 0.18 80 / 0.2), 0 0 25px oklch(0.70 0.22 350 / 0.1)",
            }}
          />
        </div>
      </div>

      {/* Under-glow */}
      <div
        className="absolute -bottom-3 left-10 right-10 h-6 rounded-full"
        style={{
          background: "radial-gradient(ellipse, oklch(0.82 0.18 80 / 0.12), transparent 70%)",
          filter: "blur(6px)",
        }}
      />
    </section>
  )
}
