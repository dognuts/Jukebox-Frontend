"use client"

import Link from "next/link"
import { memo, useRef, useState, useCallback, useEffect } from "react"
import { Headphones, Music, Bell, BellRing, Clock, Inbox, PauseCircle, XCircle, Heart } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { SoundWaveVisualizer } from "@/components/effects/sound-wave-visualizer"
import { type Room, formatListenerCount } from "@/lib/mock-data"
import { useRoomStatus } from "@/lib/room-status-context"
import { useFavorites } from "@/lib/favorites-context"

function useCountdown(targetDate?: Date) {
  const [timeLeft, setTimeLeft] = useState("")

  useEffect(() => {
    if (!targetDate) return

    function update() {
      const now = Date.now()
      const diff = targetDate!.getTime() - now
      if (diff <= 0) {
        setTimeLeft("Starting now")
        return
      }
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      if (hours > 0) {
        setTimeLeft(`Starts in ${hours}h ${mins}m`)
      } else {
        setTimeLeft(`Starts in ${mins}m`)
      }
    }

    update()
    const interval = setInterval(update, 30_000) // update every 30s
    return () => clearInterval(interval)
  }, [targetDate])

  return timeLeft
}

function RoomCardImpl({ room }: { room: Room }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const rectRef = useRef<DOMRect | null>(null)
  const pendingPos = useRef<{ x: number; y: number } | null>(null)
  const { requestStatus } = useRoomStatus(room.id)
  const { isFavorite, toggleFavorite } = useFavorites()
  const [reminderSet, setReminderSet] = useState(false)
  const countdown = useCountdown(room.scheduledStart)
  const favorited = isFavorite(room.id)

  const isUpcoming = !!room.scheduledStart && !room.isLive

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    pendingPos.current = { x: e.clientX, y: e.clientY }
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const card = cardRef.current
      const pos = pendingPos.current
      if (!card || !pos) return
      if (!rectRef.current) rectRef.current = card.getBoundingClientRect()
      const rect = rectRef.current
      const nx = (pos.x - rect.left) / rect.width - 0.5
      const ny = (pos.y - rect.top) / rect.height - 0.5
      const tiltX = ny * -8
      const tiltY = nx * 8
      const angle = Math.sqrt(tiltX * tiltX + tiltY * tiltY)
      card.style.transform = `rotate3d(${tiltX}, ${tiltY}, 0, ${angle}deg)`
    })
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    pendingPos.current = null
    rectRef.current = null
    const card = cardRef.current
    if (card) card.style.transform = ""
  }, [])

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <Link href={`/room/${room.slug}`}>
      <div
        ref={cardRef}
        className="group relative cursor-pointer card-shine room-card-tilt"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ perspective: "800px" }}
      >
        {/* Jukebox outer chrome frame */}
        <div
          className="relative overflow-hidden rounded-t-[2rem] rounded-b-xl"
          style={{
            background: "linear-gradient(180deg, oklch(0.35 0.02 60) 0%, oklch(0.20 0.01 280) 30%, oklch(0.14 0.01 280) 100%)",
            padding: "2px",
          }}
        >
          {/* Inner body */}
          <div className="relative overflow-hidden rounded-t-[calc(2rem-2px)] rounded-b-[calc(0.75rem-2px)]" style={{ background: "oklch(0.12 0.01 280)" }}>

            {/* Chrome arch top trim */}
            <div
              className="absolute left-0 right-0 top-0 h-8 z-10"
              style={{
                background: "linear-gradient(180deg, oklch(0.45 0.03 60 / 0.6) 0%, transparent 100%)",
                borderRadius: "2rem 2rem 0 0",
              }}
            />

            {/* Bubble tubes on left and right */}
            <div className="absolute left-1.5 top-8 bottom-0 z-20 w-3 flex flex-col items-center overflow-hidden opacity-40 group-hover:opacity-100 transition-opacity duration-500">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="mb-2 rounded-full"
                  style={{
                    width: 6 + (i % 3) * 2,
                    height: 6 + ((i + 1) % 3) * 2,
                    background: room.isLive
                      ? `oklch(0.70 0.22 350 / ${0.3 + i * 0.12})`
                      : `oklch(0.55 0.02 280 / ${0.2 + i * 0.08})`,
                    animation: room.isLive
                      ? `bubble-float ${4 + i * 1.2}s ease-in-out infinite`
                      : "none",
                    animationDelay: `${i * 0.8}s`,
                  }}
                />
              ))}
            </div>
            <div className="absolute right-1.5 top-8 bottom-0 z-20 w-3 flex flex-col items-center overflow-hidden opacity-40 group-hover:opacity-100 transition-opacity duration-500">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="mb-2 rounded-full"
                  style={{
                    width: 5 + ((i + 2) % 3) * 2,
                    height: 5 + (i % 3) * 2,
                    background: room.isLive
                      ? `oklch(0.82 0.18 80 / ${0.3 + i * 0.1})`
                      : `oklch(0.55 0.02 280 / ${0.2 + i * 0.08})`,
                    animation: room.isLive
                      ? `bubble-float ${5 + i * 0.9}s ease-in-out infinite`
                      : "none",
                    animationDelay: `${i * 0.6 + 0.3}s`,
                  }}
                />
              ))}
            </div>

            {/* Cover / display window */}
            <div className="relative mx-4 mt-6 mb-3 overflow-hidden rounded-xl" style={{ border: "1px solid oklch(0.35 0.03 60 / 0.4)" }}>
              <div
                className="relative flex w-full flex-col justify-between p-3"
                style={{
                  background: room.coverArt ? `url(${room.coverArt}) center/cover no-repeat` : room.coverGradient,
                  minHeight: "9rem",
                }}
              >
                {/* Neon tube glow across display top */}
                <div
                  className="absolute top-0 left-0 right-0 h-px"
                  style={{
                    background: room.isLive ? "var(--neon-amber)" : "oklch(0.35 0.02 280)",
                    boxShadow: room.isLive
                      ? "0 0 6px var(--neon-amber), 0 0 15px oklch(0.82 0.18 80 / 0.3), 0 2px 20px oklch(0.82 0.18 80 / 0.15)"
                      : "none",
                  }}
                />

                {/* Top row: badges */}
                <div className="relative z-10 flex items-start justify-between">
                  <div className="flex items-center gap-1.5">
                    {/* ON AIR badge */}
                    {room.isLive && (
                      <div 
                        className="flex items-center gap-1 rounded px-2 py-0.5" 
                        style={{ 
                          background: "oklch(0.08 0.01 280 / 0.9)", 
                          border: "1.5px solid oklch(0.50 0.24 30)",
                          boxShadow: "0 0 6px oklch(0.50 0.24 30 / 0.6), 0 0 12px oklch(0.50 0.24 30 / 0.3), inset 0 0 8px oklch(0.50 0.24 30 / 0.15)"
                        }}
                      >
                        <span className="font-sans text-[10px] font-bold tracking-wide" style={{ color: "oklch(0.58 0.26 30)", textShadow: "0 0 4px oklch(0.58 0.26 30 / 0.8), 0 0 8px oklch(0.58 0.26 30 / 0.4)" }}>
                          ON AIR
                        </span>
                      </div>
                    )}

                    {/* Countdown badge for upcoming rooms */}
                    {isUpcoming && countdown && (
                      <div 
                        className="flex items-center gap-1 rounded px-2 py-0.5" 
                        style={{ 
                          background: "oklch(0.08 0.01 280 / 0.9)", 
                          border: "1.5px solid oklch(0.55 0.15 250)",
                          boxShadow: "0 0 6px oklch(0.55 0.15 250 / 0.5), inset 0 0 6px oklch(0.55 0.15 250 / 0.1)"
                        }}
                      >
                        <Clock className="h-3 w-3" style={{ color: "oklch(0.65 0.15 250)" }} />
                        <span className="font-sans text-[10px] font-bold tracking-wide" style={{ color: "oklch(0.65 0.15 250)", textShadow: "0 0 4px oklch(0.65 0.15 250 / 0.6)" }}>
                          {countdown}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Listener count + favorite */}
                  <div className="flex items-center gap-1.5">
                    {room.isLive && (
                      <div className="flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: "oklch(0.10 0.01 280 / 0.85)", border: "1px solid oklch(0.30 0.02 280 / 0.5)" }}>
                        <Headphones className="h-3 w-3 text-muted-foreground" />
                        <span className="font-sans text-[10px] text-foreground">
                          {formatListenerCount(room.listenerCount)}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        toggleFavorite(room.id, room.name)
                      }}
                      className="flex items-center justify-center rounded-full p-1 transition-all"
                      style={{
                        background: favorited ? "oklch(0.50 0.24 0 / 0.2)" : "oklch(0.10 0.01 280 / 0.85)",
                        border: favorited ? "1px solid oklch(0.60 0.24 0 / 0.5)" : "1px solid oklch(0.30 0.02 280 / 0.5)",
                      }}
                      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
                    >
                      <Heart
                        className="h-3 w-3 transition-all"
                        style={{
                          color: favorited ? "oklch(0.65 0.28 0)" : "oklch(0.60 0.02 280)",
                          fill: favorited ? "oklch(0.65 0.28 0)" : "transparent",
                        }}
                      />
                    </button>
                  </div>
                </div>

                {/* Bottom: room name, DJ, genres -- over a subtle dark scrim */}
                <div className="relative z-10 mt-auto flex flex-col items-center text-center">
                  <div className="flex items-center justify-center gap-2">
                    <h3 className="font-sans text-sm font-semibold text-white leading-tight line-clamp-1 drop-shadow-md">
                      {room.name}
                    </h3>
                    {room.isOfficial && (
                      <Badge
                        variant="outline"
                        className="shrink-0 text-[9px] px-1.5 py-0"
                        style={{ borderColor: "oklch(0.82 0.18 80 / 0.5)", color: "oklch(0.82 0.18 80)" }}
                      >
                        Official
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 font-sans text-[11px] text-white/70 drop-shadow-sm">
                    {room.isAutoplay ? "24/7 Radio" : room.djName}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1">
                    <span
                      className="font-sans text-[9px] px-1.5 py-px rounded-full"
                      style={{
                        background: "oklch(0.10 0.01 280 / 0.7)",
                        color: "oklch(0.75 0.02 280)",
                        border: "1px solid oklch(0.35 0.02 280 / 0.5)",
                      }}
                    >
                      {room.genre}
                    </span>
                    {room.vibes.map((vibe) => (
                      <span
                        key={vibe}
                        className="font-sans text-[9px] px-1.5 py-px rounded-full"
                        style={{
                          background: "oklch(0.10 0.02 280 / 0.6)",
                          color: "oklch(0.65 0.08 80)",
                          border: "1px solid oklch(0.30 0.04 80 / 0.3)",
                        }}
                      >
                        {vibe}
                      </span>
                    ))}
                  </div>
                  {/* Request status badge — always on its own row */}
                  {room.isLive && (
                    <div className="mt-1 flex justify-center">
                      <span
                        className="flex items-center gap-0.5 font-sans text-[9px] px-1.5 py-px rounded-full"
                        style={
                          requestStatus === "open"
                            ? {
                                background: "oklch(0.82 0.18 80 / 0.1)",
                                color: "oklch(0.82 0.18 80)",
                                border: "1px solid oklch(0.82 0.18 80 / 0.3)",
                              }
                            : requestStatus === "paused"
                            ? {
                                background: "oklch(0.70 0.15 60 / 0.1)",
                                color: "oklch(0.78 0.14 60)",
                                border: "1px solid oklch(0.70 0.15 60 / 0.3)",
                              }
                            : {
                                background: "oklch(0.50 0.01 280 / 0.15)",
                                color: "oklch(0.55 0.02 280)",
                                border: "1px solid oklch(0.35 0.02 280 / 0.3)",
                              }
                        }
                      >
                        {requestStatus === "open" && <Inbox className="h-2.5 w-2.5" />}
                        {requestStatus === "paused" && <PauseCircle className="h-2.5 w-2.5" />}
                        {requestStatus === "closed" && <XCircle className="h-2.5 w-2.5" />}
                        {requestStatus === "open"
                          ? "Requests Open"
                          : requestStatus === "paused"
                          ? "Requests Paused"
                          : "Requests Closed"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Dark scrim at bottom for text readability */}
                <div
                  className="absolute inset-x-0 bottom-0 h-2/3 rounded-b-xl"
                  style={{ background: "linear-gradient(to top, oklch(0.08 0.01 280 / 0.85), transparent)" }}
                />

                {/* Ambient glow on hover */}
                <div
                  className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background:
                      "radial-gradient(circle at 50% 50%, oklch(0.82 0.18 80 / 0.2), transparent 60%)",
                  }}
                />
              </div>
            </div>

            {/* Now playing strip / Reminder strip */}
            {isUpcoming ? (
              <div className="mx-4 mb-2">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setReminderSet((prev) => !prev)
                  }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-2 font-sans text-[11px] font-medium transition-all"
                  style={{
                    background: reminderSet
                      ? "oklch(0.20 0.06 250)"
                      : "linear-gradient(90deg, oklch(0.18 0.01 280), oklch(0.22 0.01 280), oklch(0.18 0.01 280))",
                    border: reminderSet
                      ? "1px solid oklch(0.55 0.15 250 / 0.6)"
                      : "1px solid oklch(0.30 0.03 60 / 0.3)",
                    color: reminderSet
                      ? "oklch(0.75 0.12 250)"
                      : "oklch(0.60 0.02 280)",
                    boxShadow: reminderSet
                      ? "0 0 8px oklch(0.55 0.15 250 / 0.3), inset 0 0 8px oklch(0.55 0.15 250 / 0.1)"
                      : "none",
                  }}
                >
                  {reminderSet ? (
                    <>
                      <BellRing className="h-3.5 w-3.5" />
                      Reminder Set
                    </>
                  ) : (
                    <>
                      <Bell className="h-3.5 w-3.5" />
                      Set Reminder
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="mx-4 mb-2 flex items-center justify-center gap-2 rounded-lg px-2 py-1.5" style={{ background: "linear-gradient(90deg, oklch(0.18 0.01 280), oklch(0.22 0.01 280), oklch(0.18 0.01 280))", border: "1px solid oklch(0.30 0.03 60 / 0.3)" }}>
                {/* Sound wave visualizer */}
                {room.isLive && (
                  <SoundWaveVisualizer isPlaying={true} size="sm" color="mixed" barCount={5} />
                )}
                <div className="min-w-0">
                  {room.isLive ? (
                    <p className="font-sans text-[10px] truncate max-w-[180px] text-center">
                      <span className="font-medium text-primary">{room.nowPlaying.title}</span>
                      <span className="text-muted-foreground">{" - "}{room.nowPlaying.artist}</span>
                    </p>
                  ) : (
                    <p className="font-sans text-[10px] text-muted-foreground text-center">
                      Offline
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Bottom chrome trim with neon line */}
            <div
              className="h-1.5"
              style={{
                background: room.isLive
                  ? "linear-gradient(90deg, transparent, oklch(0.82 0.18 80 / 0.5), oklch(0.70 0.22 350 / 0.5), oklch(0.72 0.18 250 / 0.5), transparent)"
                  : "linear-gradient(90deg, transparent, oklch(0.30 0.02 280 / 0.3), transparent)",
                boxShadow: room.isLive
                  ? "0 0 8px oklch(0.82 0.18 80 / 0.2), 0 -2px 12px oklch(0.70 0.22 350 / 0.1)"
                  : "none",
              }}
            />
          </div>
        </div>

        {/* Shadow / glow under jukebox */}
        <div
          className="absolute -bottom-2 left-4 right-4 h-4 rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: room.isLive
              ? "radial-gradient(ellipse, oklch(0.82 0.18 80 / 0.15), transparent 70%)"
              : "radial-gradient(ellipse, oklch(0.20 0.01 280 / 0.3), transparent 70%)",
            filter: "blur(4px)",
          }}
        />
      </div>
    </Link>
  )
}

// Homepage polls every 30s and passes fresh Room objects to every card.
// Most fields are identical across polls — memoize on the fields the card
// actually reads so unchanged cards skip re-render.
export const RoomCard = memo(RoomCardImpl, (prev, next) => {
  const a = prev.room
  const b = next.room
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.djName === b.djName &&
    a.genre === b.genre &&
    a.isLive === b.isLive &&
    a.listenerCount === b.listenerCount &&
    a.isFeatured === b.isFeatured &&
    a.isAutoplay === b.isAutoplay &&
    a.isOfficial === b.isOfficial &&
    a.coverArt === b.coverArt &&
    a.coverGradient === b.coverGradient &&
    a.nowPlaying?.id === b.nowPlaying?.id
  )
})
