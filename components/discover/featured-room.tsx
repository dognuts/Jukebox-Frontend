"use client"

import Link from "next/link"
import { Play, Music, Headphones } from "lucide-react"
import { type Room, formatListenerCount } from "@/lib/mock-data"

export function FeaturedRoom({ room }: { room: Room }) {
  return (
    <section className="relative">
      <Link href={`/room/${room.slug}`} className="block group">
        <div
          className="relative overflow-hidden rounded-2xl transition-all group-hover:border-[oklch(0.60_0.22_30_/_0.3)]"
          style={{
            background: "linear-gradient(135deg, oklch(0.60 0.22 30 / 0.06), oklch(0.65 0.20 270 / 0.04))",
            border: "1px solid oklch(0.60 0.22 30 / 0.15)",
          }}
        >
          {/* Subtle ambient glow */}
          <div
            className="absolute -top-16 right-0 h-32 w-64 pointer-events-none"
            style={{ background: "radial-gradient(ellipse, oklch(0.60 0.22 30 / 0.06) 0%, transparent 70%)" }}
          />

          <div className="relative z-10 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
            {/* Room art */}
            <div className="flex-shrink-0">
              <div
                className="relative h-24 w-24 rounded-2xl sm:h-28 sm:w-28 flex items-center justify-center overflow-hidden"
                style={{
                  background: room.coverArt
                    ? `url(${room.coverArt}) center/cover no-repeat`
                    : room.nowPlaying?.albumGradient || "linear-gradient(135deg, oklch(0.60 0.22 30), oklch(0.45 0.20 20))",
                }}
              >
                <Music className="h-8 w-8 text-white/60 drop-shadow-lg" />
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col gap-3 min-w-0">
              {/* Top row: ON AIR + Featured + listeners */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* ON AIR sign */}
                <div
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1"
                  style={{
                    background: "oklch(0.55 0.24 25 / 0.1)",
                    border: "1.5px solid oklch(0.55 0.24 25 / 0.5)",
                    boxShadow: "0 0 8px oklch(0.55 0.24 25 / 0.3), 0 0 16px oklch(0.55 0.24 25 / 0.15)",
                    animation: "on-air-glow 2s ease-in-out infinite",
                  }}
                >
                  <div
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: "oklch(0.55 0.24 25)",
                      boxShadow: "0 0 4px oklch(0.55 0.24 25)",
                      animation: "on-air-dot 1.2s ease-in-out infinite",
                    }}
                  />
                  <span
                    className="font-sans text-[10px] font-black tracking-[2px] uppercase"
                    style={{
                      color: "oklch(0.55 0.24 25)",
                      textShadow: "0 0 6px oklch(0.55 0.24 25 / 0.5)",
                    }}
                  >
                    ON AIR
                  </span>
                </div>

                {/* Featured badge */}
                <div
                  className="inline-flex items-center gap-1 rounded-md px-2 py-0.5"
                  style={{
                    background: "oklch(0.60 0.22 30 / 0.1)",
                    border: "1px solid oklch(0.60 0.22 30 / 0.2)",
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="oklch(0.65 0.22 30)" stroke="none">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26" />
                  </svg>
                  <span className="font-sans text-[10px] font-bold" style={{ color: "oklch(0.65 0.22 30)" }}>
                    FEATURED
                  </span>
                </div>
              </div>

              {/* Room name + DJ */}
              <div>
                <h2 className="font-sans text-xl font-extrabold tracking-tight sm:text-2xl text-foreground group-hover:text-primary transition-colors">
                  {room.name}
                </h2>
                <p className="mt-0.5 font-sans text-sm text-muted-foreground">
                  hosted by <span className="font-semibold" style={{ color: "oklch(0.65 0.22 30)" }}>{room.djName}</span>
                </p>
              </div>

              {/* Bottom row: genre, listeners, now playing */}
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className="rounded-lg px-2.5 py-0.5 font-sans text-[11px] font-medium"
                  style={{
                    background: "oklch(0.18 0.01 280 / 0.6)",
                    border: "1px solid oklch(0.28 0.02 280 / 0.3)",
                    color: "oklch(0.65 0.02 280)",
                  }}
                >
                  {room.genre}
                </span>

                {/* Listener count with stacked avatars */}
                <div className="flex items-center gap-1.5">
                  <div className="flex -space-x-1.5">
                    {["oklch(0.68 0.17 170)", "oklch(0.65 0.20 320)", "oklch(0.78 0.15 80)"].map((bg, i) => (
                      <div
                        key={i}
                        className="h-4 w-4 rounded-full font-sans text-[7px] font-extrabold flex items-center justify-center"
                        style={{
                          background: bg,
                          border: "1.5px solid oklch(0.13 0.01 280)",
                          color: "oklch(0.18 0.02 280)",
                        }}
                      >
                        {String.fromCharCode(65 + i)}
                      </div>
                    ))}
                  </div>
                  <span className="font-sans text-xs font-semibold text-muted-foreground">
                    {formatListenerCount(room.listenerCount)}
                  </span>
                </div>

                {/* Now playing */}
                {room.nowPlaying && (
                  <div className="flex items-center gap-1.5">
                    <Music className="h-3 w-3 text-muted-foreground" />
                    <span className="font-sans text-xs text-muted-foreground truncate max-w-[200px]">
                      {room.nowPlaying.title} — {room.nowPlaying.artist}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Tune In button (visible on hover) */}
            <div className="flex-shrink-0 hidden sm:flex">
              <div
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 font-sans text-sm font-bold text-white transition-all opacity-70 group-hover:opacity-100 group-hover:scale-[1.02]"
                style={{
                  background: "linear-gradient(135deg, oklch(0.60 0.22 30), oklch(0.50 0.22 25))",
                  boxShadow: "0 4px 16px oklch(0.55 0.22 30 / 0.3)",
                }}
              >
                <Play className="h-4 w-4" fill="white" />
                Tune In
              </div>
            </div>
          </div>
        </div>
      </Link>
    </section>
  )
}
