"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { type Room } from "@/lib/mock-data"
import { RoomCard } from "./room-card"

interface RoomGridProps {
  rooms: Room[]
  title: string
  subtitle?: string
}

export function RoomGrid({ rooms, title, subtitle }: RoomGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }, [])

  useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener("scroll", checkScroll, { passive: true })
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", checkScroll)
      ro.disconnect()
    }
  }, [checkScroll, rooms])

  const scroll = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current
    if (!el) return
    // Scroll by roughly one card width + gap
    const cardWidth = el.querySelector<HTMLElement>(":scope > *")?.offsetWidth ?? 320
    el.scrollBy({
      left: direction === "left" ? -(cardWidth + 16) : cardWidth + 16,
      behavior: "smooth",
    })
  }, [])

  if (rooms.length === 0) return null

  return (
    <section>
      {/* Header with arrows */}
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="font-sans text-lg font-bold text-foreground">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 font-sans text-sm text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            aria-label="Scroll left"
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-20"
            style={{
              background: canScrollLeft
                ? "oklch(0.18 0.01 280)"
                : "transparent",
              border: canScrollLeft
                ? "1px solid oklch(0.30 0.02 60 / 0.3)"
                : "1px solid transparent",
            }}
          >
            <ChevronLeft className="h-4 w-4 text-foreground" />
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            aria-label="Scroll right"
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-20"
            style={{
              background: canScrollRight
                ? "oklch(0.18 0.01 280)"
                : "transparent",
              border: canScrollRight
                ? "1px solid oklch(0.30 0.02 60 / 0.3)"
                : "1px solid transparent",
            }}
          >
            <ChevronRight className="h-4 w-4 text-foreground" />
          </button>
        </div>
      </div>

      {/* Scrolling conveyor */}
      <div className="relative">
        {/* Left fade */}
        {canScrollLeft && (
          <div
            className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-12"
            style={{
              background:
                "linear-gradient(to right, oklch(0.10 0.01 280), transparent)",
            }}
          />
        )}
        {/* Right fade */}
        {canScrollRight && (
          <div
            className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-12"
            style={{
              background:
                "linear-gradient(to left, oklch(0.10 0.01 280), transparent)",
            }}
          />
        )}

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-2 scrollbar-none"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {rooms.map((room) => (
            <div
              key={room.id}
              className="w-[300px] shrink-0 sm:w-[340px]"
              style={{ scrollSnapAlign: "start" }}
            >
              <RoomCard room={room} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
